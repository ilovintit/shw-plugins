# SHW 插件分发

SHW 提供通用产品、开发、集成与发布工作流；`shw-worktree` 提供可选本地工作区管理。两包分别安装，组合启用只注册一次 `worktree`。自 v10.0.0 起，主包不再内置 worktree；需要本地工作区能力的用户按下文安装独立包。

## 包与宿主

| 包 | Codex | Kimi Code / Claude Code | 运行时 |
| --- | --- | --- | --- |
| 主 SHW | `shw` | `shw-plugins` | Gitea、Kubernetes、DBX |
| 工作区 | `shw-worktree` | `shw-worktree` | worktree |

主包保持既有命令身份。Kimi/Claude 使用 commands，Codex 将其构建为显式 skill prompts；skills 按需加载 references。Kimi/Codex 使用稳定配置文件与继承环境，Claude 保留原生 userConfig。Kubernetes 在 Kimi/Codex 通过 stdio 薄壳接远端 HTTPS，在 Claude 为 HTTP 直连。

## 安装与迁移

已发布主包仍从 `ilovintit/shw-plugins` 的对应 marketplace 安装。选择包含目标包的已成功发布版本，核对真实 manifest，不把未发布目录当可用市场条目。本地构建产物在 `dist/<host>` 和 `dist/worktree/<host>`；完整目录用于获授权的宿主安装，不能只复制技能。

Kimi repo 根直装对应主 SHW；独立 worktree 通过 catalog 的固定版本 `shw-worktree-kimi-code.zip` Release asset 或其本地插件目录安装；ZIP 根即插件，不依赖仓库子目录安装。Codex/Claude marketplace 为两个包提供各自条目。公开发布目录为：

```text
kimi.plugin.json                 # 主 SHW 根入口
.agents/plugins/marketplace.json
.claude-plugin/marketplace.json
.kimi-plugin/marketplace.json
codex/  kimi-code/  claude-code/ # 主包
worktree/
  codex/  kimi-code/  claude-code/ # 独立包
```

从旧内置 worktree 的版本升级时，先安全暂停任务、记录 claim/root，再由用户或获授权维护者停用旧注册并启用拆分包。禁止同时启用旧内置与新独立 worktree。工具 id、状态目录、`SHW_WORKTREE_ROOT` 和 `worktree.json` 保持兼容；不复制、清空或自动迁移状态。Claude 原自定义 root 需在独立包配置保留同值。

安装后逐项确认所选包的技能、版本、MCP 在线，并只读 list/inspect 核对旧工作区。失败则保存证据和状态，恢复已知可用版本的唯一注册；不改远端 main/tag，不删 claim。项目 Agent 不修改用户缓存或配置。本次未执行宿主安装、升级或回退。

## v10.0.0 升级顺序（防止重复 worktree）

1. 安全暂停所有使用旧 SHW worktree 的会话，记录工作区路径及原 root；保留旧 claim，不执行清理。
2. 刷新 `shw-plugins-market`，将主 SHW 升到 **10.0.0**，然后重新加载/重启宿主，使旧插件进程退出。
3. 在宿主 MCP 列表确认主包只剩 `gitea`、`kubernetes`、`dbx`，原 `worktree` 已消失。若仍存在，先通过宿主界面停用旧版本或重复的手工注册；不要手工删除缓存/状态。**此检查通过前不要启用独立 worktree。**
4. 需要本地工作区功能时，从同一市场安装 **shw-worktree 10.0.0**。云端使用已验证原生隔离时无需安装。
5. 重新加载宿主，确认仅一个 `worktree` MCP 注册、八个工具；只读 `list/inspect` 核对旧工作区。旧普通任务若来源是 main，恢复时显式传 `source_branch: main`；默认普通任务来源已为 dev。

Codex CLI（在当前 CLI help 中核对过；只作为用户自行执行步骤）：

```sh
codex plugin marketplace upgrade shw-plugins-market
codex plugin add shw@shw-plugins-market
# 完成上面的重载和旧 worktree 消失检查后，再运行：
codex plugin add shw-worktree@shw-plugins-market
```

Codex 应用也可在插件市场刷新后分别升级 SHW、安装 SHW Worktree。Claude Code 在相同市场分别选择 `shw-plugins` 与 `shw-worktree`。Kimi 主包仍从仓库入口安装；独立包使用 [v10.0.0 Kimi ZIP](https://github.com/ilovintit/shw-plugins/releases/download/v10.0.0/shw-worktree-kimi-code.zip)。以上宿主界面安装尚未代用户执行。

## 工作流与权限

初版采用够用 PRD/方案直接实现，无独立原型。每个 Issue 的业务/权限/状态变化同步 PRD，接口/数据/架构变化同步技术文档，同变更交付。体验部署前不跑测试（包括 lint、类型检查、冒烟）；必要构建部署可以执行。

自动测试只在每日/小批次 dev→main 集成。冻结 source、main base、预合并结果和已人工验收范围；差异先区分环境、预期变化、意外回归/未知。仅更新对应候选断言或基线并重跑；无基线需正常执行且已验收再建立并重跑。禁止全量接受快照、删断言或为旧测试回滚正确实现。候选基线在正常合并通过后晋升；并发基线或目标漂移使旧检查失效。

tag/审批选择已集成提交和制品，不新增测试阶段；优先复用已验证 digest，准确区分 dev SHA 与 main merge SHA。主包规则更新不等于业务 CI/Fleet 已迁移，main-push 生产触发必须在业务项目另行核实。

主包保留工作区安全契约：云端可使用能证明隔离与所有权的宿主 workspace；本地缺少插件不能绕过占用检查。未知修改、外部工作区不接管/覆盖。仅写用户授权项目，真实路径检查不可通过链接、脚本或子任务绕过。Kubernetes 与开发 DBX 保持只读，不回退原始凭据、exec 或写接口。

项目模式以 `.shw/project.yaml` 和 issue gate 为准；旧 ignore 标记迁移冲突需要明确处理。禁用工作流不扩大权限。知识库不承载唯一执行约束，关键 references 随包版本分发。

## Gitea MCP 配置文件（通用）

插件 launcher 会读取两个 env 文件；后者覆盖前者同名变量：

1. 用户级：`${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/gitea.env`
2. 工作区级：`${SHW_MCP_WORKDIR:-$PWD}/.shw-plugins/gitea.env`

> `SHW_MCP_WORKDIR` 环境变量用于显式指定工作区根目录；当宿主未以项目目录作为 launcher 的 `cwd` 时，可用它可靠覆盖 `$PWD`。

用户级文件支持 `GITEA_*` 简单赋值；工作区级文件只支持 `GITEA_HOST` / `GITEA_ACCESS_TOKEN`，不执行 shell 命令，不要提交真实 token：

```dotenv
GITEA_HOST=https://gitea.example.com
GITEA_ACCESS_TOKEN=<你的 token>
```

工作区文件若把 `GITEA_HOST` 改成不同值但没有同时配置项目 token，launcher 会主动丢弃旧 token，避免凭据被发到新实例。

<!-- KIMI-CONFIG:START -->
## Kimi Code 配置

Kimi Code 的插件清单**没有配置面板，也没有 `${VAR}` env 插值机制**，清单条目因此不携带任何 `env`——清单里的 `env` 会直接覆盖父进程环境继承，写占位符只会让它变成字面量并覆盖你的真实环境变量。地址与凭据全部走下面的配置文件与父进程环境继承。

主 SHW 声明 gitea、kubernetes 和 dbx；独立 shw-worktree 包单独声明 worktree。主要 stdio 入口形态如下：

```json
{
  "gitea":      { "command": "node", "args": ["./mcp-shim/launch.cjs"],      "cwd": "./" },
  "kubernetes": { "command": "node", "args": ["./kubernetes-mcp/launch.cjs"], "cwd": "./" },
  "dbx":        { "command": "node", "args": ["./dbx-mcp/launch.cjs"],        "cwd": "./" }
}
```

> **安装后必须逐条确认三个条目实际在线**。Kimi Code 对不合法的 MCP 条目（例如 `cwd` 不以 `./` 开头或越出插件根）是**静默忽略**的，不会报错，所以"清单里有"不等于"连上了"。

### gitea：env 文件（主路径，零 mcp.json 配置）

Launcher 依次读取两个 env 文件，同名变量由后者覆盖前者：

1. **用户级**：`${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/gitea.env`——跨项目生效，支持全部 `GITEA_*` 变量
2. **工作区级**：`${SHW_MCP_WORKDIR:-$PWD}/.shw-plugins/gitea.env`——仅当前项目，只支持 `GITEA_HOST` / `GITEA_ACCESS_TOKEN`

创建用户级文件：

```bash
mkdir -p "$HOME/.config/shw-plugins"
cat > "$HOME/.config/shw-plugins/gitea.env" << 'ENVFILE'
GITEA_HOST=https://gitea.example.com
GITEA_ACCESS_TOKEN=<你的 Gitea Access Token>
ENVFILE
chmod 600 "$HOME/.config/shw-plugins/gitea.env"
```

- `GITEA_HOST`：Gitea Web 地址，**需含协议头**（如 `https://gitea.example.com`，填你自己的实例）
- `GITEA_ACCESS_TOKEN`：Gitea Web → Settings → Applications 创建

文件格式为简单 `KEY=value` 赋值（支持引号包裹值）；不执行 shell 命令；不要提交到 git。

> **注意**：清单用 `cwd: "./"` 把入口锚定到插件安装根，因此工作区级 `$PWD/.shw-plugins/gitea.env` 通常**不**指向你的项目目录。需要项目级特殊配置时，用下方 mcp.json 覆盖路径，或在启动环境里设置 `SHW_MCP_WORKDIR` 指向项目根。

首次调用时 shim 会下载官方 gitea-mcp 后端（数秒，之后走用户级缓存）；机器无需安装 Go。

### gitea：shell 导出（兼容路径）

启动 Kimi Code 前在 shell 导出变量（env 文件中的同名变量会覆盖此路径）：

```bash
export GITEA_HOST="https://gitea.example.com"
export GITEA_ACCESS_TOKEN="<你的 token>"
```

### 独立 worktree 插件：可选 root

仅安装独立插件时适用；主 SHW 不读取或声明此配置。`SHW_WORKTREE_ROOT` 只能从启动 Kimi Code 的父进程环境继承。留空时使用用户级 `worktree.json` 或默认用户数据目录，多数情况无需配置。

### kubernetes：用户级配置文件

Kubernetes MCP 走插件自带的 stdio 薄壳转接远程 HTTPS 网关，地址与 token **不经清单传递**，由薄壳自行读取：

```dotenv
# ${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/kubernetes.env
K8S_MCP_URL=https://<your-kubernetes-mcp-host>/mcp
K8S_MCP_TOKEN=<your-agent-mcp-token>
```

文件权限必须为 `600`。URL 必须为 HTTPS 且不含用户名、密码、query 或 fragment；只使用基础设施签发的 MCP Bearer 本体，不要填 kubeconfig 或 Rancher token。未创建该文件时该条目连接失败并明确报错，不影响其他两个 MCP。

多审计身份使用 `kubernetes.<profile>.env`，并让 `SHW_K8S_PROFILE=<profile>` 存在于**启动 Kimi Code 的稳定环境**中——Kimi Code 没有清单级的环境转发机制，事后在另一个终端 export 不会生效。

### 进阶：mcp.json 同名整体覆盖

项目需要连特殊 Gitea 实例（不同 host / token），或想显式指定命令时，在配置文件里写一个与插件清单同名的 `gitea` 条目即可整体覆盖插件内置声明。覆盖后该条目脱离 shim 自管，由你写的命令直接拉起后端。

编辑 `~/.kimi-code/mcp.json`（用户级，跨项目生效）或项目 `.kimi-code/mcp.json`（仅本项目）：

```json
{
  "mcpServers": {
    "gitea": {
      "command": "go",
      "args": ["run", "gitea.com/gitea/gitea-mcp@vX.Y.Z"],
      "env": {
        "GITEA_HOST": "https://gitea.example.com",
        "GITEA_ACCESS_TOKEN": "<在此填入你的 token>"
      }
    }
  }
}
```

> 上面的 JSON 是**用户自选直连后端形态**：机器需 Go 或自装二进制，不经 shim 管理，`vX.Y.Z` 为占位示例，请填你要用的后端版本。
### Windows 配置

stdio MCP 启动要求 PATH 中有 Node.js 18+。支持 Windows x64/ARM64，启动清单使用 `node` + `launch.cjs`，各包的 Go MCP 下载原生 `.exe`。首次启动需要访问该插件版本的 GitHub Release assets；下载器自带 HTTPS 与 SHA256 校验。

用户配置默认放在 `%USERPROFILE%\.config\shw-plugins\`，与 macOS/Linux 的 `~/.config/shw-plugins/` 使用相同文件名：`gitea.env`、`worktree.json`、`kubernetes.env` 或 `kubernetes.<profile>.env`。非空 `XDG_CONFIG_HOME` 必须是绝对路径；空格路径直接作为参数传递。env 文件只解析字面赋值，不执行 PowerShell 或 shell 命令。

安装独立插件后，Worktree 的默认根为 `%USERPROFILE%\.local\share\shw-plugins\worktrees`；可以在 `worktree.json` 中写入绝对路径（JSON 反斜杠写成 `\\`，也可使用 `/`），或设置 `SHW_WORKTREE_ROOT`。Worktree 还需要 PATH 中的 Git for Windows。内核文件锁在进程退出时释放，Windows 采用 Job Object 清理 Git/后端子进程；中断状态的临时副本保守保留供恢复。

插件二进制缓存默认位于 `%LOCALAPPDATA%\shw-plugins\<version>\`，缺少该变量时使用 `%USERPROFILE%\.cache\shw-plugins\<version>\`；`XDG_CACHE_HOME` 可覆盖根。缓存命中也重新检查下载时保存的 SHA256。Gitea 后端独立放在 Go 的用户缓存目录下，按固定后端版本安装并解包 `.zip`。

Kubernetes 凭据文件必须是当前用户拥有的普通文件；真实 ACL 只能允许所有者、SYSTEM 和 Administrators 访问。请通过 Windows 文件属性的“安全”页检查并限制权限；`chmod 600` 在 Windows 上不能证明权限。配置由用户/获授权维护者维护，项目 Agent 只读复核。

### DBX：开发数据库排查

插件统一提供 dbx MCP，无需为每个 Agent 单独安装或注册。Node 启动器首次获取固定版本官方程序并校验，三端共享缓存。维护者只需准备一份稳定用户 `~/.config/shw-plugins/dbx.env`（Windows 使用 `%USERPROFILE%/.config/shw-plugins/dbx.env`），包含 `DBX_WEB_URL` 和 `DBX_WEB_PASSWORD`；Claude Code 也支持原生配置。详细配置、支持平台与旧注册去重见 [DBX 配置指南](codex/skills/shw-dbx/config.md)。项目 Agent 不改用户配置；查询继续遵守开发只读边界。

<!-- KIMI-CONFIG:END -->

## 平台与验证

Go MCP 支持 macOS ARM64/x64、Linux x64、Windows x64/ARM64；PATH 需 Node.js 18+，worktree 另需 Git。发布 Git 树仅携带启动器，共享版本化 Release assets 经完整性校验后使用；缓存命中复核 hash。DBX 使用固定官方程序及独立校验路径。

本次插件工程重构可以运行构建和契约/行为测试，这与业务体验前无测试规则的适用范围不同。工程测试、交叉编译不证明三宿主安装、Windows 原生运行或真实远端认证已完成；交付报告按实际证据列出未验证项。

源码维护仓库为私有 Gitea；分发仓库只保存构建产物。MIT License。
