# SHW 插件分发

SHW 提供通用产品、开发、集成与发布工作流，shw-mcp 提供独立业务工具集；`shw-worktree` 提供可选本地工作区管理。三包分别安装，组合启用只注册一次 `worktree`。自 v10.0.0 起，主包不再内置 worktree；需要本地工作区能力的用户按下文安装独立包。

## 本地三插件与云 MCP

正常使用以本地三插件为主：SHW 技能、shw-mcp 工具集、shw-worktree。Codex、Claude Code、Kimi Code、ZCode 均采用此组合；Codex 是否登录不改变推荐组合。云端仅保留 MCP 网关供 Codex Cloud 连接，不再构建、发布或同步 shw-cloud 技能插件。

同用途 MCP 同时可见时，先确认来源并优先使用已安装的本地 MCP，不向云端重复调用。本地工具报错、权限不足或策略拒绝时报告真实原因，不自动切换云端绕过；Codex Cloud 使用云 MCP。工具权限仍按任务授权与各后端只读边界执行。

Claude/Kimi 使用 commands，Codex 构建为显式 skill prompts。Kimi/Codex 本地接入使用配置文件与继承环境，Claude 的 Gitea/DBX 保留原生配置，Kubernetes 使用共享 stdio 薄壳和稳定用户 kubernetes.env。ZCode 使用 `.zcode-plugin` 和 `${CLAUDE_PLUGIN_ROOT}`，支持 Claude marketplace/根市场；具体能力以宿主和清单实际验证为准。

## 安装与升级顺序

1. 记录本地三包与云 MCP 的版本、启用状态，安全暂停工作区操作并保存原 root/claim。
2. 安装对应宿主的 SHW 技能包、shw-mcp 和 shw-worktree；先停用旧合包的重复 MCP 注册，再核对唯一注册。不得复制、清空或重新登记原状态。
3. 旧账户云技能已退役；如仍启用，由用户停用以避免重复规则，发布不会自动修改账户插件。
4. 本地与云 MCP 同时可见时核对来源，优先本地；Codex Cloud 单独连接云 MCP 网关。保留 worktree root/claim，以 list/inspect 只读核验。
5. Kimi 独立工具包通过对应固定版本 ZIP 安装，ZIP 根即插件；不依赖仓库子目录安装。

本地输出为 `dist/{codex,kimi-code,claude-code,zcode}` 、`dist/mcp/<host>` 与 `dist/worktree/<host>`。Kimi repo 根入口是主包；Codex/Claude/ZCode 使用相应市场入口。选择已成功发布的目标版本，不将本地待审产物或文档中的版本视为公开可用。

安装失败保存状态与证据，恢复已知可用的唯一注册，不删除工作区、claim、用户配置或修改远端 tag。宿主 UI 安装和云 MCP 部署须分别回读确认，本次文档更新不声称已经完成。

## 当前接入证据

Kimi Code 1.0.4 的本机 parser 已只读核对 `kimi.plugin.json`、skills/commands、stdio MCP 与 `cwd: "./"`；未执行 UI 安装。ZCode 3.14.4 官方文档确认插件目录、根路径变量与市场格式，未执行安装。云 MCP 实际只读连通必须单独取证；本地构建不能替代真实部署验证。

## 工作流与权限

测试与开发、集成、发布、部署解耦：单元、API、E2E、VRT、回归及冒烟均仅在用户明确要求后，于独立 `test` 分支的固定提交执行。普通 push/PR/tag/部署和推送 test 分支本身不触发测试；未测试不阻挡已授权发布。必要构建/编译、静态与配置检查、来源核对正常执行，不得借“检查”名义运行测试；构建成功不代表测试或人工验收通过。

集成只固定已授权source、main base及预合并tree，完成审查与必要构建。独立test分支只有用户明确要求才手动测试，不触发发布或基线晋升；没有测试/基线或发布前人工验收不阻挡明确授权生产发布。

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

插件维护与业务开发均只在明确请求后的test任务运行测试；必要构建/静态编译与来源核对正常执行。工程测试、交叉编译不证明四宿主安装、Windows 原生运行或真实远端认证已完成；交付报告按实际证据列出未验证项。

源码维护仓库为私有 Gitea；分发仓库只保存构建产物。MIT License。

### 云交付边界（#442）

Sites 源码为 [shw-sites-mcp](https://github.com/ilovintit/shw-sites-mcp)，交接提交 328d90f6，保持薄层转发。Compose 与 Actions 自动更新需本次实现及部署取证；历史调用不证明当前后端就绪。

历史已发布 tag 保持不可变；本次移除新的云技能 ZIP、文件清单、GitHub 云技能目录和独立 marketplace。已安装的旧账户插件不会被自动卸载、修改或升级，用户如需停用应在账户侧操作。
