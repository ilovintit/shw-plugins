# gitea MCP 配置指引

## 概述

本文件是 `shw-gitea-ci` skill 的按需加载子文件：只在配置或排障 gitea MCP 时被读取，不占常驻上下文。

插件的 `gitea` MCP 条目基于官方 [gitea-mcp](https://gitea.com/gitea/gitea-mcp)（Go 实现，stdio 传输），由清单以 `go run` 固定版本拉起，通过两个环境变量寻址与认证（gitea-mcp 也提供 `-H` / `-T` 启动标志，但环境变量方式更适合配置场景）：

| 环境变量 | 含义 | 格式 |
|----------|------|------|
| `GITEA_HOST` | 你的 Gitea 实例地址 | **必须含协议头**（如 `https://gitea.example.com`），裸域名会导致连接失败 |
| `GITEA_ACCESS_TOKEN` | Gitea API token（认证凭据） | 实际 token 值，创建方法见第 1 节「创建 Gitea token」 |

要点：

- **gitea-mcp 二进制对这两个环境变量没有任何内置默认值**——未配置时不会"默认连上某个 Gitea"，只会认证失败，须按下文完成配置
- 插件清单不携带任何明文凭据，这两个值由各工具的配置机制注入 env（配置面板 / mcp.json 覆盖 / shell 环境变量），入口按你所用工具见第 1 节对应小节

## 1. 全局配置（默认路径）

绝大多数场景只需做一次本节配置：把 gitea 指向你的 Gitea 实例，跨项目全局生效。按你所用工具走对应小节。

### ZCode：插件配置面板

ZCode 客户端 → **Settings → Plugin Management → shw-plugins → 插件配置（userConfig）**，共两项：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `gitea_host` | 空 | 你的 Gitea 实例地址（含协议头，如 `https://gitea.example.com`） |
| `gitea_token` | 空 | Gitea API token，创建方法见下文「创建 Gitea token」 |

**两项均无默认值，都需要填写**。面板值经清单插值注入 env（ZCode 清单条目形态；版本号 `vX.Y.Z` 为占位示例，**实际固定版本见插件构建配置**，升级随插件发版走）：

```json
{
  "gitea": {
    "command": "go",
    "args": ["run", "gitea.com/gitea/gitea-mcp@vX.Y.Z"],
    "env": {
      "GITEA_HOST": "${user_config.gitea_host}",
      "GITEA_ACCESS_TOKEN": "${user_config.gitea_token}"
    }
  }
}
```

### Kimi Code：用户级 mcp.json 同名条目覆盖

Kimi Code 没有插件配置面板，gitea 的 host / token 走 mcp.json：在**用户级** `~/.kimi-code/mcp.json` 写一条与插件清单**同名**的 `gitea` 条目，按 Kimi 的覆盖机制**整体覆盖**插件声明的条目，跨项目全局生效。

`~/.kimi-code/mcp.json`（不存在则新建；host + token 均须填写）：

```json
{
  "mcpServers": {
    "gitea": {
      "command": "go",
      "args": ["run", "gitea.com/gitea/gitea-mcp@v1.6.0"],
      "env": {
        "GITEA_HOST": "https://gitea.example.com",
        "GITEA_ACCESS_TOKEN": "<在此填入你的 token>"
      }
    }
  }
}
```

要点：

- `GITEA_HOST` 换成你的 Gitea 实例地址；token 创建方法与 scope 勾选原则见下文「创建 Gitea token」（各工具通用）
- Kimi 的 mcp.json 不支持变量插值，token 只能写实际值；`~/.kimi-code/mcp.json` 是本地用户目录文件、不入库，注意不要把它复制进任何仓库
- 版本号与插件固定版本对齐（当前 `v1.6.0`），插件升级后同步更新这里
- 兜底方式：在启动 Kimi Code 的 shell 里 `export GITEA_HOST` / `GITEA_ACCESS_TOKEN` 也可生效（gitea-mcp 继承父进程环境，插件清单不携带 env、不会覆盖 shell 导出的值），但依赖 shell 环境易漂移，不作为主要指引

### OpenCode：shell 环境变量承接

OpenCode 清单的 env 为原生占位符 `{env:GITEA_HOST}` / `{env:GITEA_ACCESS_TOKEN}`，值来自 shell 环境。在启动 OpenCode 的 shell 里导出即可（写入 profile 可持久化）：

```bash
export GITEA_HOST="https://gitea.example.com"
export GITEA_ACCESS_TOKEN="<在此填入你的 token>"
```

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

当项目代码不在你全局配置的那个 Gitea 实例（自建 / 客户环境，host 或 token 不同）时，插件的默认 `gitea` 条目指向的是全局配置的实例，**不能直接用**。

> 本节是保底方案：ZCode 项目级覆盖插件面板配置的能力尚未实测验证，故走「项目自建条目 + AGENTS.md 声明」路线。客户端能力验证可行后，本节可简化。

### 第一步：项目自建 MCP 条目

在项目级 MCP 配置（ZCode 为项目级 MCP 配置文件）里自建一条条目，id 用区别于 `gitea` 的名字（如 `gitea-alt`）：

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
- 版本 `vX.Y.Z` 与插件固定版本保持一致（实际版本见插件构建配置），避免同一环境两套 gitea-mcp 行为不一致

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

Kimi Code 不用起别名：在项目 `.kimi-code/mcp.json`（或 worktree 根 `.mcp.json`）写一条同名 `gitea` 条目，整体覆盖插件清单声明的默认条目，`gitea` 直接指向本项目 Gitea：

```json
{
  "mcpServers": {
    "gitea": {
      "command": "go",
      "args": ["run", "gitea.com/gitea/gitea-mcp@v1.6.0"],
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

## 3. 进阶路径：无 Go / 首次编译慢

默认 `go run` 拉起方式依赖本机 Go 工具链，且首次运行需要编译（慢，见第 4 节）。如果机器没有 Go，或想跳过编译等待，用下面任一替代方案（**日常本地开发推荐二进制**）。

### 方案 A：预编译二进制（推荐）

从官方 Releases 下载对应平台的二进制，放进 PATH：

```bash
# 1. 打开 https://gitea.com/gitea/gitea-mcp/releases
#    下载对应平台的包（版本与插件固定版本对齐，见插件构建配置）
# 2. 解压得到可执行文件 gitea-mcp，放进 PATH 并赋权（示例）
mv gitea-mcp /usr/local/bin/gitea-mcp
chmod +x /usr/local/bin/gitea-mcp
# 3. 验证
gitea-mcp --help
```

之后项目级条目的 `command` 改为二进制名，不再需要 `go run`：

```json
{
  "mcpServers": {
    "gitea-alt": {
      "command": "gitea-mcp",
      "env": {
        "GITEA_HOST": "https://gitea.example.com",
        "GITEA_ACCESS_TOKEN": "${GITEA_ALT_TOKEN}"
      }
    }
  }
}
```

优点：不依赖 Go 工具链、无编译等待、进程启动快。

### 方案 B：Docker 镜像

官方镜像 `docker.gitea.com/gitea-mcp-server`（tag 同样按 release 版本选）。stdio 场景需要 `-i` 保持标准输入，环境变量从宿主 shell 继承（`-e VAR` 不带值即透传）：

```json
{
  "mcpServers": {
    "gitea-alt": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "GITEA_HOST", "-e", "GITEA_ACCESS_TOKEN",
        "docker.gitea.com/gitea-mcp-server:vX.Y.Z"
      ]
    }
  }
}
```

> 使用前需在启动 agent 工具的 shell 里导出 `GITEA_HOST` / `GITEA_ACCESS_TOKEN`（token 走环境变量，不落明文配置）。Docker 形态适合隔离环境，日常本地开发优先方案 A。

## 4. 故障排查

| 症状 | 可能原因 | 处理 |
|------|---------|------|
| 认证失败（`token is required`） | host / token 未配置 | gitea-mcp 无内置默认值，未配置必失败：按第 1 节你所用工具的小节完成配置 |
| 首次调用 gitea 工具长时间无响应 | `go run` 首次运行需下载依赖并编译 | **属预期**，等待完成即可；经常超时或机器无 Go → 改用二进制（第 3 节方案 A） |
| 认证失败（401 / 403） | token 已失效或 scope 不足 | 检查 token 未过期；核对 token scope 是否覆盖所需操作（第 1 节「创建 Gitea token」）；项目特殊 Gitea 检查条目指向的 token 是否属于该实例 |
| 连不上 host（超时 / DNS 失败） | 地址格式错误或网络不通 | 确认 host **含协议头**（`https://gitea.example.com`，裸域名会导致连接失败）；内网 / 自建 Gitea 检查 VPN 与内网连通性 |
| gitea server 启动失败 / 工具列表为空 | Go 未安装或版本过低 | 终端执行 `go version` 确认工具链可用；无 Go 环境走二进制路线（第 3 节） |
| 查到的是另一个 Gitea 的仓库 | 用错了条目 | 核对项目 AGENTS.md 的 gitea 条目声明，按第 2 节纪律切换到正确条目 |
