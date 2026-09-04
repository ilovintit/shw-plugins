# gitea MCP 配置指引

## 概述

本文件是 `shw-gitea-ci` skill 的按需加载子文件：只在配置或排障 gitea MCP 时被读取，不占常驻上下文。

插件的 `gitea` MCP 条目基于官方 [gitea-mcp](https://gitea.com/gitea/gitea-mcp)（Go 实现，stdio 传输），由插件自带 shim 网关拉起（清单引用 `mcp-shim/launch.sh`，平台二进制随插件分发；shim 内嵌 pin 版工具清单并按 pin 版本自动管理官方 gitea-mcp 后端），通过两个环境变量寻址与认证（gitea-mcp 也提供 `-H` / `-T` 启动标志，但环境变量方式更适合配置场景）：

| 环境变量 | 含义 | 格式 |
|----------|------|------|
| `GITEA_HOST` | 你的 Gitea 实例地址 | **必须含协议头**（如 `https://gitea.example.com`），裸域名会导致连接失败 |
| `GITEA_ACCESS_TOKEN` | Gitea API token（认证凭据） | 实际 token 值，创建方法见第 1 节「创建 Gitea token」 |

要点：

- **gitea-mcp 后端对这两个环境变量没有任何内置默认值**——未配置时不会"默认连上某个 Gitea"，只会认证失败，须按下文完成配置
- 插件清单不携带任何明文凭据。通用 launcher 可读取固定 env 文件；工具自身的配置机制（配置面板 / shell 环境变量 / mcp.json 覆盖）仍兼容
- **pin 版本（当前 v1.7.0）随插件发版升级，升级 = 改插件构建配置常量 + 发版，shim 自动对齐**；工具清单内嵌于 shim，注入与后端是否就绪无关（配置错误不影响工具列表，只影响调用）

## 1. 全局配置（默认路径）

绝大多数场景只需做一次本节配置：把 gitea 指向你的 Gitea 实例，跨项目全局生效。按你所用工具走对应小节。

### 全工具通用：env 文件

launcher 会先读用户级文件，再读当前工作目录下的项目文件：

```text
${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/gitea.env
${SHW_MCP_WORKDIR:-$PWD}/.shw-plugins/gitea.env
```

同名变量的优先级是：**工作区文件 > 用户级文件 > 调用方已注入 env**。文件格式只支持简单赋值，不执行 shell 命令：

```dotenv
GITEA_HOST=https://gitea.example.com
GITEA_ACCESS_TOKEN=your-token
```

规则与安全边界：

- 用户级文件只接受 `GITEA_*` 变量名；工作区文件只接受 `GITEA_HOST` / `GITEA_ACCESS_TOKEN`。不支持 `$VAR` 展开、命令替换、行尾注释和任意 shell 语句
- 工作区文件不允许覆盖 `GITEA_MCP_BIN` / `GITEA_MCP_CACHE_DIR` / `GITEA_MCP_DOWNLOAD_BASE` 等执行链变量，避免不可信仓库改写后端来源
- 工作区文件不要提交 token；本地保留时把 `.shw-plugins/` 加入项目 `.gitignore`
- **工作区文件若把 `GITEA_HOST` 改成不同值但没有同时给 `GITEA_ACCESS_TOKEN`，launcher 会主动丢弃旧 token**。这是防止克隆不可信仓库后把旧 token 发到新 HOST 的安全闸；合法项目级实例必须自带完整凭证

### ZCode：插件配置面板

ZCode 客户端 → **Settings → Plugin Management → shw-plugins → 插件配置（userConfig）**，共两项：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `gitea_host` | 空 | 你的 Gitea 实例地址（含协议头，如 `https://gitea.example.com`） |
| `gitea_token` | 空 | Gitea API token，创建方法见下文「创建 Gitea token」 |

**两项均无默认值，都需要填写**。面板值经清单插值注入 env，清单条目拉起 shim 网关（后端 pin 版本不在清单条目里，随插件构建配置固定；文中出现的 `vX.Y.Z` 均为占位示例，**实际固定版本见插件构建配置**——升级 = 改插件构建配置常量 + 发版，shim 启动时自动对齐新版本后端）：

```json
{
  "gitea": {
    "command": "sh",
    "args": ["${ZCODE_PLUGIN_ROOT}/mcp-shim/launch.sh"],
    "env": {
      "GITEA_HOST": "${user_config.gitea_host}",
      "GITEA_ACCESS_TOKEN": "${user_config.gitea_token}"
    }
  }
}
```

### Kimi Code：shell 环境变量导出

Kimi Code 没有插件配置面板。插件清单的 gitea 条目拉起 shim 网关，shim 继承父进程环境；优先使用上方通用 env 文件（注意：Kimi Code 等 cwd 锚定到插件安装根的宿主，工作区级 `$PWD/.shw-plugins/gitea.env` 通常不指向你的项目目录——此类宿主请用用户级文件或设置 `SHW_MCP_WORKDIR`）。shell 导出仍是兼容路径（写入 `~/.zshrc` / `~/.bashrc` 等 profile 可持久化），无需 mcp.json：

```bash
export GITEA_HOST="https://gitea.example.com"
export GITEA_ACCESS_TOKEN="<在此填入你的 token>"
```

要点：

- `GITEA_HOST` 换成你的 Gitea 实例地址（含协议头）；token 创建方法与 scope 勾选原则见下文「创建 Gitea token」（各工具通用）
- token 写在本地 shell 环境 / profile 里，不入库；不要把导出语句复制进任何仓库文件

**进阶路径：mcp.json 同名条目整体覆盖**。Kimi 支持两层配置：用户级 `~/.kimi-code/mcp.json`（跨项目全局）与项目级 `.kimi-code/mcp.json`（当前仓库），覆盖优先级均为项目级 > 用户级 > 插件清单声明（[Kimi Code MCP 官方文档](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/mcp.html)）。此路径适合**项目级特殊 Gitea**、或想显式指定命令的场景——**覆盖后即脱离 shim 自管**，条目 `command` 由用户自选直连后端。示例（`go run` 形态为**用户自选直连后端，不经 shim**；机器需 Go 或自装二进制）：

```json
{
  "mcpServers": {
    "gitea": {
      "command": "go",
      "args": ["run", "gitea.com/gitea/gitea-mcp@v1.7.0"],
      "env": {
        "GITEA_HOST": "https://gitea.example.com",
        "GITEA_ACCESS_TOKEN": "<在此填入你的 token>"
      }
    }
  }
}
```

- 直连条目的版本应与后端 pin 版本对齐（当前 `v1.7.0`；pin 随插件发版升级，升级 = 改插件构建配置常量 + 发版），插件升级后需自行同步更新
- Kimi 的 mcp.json 不支持变量插值，token 只能写实际值；用户级 `~/.kimi-code/mcp.json` 是本地用户目录文件、不入库，项目级的必须加入 `.gitignore`

### OpenCode：shell 环境变量承接

OpenCode 清单的 gitea 条目 command 已是插件自带 shim 网关；优先使用上方通用 env 文件（注意：Kimi Code 等 cwd 锚定到插件安装根的宿主，工作区级 `$PWD/.shw-plugins/gitea.env` 通常不指向你的项目目录——此类宿主请用用户级文件或设置 `SHW_MCP_WORKDIR`）。清单 env 为原生占位符 `{env:GITEA_HOST}` / `{env:GITEA_ACCESS_TOKEN}`，shell 导出仍是兼容路径（写入 profile 可持久化）：

```bash
export GITEA_HOST="https://gitea.example.com"
export GITEA_ACCESS_TOKEN="<在此填入你的 token>"
```

### Codex：环境变量白名单承接

Codex 插件清单没有用户配置面板；优先使用上方通用 env 文件（注意：Kimi Code 等 cwd 锚定到插件安装根的宿主，工作区级 `$PWD/.shw-plugins/gitea.env` 通常不指向你的项目目录——此类宿主请用用户级文件或设置 `SHW_MCP_WORKDIR`）。`.mcp.json` 的 `env_vars` 白名单继续透传 `GITEA_HOST`、`GITEA_ACCESS_TOKEN` 和第 3 节的 shim 覆盖变量；在**启动 Codex 的环境**里导出仍是兼容路径：

```bash
export GITEA_HOST="https://gitea.example.com"
export GITEA_ACCESS_TOKEN="<在此填入你的 token>"
```

CLI 从同一 shell 启动时可直接继承。Desktop GUI 不继承某个终端里的临时 `export`：请把变量配置到用户/启动环境，或先在已导出变量的终端启动 Desktop 后完全重启。安装见 Codex 产物 README（CLI：`codex plugin add shw@shw-plugins-market`）。

### 创建 Gitea token

```
1. 浏览器打开你的 Gitea 实例 Web（如 https://gitea.example.com）并登录
2. 右上角头像 → Settings → Applications
3. Generate New Token：填写备注名 → 勾选 scope → 生成
4. 立即复制生成的 token（只展示一次），填入你所用工具的配置入口（上文对应小节）
```

**scope 按需勾选——权限控制在 Gitea token 侧，插件 MCP 层不做只读限制**：token 有多大权限，agent 就有多大能力。按实际使用场景授最小权限：

| 使用场景 | 所需权限 |
|----------|---------|
| 查 CI 状态、读 issue / PR | workflow / issue / repository 相关的**读**权限 |
| 要让 agent 创建 PR | 额外授 PR / repository 相关的**写**权限 |

> scope 的具体可选项以你所用 Gitea 版本的 Applications 页面展示为准（形如 `read:xxx` / `write:xxx` 的分类勾选）。只查 CI 就不要授写权限。

### token 安全提醒

- token 是**凭据**，等同于你的 Gitea 账号部分权限
- 不要写进项目文件、不要提交 git、不要贴到聊天记录里
- 泄露或不再使用时，回到 Gitea → Settings → Applications 及时删除该 token

## 2. 项目级特殊 Gitea（覆盖默认）

优先使用 `.shw-plugins/gitea.env`：它不脱离 shim 自管，也不用为每个项目维护 MCP server 副本。若项目连接不同 HOST，必须在该文件同时写该实例的 `GITEA_ACCESS_TOKEN`；只换 HOST 会让 launcher 主动丢弃旧 token。

当项目代码不在你全局配置的那个 Gitea 实例（自建 / 客户环境，host 或 token 不同）时，插件的默认 `gitea` 条目指向的是全局配置的实例，**不能直接用**。

> 本节是保底方案：ZCode 项目级覆盖插件面板配置的能力尚未实测验证，故走「项目自建条目 + AGENTS.md 声明」路线。客户端能力验证可行后，本节可简化。

### 第一步：项目自建 MCP 条目

在项目级 MCP 配置（ZCode 为项目级 MCP 配置文件）里自建一条条目，id 用区别于 `gitea` 的名字（如 `gitea-alt`）。自建条目与 shim 无关——`command` 由用户自选直连后端，下例 `go run` 形态要求机器有 Go（或改用自装二进制路径）：

```json
{
  "mcpServers": {
    "gitea-alt": {
      "command": "go",
      "args": ["run", "gitea.com/gitea/gitea-mcp@vX.Y.Z"],
      "env": {
        "GITEA_HOST": "https://gitea.example.com",
        "GITEA_ACCESS_TOKEN": "${GITEA_ALT_TOKEN}"
      }
    }
  }
}
```

要点：

- `GITEA_HOST` 填该项目实际的 Gitea 地址（含协议头，示例为占位）
- **token 用环境变量引用（如 `${GITEA_ALT_TOKEN}`），不要写明文**——真实值放 shell 环境（profile）或不入库的本地 env 文件中导出
- 版本与后端 pin 版本保持一致（当前 `v1.7.0`，实际版本见插件构建配置；pin 随插件发版升级时自行同步），避免同一环境两套 gitea-mcp 行为不一致

### 第二步：在项目 AGENTS.md 声明

自建条目只有被声明，agent 才知道该用它。在项目根 `AGENTS.md` 加一段：

```markdown
## Gitea MCP 约定

本项目代码托管在独立 Gitea（https://gitea.example.com，占位示例），
gitea 相关操作一律用 MCP 条目 `gitea-alt`，
不要用插件默认的 `gitea` 条目（它指向全局配置的 Gitea 实例）。
```

### agent 纪律

```
调 gitea MCP 前：
1. 先读项目 AGENTS.md，看是否声明了本项目专用的 gitea MCP 条目
2. 有声明 → 只用声明的条目（如 gitea-alt）
3. 无声明 → 用插件默认的 gitea 条目
两条目不混用；无法判断项目用哪个 Gitea 时问用户，不要猜。
```

### Kimi Code 项目侧：同名条目覆盖

Kimi Code 不用起别名：在项目 `.kimi-code/mcp.json`（或 worktree 根 `.mcp.json`）写一条同名 `gitea` 条目，整体覆盖插件清单声明的默认条目，`gitea` 直接指向本项目 Gitea。覆盖后即脱离 shim 自管，属**用户自建直连条目**（下例 `go run` 形态不经 shim，机器需 Go 或自装二进制）：

```json
{
  "mcpServers": {
    "gitea": {
      "command": "go",
      "args": ["run", "gitea.com/gitea/gitea-mcp@v1.7.0"],
      "env": {
        "GITEA_HOST": "https://gitea.example.com",
        "GITEA_ACCESS_TOKEN": "该 Gitea 实例的 token"
      }
    }
  }
}
```

要点：

- 覆盖后条目名仍是 `gitea`，与上方 agent 纪律兼容：无 AGENTS.md 声明时 agent 用的默认 `gitea` 条目已被项目 mcp.json 覆盖为项目 Gitea，无需第二步的别名声明（在 AGENTS.md 注明「本项目 Gitea 独立、已由 mcp.json 覆盖」可避免困惑，可选）
- token 只能写实际值（Kimi mcp.json 无插值），该文件在项目内，**必须加入 `.gitignore`**，不要提交

## 3. 进阶：后端二进制管理

后端官方 gitea-mcp 由 shim 全自动管理，绝大多数用户无需关心本节。**默认行为**：

- 首次 `tools/call` 时按 pin 版本（当前 `v1.7.0`）从官方 Releases 自动下载对应平台二进制，经 **checksums 校验**后**原子落位**用户缓存 `<UserCacheDir>/shw-plugins/gitea-mcp/<pin>/`，下载完成后常驻、跨会话复用
- 双会话并发首启天然幂等（原子落位保证缓存不会写坏）
- 插件发版升级 pin 后，shim 启动自动下载新版本对齐（旧版本缓存留存）
- 后端二进制**绝不写进插件目录**（插件更新会清插件目录，放那里必然丢失）

覆盖项按需选用：

- **`GITEA_MCP_BIN`（专家覆盖）**：指向一个现成的 gitea-mcp 二进制（自行从[官方 Releases](https://gitea.com/gitea/gitea-mcp/releases) 下载或本地编译均可），shim 直接使用、跳过缓存与下载。**版本核对一并跳过、漂移自担**——二进制版本与 pin 不一致时，shim 内嵌的工具清单可能与后端实际行为不匹配。该变量还会让 shim 执行你指定路径的二进制，仅在完全信任当前 shell 与该文件时设置
- **`GITEA_MCP_CALL_TIMEOUT_SECS`（进阶覆盖）**：调整 `tools/call` park 超时（默认 55 秒）
- **`GITEA_MCP_CACHE_DIR`（进阶覆盖）**：缓存根改址，适合受限磁盘（系统盘空间紧张）场景
- **`GITEA_MCP_DOWNLOAD_BASE`（进阶覆盖）**：下载基址改址，适合内网镜像场景（最终 URL = `<base>/<pin>/<文件名>`）

### Docker 直连（用户自选形态，不经 shim）

官方镜像 `docker.gitea.com/gitea-mcp-server`（tag 按 release 版本选）。在自建 MCP 条目（第 2 节形态）里使用，stdio 场景需要 `-i` 保持标准输入，环境变量从宿主 shell 继承（`-e VAR` 不带值即透传）：

```json
{
  "mcpServers": {
    "gitea-alt": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "GITEA_HOST", "-e", "GITEA_ACCESS_TOKEN",
        "docker.gitea.com/gitea-mcp-server:v1.7.0"
      ]
    }
  }
}
```

> 使用前需在启动 agent 工具的 shell 里导出 `GITEA_HOST` / `GITEA_ACCESS_TOKEN`（token 走环境变量，不落明文配置）。Docker 形态适合隔离环境，常规场景直接用 shim 自管即可。

## 4. 故障排查

| 症状 | 可能原因 | 处理 |
|------|---------|------|
| 认证失败（`token is required`） | host / token 未配置 | gitea-mcp 无内置默认值，未配置必失败：按第 1 节你所用工具的小节完成配置 |
| 首次调用 gitea 工具等待较久 | 首次调用触发后端下载（访问 gitea.com） | **属预期**（数秒到数十秒），完成即常驻用户缓存、此后秒连；若超时报错见下一行 |
| 工具调用报 park 超时（code `-32001`） | 后端不可得（下载失败 / 网络不通，等待超 55s 上限） | 查网络 / 代理能否访问 gitea.com，可重试；仍不行设 `GITEA_MCP_BIN` 指向本地已有二进制（第 3 节） |
| 工具调用报后端中断（code `-32003`） | 后端进程崩溃 | shim 自动重拉后端，**稍候重试即可**；持续出现按第 3 节用 `GITEA_MCP_BIN` 换用自备二进制排除 |
| 缓存写入失败（权限类错误） | 用户缓存目录不可写 | 检查 `GITEA_MCP_CACHE_DIR` 对应目录的写权限，或改设到可写位置（第 3 节） |
| CLI 正常但 Codex Desktop 认证失败 | Desktop 不是从导出变量的环境启动 | Desktop GUI 不继承终端临时 `export`；配置用户/启动环境，或从已导出变量的终端启动后完全重启（第 1 节 Codex） |
| 认证失败（401 / 403） | token 已失效或 scope 不足 | 检查 token 未过期；核对 token scope 是否覆盖所需操作（第 1 节「创建 Gitea token」）；项目特殊 Gitea 检查条目指向的 token 是否属于该实例 |
| 连不上 host（超时 / DNS 失败） | 地址格式错误或网络不通 | 确认 host **含协议头**（`https://gitea.example.com`，裸域名会导致连接失败）；内网 / 自建 Gitea 检查 VPN 与内网连通性 |
| 查到的是另一个 Gitea 的仓库 | 用错了条目 | 核对项目 AGENTS.md 的 gitea 条目声明，按第 2 节纪律切换到正确条目 |
