# shw-plugins

> Product lifecycle workflow covering product truth, version planning, Issue delivery, release, Fleet deployment observability, engineering standards, and Gitea integration.

本仓库是 **shw-plugins 的发布仓库**，存放 ZCode、Kimi Code 与 Codex 的构建产物。源码在私有 Gitea，CI 自动构建并推送到本仓库。

> 插件定位：**主要面向 ZCode 优化和适配**——ZCode 产物是完整能力（skills + commands + gitea 官方 MCP + userConfig 配置插值）。Kimi Code 产物是通用适配（skills + commands + gitea 官方 MCP）。Codex 产物是通用适配（skills + gitea 官方 MCP + 原生 Worktree 映射），并把共享 commands 映射为显式 skill prompts，不伪造原生 commands。

## 安装

### ZCode 客户端（通过 marketplace）

ZCode 兼容 Claude 插件体系，使用 marketplace 概念：

1. 打开 **Settings → Plugin Management → Discover** 标签
2. 点右上角 **`+`** 按钮 → 选「GitHub 仓库」
3. 填入：`ilovintit/shw-plugins`（或完整 URL `https://github.com/ilovintit/shw-plugins`）
4. 加为 marketplace 后，在 Discover 列表找到 **shw-plugins** → 点 **Get** 安装

### Kimi Code 客户端（直接 URL 安装）

Kimi Code 不使用 marketplace，直接用仓库根 URL 安装（根目录的 `kimi.plugin.json` 指向 `kimi-code/` 子目录产物）：

```
/plugins install https://github.com/ilovintit/shw-plugins
```

> 注意：
> - `/plugins install` 的 GitHub 仓库 URL 不支持仓库内子目录路径，请使用上面的仓库根 URL
> - 更新方式：重新执行同一条 `/plugins install` 命令覆盖安装即为更新（无 marketplace 更新提示）

### Codex 客户端（marketplace）

> **从旧版 `shw-plugins` 插件升级**：v6.4.0 起 Codex 产物改名为 `shw`。旧版需先卸载再安装新版，否则可能出现两套 skills 并存。
>
> ```bash
> codex plugin remove shw-plugins
> codex plugin add shw@shw-plugins-market
> ```

Codex 使用 `.agents/plugins/marketplace.json` 发现发布仓库内的 `codex/` 插件：

```bash
codex plugin marketplace add ilovintit/shw-plugins
```

安装插件：

```bash
codex plugin add shw@shw-plugins-market
```

Desktop 用户也可重启 ChatGPT desktop 后，在 Plugins Directory 中选择该 marketplace，安装 `shw`。

## Gitea MCP 配置文件（通用）

插件 launcher 会读取两个 env 文件；后者覆盖前者同名变量：

1. 用户级：`${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/gitea.env`
2. 工作区级：`${SHW_MCP_WORKDIR:-$PWD}/.shw-plugins/gitea.env`

> `SHW_MCP_WORKDIR` 环境变量用于显式指定工作区根目录。部分 agent 宿主（如 Kimi Code）把插件 launcher 的 `cwd` 锚定到插件安装根而非用户项目目录，此时 `$PWD` 不指向用户项目——设置 `SHW_MCP_WORKDIR` 可可靠覆盖；无法设置时请使用用户级文件或各宿主的项目级覆盖配置。

用户级文件支持 `GITEA_*` 简单赋值；工作区级文件只支持 `GITEA_HOST` / `GITEA_ACCESS_TOKEN`，不执行 shell 命令，不要提交真实 token：

```dotenv
GITEA_HOST=https://gitea.example.com
GITEA_ACCESS_TOKEN=<你的 token>
```

工作区文件若把 `GITEA_HOST` 改成不同值但没有同时配置项目 token，launcher 会主动丢弃旧 token，避免凭据被发到新实例。

<!-- KIMI-CONFIG:START -->
## Kimi Code 配置（gitea MCP）

插件自带 gitea shim 网关（工具面随插件注入，后端按 pin 版本自动下载）。

### 主路径：env 文件（零 mcp.json 配置）

Launcher 依次读取以下两个 env 文件，同名变量由后者覆盖前者：

1. **用户级**：`${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/gitea.env`——跨项目生效，支持全部 `GITEA_*` 变量
2. **工作区级**：`${SHW_MCP_WORKDIR:-$PWD}/.shw-plugins/gitea.env`——仅当前项目，只支持 `GITEA_HOST` / `GITEA_ACCESS_TOKEN`

创建用户级文件（填入你的 Gitea 实例地址和 token）：

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

> **注意**：Kimi Code 把插件 MCP 的 `cwd` 锚定到插件安装根，工作区级 `$PWD/.shw-plugins/gitea.env` 通常不指向你的项目目录。项目级特殊配置请使用下方 mcp.json 覆盖路径，或在启动环境设置 `SHW_MCP_WORKDIR` 指向项目根。

### 兼容路径：shell 导出

启动 Kimi Code 前在 shell 导出变量（env 文件中的同名变量会覆盖此路径）：

```bash
export GITEA_HOST="https://gitea.example.com"    # 你的 Gitea 实例地址，需含协议头
export GITEA_ACCESS_TOKEN="<你的 token>"          # Gitea Web → Settings → Applications 创建
```

首次调用时 shim 会从 gitea.com 下载官方 gitea-mcp 后端（数秒，之后走用户级缓存）；机器无需安装 Go。

### 进阶：mcp.json 同名整体覆盖

项目需要连特殊 Gitea 实例（不同 host / token），或想显式指定命令时，在配置文件里写一个与插件清单同名的 `gitea` 条目，即可整体覆盖插件内置声明（Kimi 官方文档确认项目级 `.kimi-code/mcp.json` 覆盖用户级 `~/.kimi-code/mcp.json`；worktree 根 `.mcp.json` 若受支持则介于其间；三者均高于插件清单）。覆盖后该条目脱离 shim 自管，由你写的命令直接拉起后端。

编辑 `~/.kimi-code/mcp.json`（用户级，跨项目生效）或项目 `.kimi-code/mcp.json`（仅本项目），写入完整文件内容（可直接粘贴后修改）：

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

- `GITEA_HOST`：你的 Gitea 实例地址，**需含协议头**（如 `https://gitea.example.com`，填你自己的 Gitea 实例地址）
- `GITEA_ACCESS_TOKEN`：访问 token，在 Gitea Web → Settings → Applications 创建

> 上面的 JSON 是**用户自选直连后端形态**：机器需 Go 或自装二进制，不经 shim 管理。
<!-- KIMI-CONFIG:END -->

## 仓库结构

```
shw-plugins/                         ← GitHub 仓库根
├── marketplace.json                 ← ZCode 市场清单（source 指向 zcode/）
├── kimi.plugin.json                 ← Kimi Code 清单（./ 路径指向 kimi-code/ 子目录）
├── .agents/plugins/marketplace.json ← Codex 市场清单（source 指向 codex/）
├── README.md                        ← 本文件
├── zcode/                           ← ZCode 插件产物
│   ├── .zcode-plugin/plugin.json
│   ├── mcp-shim/（gitea shim 网关：launch.sh + 三平台二进制）
│   ├── skills/
│   └── commands/
├── kimi-code/                       ← Kimi Code 插件产物
│   ├── kimi.plugin.json
│   ├── mcp-shim/（gitea shim 网关：launch.sh + 三平台二进制）
│   ├── skills/
│   └── commands/
└── codex/                           ← Codex 插件产物
    ├── .codex-plugin/plugin.json
    ├── .mcp.json
    ├── README.md
    ├── mcp-shim/（gitea shim 网关：launch.sh + 三平台二进制）
    └── skills/（30 个共享 skills + 16 个 command prompt wrappers）
```

## 包含的 Commands

ZCode 与 Kimi Code 直接安装这 16 个 commands。Codex 插件清单没有原生 commands 字段，构建器把同名 command 映射为显式触发的 skill-backed prompt。

| Command | 作用 |
|---------|------|
| `/shw-explore` | 免 Issue纯读探索；旧 change explore已退役 |
| `/shw-init` | 初始化空项目 |
| `/shw-update` | 全量审计并修复存量项目对齐 |
| `/shw-product` | 维护唯一产品级 PRD |
| `/shw-prototype` | 维护产品索引与多入口高保真原型 |
| `/shw-architecture` | 维护整体架构入口与拆分文档族 |
| `/shw-product-review` | 综合审查并修正产品文档 |
| `/shw-version` | 定义 Version并创建 Milestone |
| `/shw-split` | 将 Version拆成多个交付 Issue |
| `/shw-test-plan` | 建立 AC与自动/人工测试映射 |
| `/shw-work` | 完成一个 Issue |
| `/shw-roadmap` | 严格串行完成一个 Version的多个 Issue |
| `/shw-bug` | 将反馈形成并路由 Bug/Hotfix |
| `/shw-release` | 建 dev→main PR；人工合并后续跑打 tag |
| `/shw-deploy` | 只读观察 Fleet/K8s部署 |
| `/shw-version-close` | 经生产验证和用户确认关闭 Milestone |

## 包含的 Skills（30 个）

生命周期核心：`shw-product-docs`、`shw-version-planning`、`shw-delivery`、`shw-acceptance`、`shw-release-flow`、`shw-k8s-observer`、`shw-gitea-flow`、`shw-gitea-repo`、`shw-gitea-ci`、`shw-issue-gate`、`shw-worktree`、文档/设计/PR审查、TDD、调试、验证和工作记忆。

公司工程规范继续保留：DDD、后端与前端技术栈、GoFrame/Hyperf约定、PC/移动端交互、lib文档指路和端口管理。旧 workflow Skill不通过屏蔽名单假保留。

## Codex Worktree 结合

`shw-worktree` 的纪律不变：主目录只是 dev 基座，Issue 开发一律隔离进 worktree。Codex 的映射如下：

- **普通 Issue**：新 chat 选择 **Worktree**，起点 `dev`；开工后创建 `feat/<N>-<slug>`，保持 Issue:分支:Worktree 1:1。
- **Roadmap / Milestone**：使用 **permanent worktree** 承载整个里程碑，逐 Issue 换分支；不要用一次性 managed worktree 承载长循环。
- **Handoff**：需要在本机 IDE / dev server 前台检查时，用 Codex Handoff 在 Local 与 Worktree 之间移动同一会话。
- **依赖与本地文件**：依赖装在 Local Environment setup（例如 `cd scripts && npm ci`）；被 Git 忽略但 worktree 必需的文件放目标仓库 `.worktreeinclude`。
- **清理**：Codex managed worktree 交给宿主生命周期；不要手动删除其目录。fallback Git worktree 仍按 `shw-worktree` 清理。
- **临时 fork 任务**：主任务收集结果并完成独立验证后，归档本次命令创建且已经完成或明确不再需要的临时任务；仍运行、等待输入、需要关注或由用户独立创建的任务不得归档。任务归档不等同于 worktree 清理。

## 包含的 MCP

| MCP | 作用 | 是否需要配置 |
|-----|------|------------|
| `gitea` | 官方 gitea-mcp（经插件自带 shim 网关拉起：工具面毫秒注入，后端按 pin 版本自动下载/监督/对齐，放用户级缓存），Gitea 全能力（CI / PR / issue…） | 机器无需 Go；所有工具可使用用户级/工作区 env 文件；ZCode 继续支持插件设置，Kimi/Codex 的 shell 导出兼容；首次调用需访问 gitea.com 下载后端（数秒）；Windows 暂不支持（可用覆盖配置为自装二进制兜底） |

## 版本

当前版本见根目录 `marketplace.json` 的 `plugins[].version` 字段。

发版历史见本仓库的 [Tags](../../tags)。

## 源码与贡献

本仓库是构建产物，源码托管在私有 Gitea（`shw-project/shw-plugins`）。如需贡献或查看实现细节，请联系维护者。

## License

MIT
