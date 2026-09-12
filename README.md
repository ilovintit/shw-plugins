# shw-plugins

## 项目外文件只读边界

项目 Agent 仅可修改已确认的当前项目工作目录（交付时为当前 Issue worktree）；项目外文件只读，一字符也不得修改，包括创建、删除、移动、重命名和权限变更。按真实路径判断，禁止经符号链接、shell、脚本、MCP 或自行委派绕过。需要外部修改时先停止相关操作，报告绝对路径、原因和拟修改内容，请用户介入并安排其他获授权 Agent 或手动处理，完成后只读复核。Worktree MCP 正常管理本项目工作区/状态/Git 元数据及 Gitea shim 正常维护后端缓存为有限程序运行例外，不授权 Agent 手改用户配置、状态或缓存。此为提示词纪律，不增加技术拦截；远端 Gitea 操作仍按原授权处理。

共享执行口径见 `shw-issue-gate`；初始化与升级必须把完整规则写入目标项目 Agent 规范。

宿主为完成已授权调用自行维护的临时会话、日志和内部运行状态属于宿主自身行为，不代表项目 Agent 获得项目外写权限。Agent 不主动指定外部输出、修改宿主配置/缓存、操纵保留策略或借子任务越界；需要这类修改仍由用户介入。

> Product lifecycle workflow covering product truth, version planning, Issue delivery, release, Fleet deployment observability, engineering standards, and Gitea integration.

本仓库是 **shw-plugins 的发布仓库**，存放 ZCode、Kimi Code、Codex 与 Claude Code 的构建产物。源码在私有 Gitea，CI 自动构建并推送到本仓库。

> 插件定位：**主要面向 ZCode 优化和适配**——ZCode 产物是完整能力（skills + commands + gitea 官方 MCP + Worktree MCP + userConfig 配置插值）。Kimi Code 产物是通用适配（skills + commands + gitea 官方 MCP + Worktree MCP）。Codex 产物是通用适配（skills + gitea 官方 MCP + 插件 Worktree MCP），并把共享 commands 映射为显式 skill prompts，不伪造原生 commands。Claude Code 产物是通用适配，但与 ZCode 同属 Claude 插件生态、机制同源（skills + commands + gitea 官方 MCP + Worktree MCP + Kubernetes HTTP 直连，凭据走原生 userConfig 插值）。

## 按仓库禁用工作流

无需 SHW 生命周期的仓库可在 Git 仓库根提交 `.shw-workflow-ignore`；文件可为空，建议写 `reason=operations-repository` 等审计原因。无 Git 仓库的普通会话也默认不启用项目工作流。存在标记时，插件不会自动应用 SHW 命令或 Skill；显式调用时会先报告标记，只有用户针对本次任务明确覆盖才继续，且不会删除标记。

该标记只关闭插件提示词工作流，不绕过宿主权限、用户授权、secret保护、仓库自身 `AGENTS.md` 或其他更高优先级规则。已有项目规范中的冲突条款需由该项目自行调整。Ansible/运维仓库运行仓库内已授权 playbook 修改明确远端目标，不视为 Agent 直接写本机项目外文件；本机外部路径仍受原边界限制。

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

### Claude Code 客户端（marketplace）

Claude Code 读取仓库根的 `.claude-plugin/marketplace.json` 发现发布仓库内的 `claude-code/` 插件（与 ZCode 读取的根 `marketplace.json` 互不干扰）：

```
/plugin marketplace add ilovintit/shw-plugins
```

随后在插件列表安装 **shw-plugins**（CLI 也可 `claude plugin install shw-plugins@shw-plugins-market`）。命令以插件命名空间调用，如 `/shw-plugins:shw-work`。启用时客户端会按清单 `userConfig` 提示配置 Gitea 地址/token 与 Kubernetes MCP URL/token（token 输入掩码并存入安全存储），之后可随时在插件设置中修改；未配置时也可沿用下文「Gitea MCP 配置文件（通用）」的 env 文件机制。

### OpenCode（源码本地构建）

本公开仓库不包含 OpenCode 产物。源码访问者执行 `cd scripts && npm ci && npm run build:opencode`，使用 `dist/opencode/` 完整目录（`.opencode/`、`opencode.json`、`mcp-shim/`、`worktree-mcp/` 与 bin）。安装到稳定用户级路径，合并 MCP 配置时将 Gitea/Worktree 两个 launcher 改为该路径下的绝对路径；只复制 skills/commands 不足以启动 Gitea MCP。

## 固定版本安装与回退

这些操作由用户或用户安排的获授权维护者执行，项目 Agent 不修改用户插件目录或配置。先选择已经成功发布且包含目标宿主产物的稳定 tag；下面以 v7.2.1 举例。记录安装前的宿主版本、插件版本和配置备份；不要改写发布仓库 main/tag 来回退单台客户端。

**ZCode**：将该稳定 tag 克隆到独立、持久的本地目录，保留整个发布根：

```sh
git clone --branch v7.2.1 --single-branch https://github.com/ilovintit/shw-plugins.git /absolute/path/shw-v7.2.1
```

在 Settings → Plugin Management 中停用现有 shw-plugins，移除旧来源的安装，随后在 Discover → `+` 填该本地目录，选择 shw-plugins → Get。存在同名市场时先通过 UI 移除旧市场来源再添加本地快照。保留目录不切换分支、不拉取默认 main；重启会话确认安装版本。回退时选择另一个已成功发布 tag 的独立目录重复这一步。此处本地市场入口依据 [ZCode 官方教程](https://github.com/zai-org/zcode-plugins/blob/main/docs/PLUGIN_DEVELOPMENT_CN.md#18-在客户端本地测试)，本仓库未声称该宿主 UI 回退已经实测。

**Kimi Code**：使用明确 tag 的 URL，不用默认仓库 URL 表示固定版本：

```text
/plugins install https://github.com/ilovintit/shw-plugins/releases/tag/v7.2.1
/reload
/plugins info shw-plugins
```

回退时把 tag 换成已成功发布的旧版本，重新安装并开新会话核验。也可 `/plugins install /absolute/path/shw-v7.2.1` 安装上面的完整快照；本地目录会被复制，修改原目录不会更新已装插件。入口依据 [Kimi Code 官方插件文档](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/plugins.html)，本次未执行用户级安装/回退。

**Codex**：先移除现有插件和同名市场来源，再将市场固定到 tag：

```sh
codex plugin remove shw@shw-plugins-market
codex plugin marketplace remove shw-plugins-market
codex plugin marketplace add ilovintit/shw-plugins --ref v7.2.1
codex plugin add shw@shw-plugins-market
codex plugin list
```

首次安装不执行不存在项目的 remove。回退时以已成功发布的旧 tag 重复操作，随后完全重启 Desktop/CLI 会话，核验插件版本、command skills 和该版本清单中的 stdio MCP：v7.3.0 为 Gitea、Worktree、Kubernetes 三个，v7.2.1 为 Gitea、Worktree 两个。Kubernetes 未配置时应明确报错，不将未连接记为远端调用通过；回退 v7.2.1 时由维护者恢复旧用户级注册并去重。`--ref` 与本地市场路径由当前 CLI `codex plugin marketplace add --help` 核验；[官方插件开发指南](https://learn.chatgpt.com/docs/build-plugins)提供本地市场说明。本次未改动用户安装状态，不能将帮助输出当作回退实测。

**Claude Code**：先移除现有插件与市场来源，再将市场固定到已成功发布的 tag：

```sh
claude plugin remove shw-plugins@shw-plugins-market
claude plugin marketplace remove shw-plugins-market
claude plugin marketplace add ilovintit/shw-plugins@v7.2.1
claude plugin install shw-plugins@shw-plugins-market
claude plugin list
```

固定 tag 语法 `owner/repo@ref` 依据 [Claude Code 插件市场文档](https://code.claude.com/docs/en/plugin-marketplaces)；回退后重启会话核验版本、命令命名空间（`/shw-plugins:shw-work`）与三个 MCP。本次未执行用户级安装/回退，不将文档示例记为实测。注意所选 tag 须为**包含 claude-code/ 产物的版本**（本节随该产物首发引入，更早的 tag 无此目录）。

各宿主都要确认安装版本与目标快照清单一致、Gitea initialize/tools/list 正常、Worktree 六工具可见；只读检查既有登记不迁移/删除工作区。出现状态格式或宿主兼容性问题时保留配置和数据，恢复原已知可用版本并记录失败证据，不能通过删除工作区状态来完成回退。

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
├── .claude-plugin/marketplace.json  ← Claude Code 市场清单（source 指向 claude-code/）
├── README.md                        ← 本文件
├── zcode/                           ← ZCode 插件产物
│   ├── .zcode-plugin/plugin.json
│   ├── worktree-mcp/（工作区管理器：launch.sh + 三平台二进制）
│   ├── mcp-shim/（gitea shim 网关：launch.sh + 三平台二进制）
│   ├── skills/
│   └── commands/
├── kimi-code/                       ← Kimi Code 插件产物
│   ├── kimi.plugin.json
│   ├── worktree-mcp/（工作区管理器：launch.sh + 三平台二进制）
│   ├── mcp-shim/（gitea shim 网关：launch.sh + 三平台二进制）
│   ├── skills/
│   └── commands/
├── codex/                           ← Codex 插件产物
│   ├── .codex-plugin/plugin.json
│   ├── .mcp.json
│   ├── README.md
│   ├── worktree-mcp/（工作区管理器：launch.sh + 三平台二进制）
│   ├── mcp-shim/（gitea shim 网关：launch.sh + 三平台二进制）
│   ├── kubernetes-mcp/（Codex 传输薄壳：launch.sh + 三平台二进制）
│   └── skills/（32 个共享 skills + 16 个 command prompt wrappers）
└── claude-code/                     ← Claude Code 插件产物
    ├── .claude-plugin/plugin.json（元数据 + userConfig 配置声明）
    ├── .mcp.json（gitea / worktree / kubernetes 三条目）
    ├── worktree-mcp/（工作区管理器：launch.sh + 三平台二进制）
    ├── mcp-shim/（gitea shim 网关：launch.sh + 三平台二进制）
    ├── skills/
    └── commands/
```

## 包含的 Commands

ZCode、Kimi Code 与 Claude Code 直接安装这 16 个 commands（Claude Code 以插件命名空间调用，如 `/shw-plugins:shw-work`）。Codex 插件清单没有原生 commands 字段，构建器把同名 command 映射为显式触发的 skill-backed prompt。

| Command | 作用 |
|---------|------|
| `/shw-explore` | 免 Issue纯读探索；旧 change explore已退役 |
| `/shw-init` | 初始化空项目 |
| `/shw-update` | 全量审计并修复存量项目对齐 |
| `/shw-product` | 维护唯一产品级 PRD |
| `/shw-prototype` | 当前Agent按公司规范直接维护多端高保真HTML，浏览器预览反馈后在原文件持续修改 |
| `/shw-architecture` | 维护整体架构入口与拆分文档族 |
| `/shw-product-review` | 综合审查并修正产品文档 |
| `/shw-version` | 定义 Version并创建 Milestone |
| `/shw-split` | 将 Version拆成多个交付 Issue |
| `/shw-test-plan` | 建立 AC与自动/人工测试映射 |
| `/shw-work` | 完成一个 Issue |
| `/shw-roadmap` | 严格串行完成一个 Version的多个 Issue |
| `/shw-bug` | 将反馈形成并路由 Bug/Hotfix |
| `/shw-release` | 询问是否执行双模型 review（默认跳过；选择执行时沿用 GLM-5.3 + Kimi-K3）后建 dev→main PR；人工合并后续跑打 tag |
| `/shw-deploy` | 只读观察 Fleet/K8s部署 |
| `/shw-version-close` | 经生产验证和用户确认关闭 Milestone |

## 包含的 Skills（32 个）

生命周期核心：`shw-product-docs`、`shw-design-spec`、`shw-version-planning`、`shw-test-spec`、`shw-delivery`、`shw-acceptance`、`shw-release-flow`、`shw-k8s-observer`、`shw-gitea-flow`、`shw-gitea-repo`、`shw-gitea-ci`、`shw-issue-gate`、`shw-worktree`、文档/设计/PR审查、TDD、调试、验证和工作记忆。

公司工程规范继续保留：DDD、后端与前端技术栈、GoFrame/Hyperf约定、PC/移动端交互、lib文档指路和端口管理。旧 workflow Skill不通过屏蔽名单假保留。

## 高保真 HTML 原型

一个业务项目只有一套按真实业务角色与端组织的原型，由当前宿主Agent直接在Issue工作区的 `docs/design/` 增量维护。组件、主题与交互以公司前端规范和项目既有组件库为准；PRD提供产品事实，不重复问已知信息。`index.html`组织产品/端入口，业务页面使用语义文件名，样式、交互、素材和显式模拟数据分开。目录约定见 `shw-design-spec/references/structure.md`；不依赖外部设计平台、模型派发、项目ID或另一套存储。

`docs/design/` 是唯一原型源码与验收目录，不创建竞争的 `docs/prototype/`。先记录干净Issue工作区基线，盘点旧页面、依赖与已确认交互，再逐端原地整理和修改，不按Issue重建。完整外部导出可一次迁入并保留有效内容与来源；尚未取得完整文件时由用户提供，不派发或轮询外部生成任务，不操作外部项目及用户配置。浏览器预览反馈通过后才清理明确替代文件并复验，提交同一draft产品PR，完成architecture与product-review后合入dev。可选ui-design.md仅作同步派生的实现映射。

原型必须浏览器实测并由用户验收；模拟接口与组件仿真明确标注，不能替代服务联调、真实组件或小程序/原生端验证。插件只分发工作流与目录参考，不托管业务截图/VRT；不要求安装外部设计客户端或MCP。

## Worktree MCP（所有宿主）

同一会话调用 worktree.acquire 取得目录和分支，所有操作使用返回的绝对路径。索引由 MCP 自动维护，暂停用 release，完成后 remove；异常用 inspect/list/reconcile。无需自动 fork/Handoff，不修改 Codex 任务绑定。

默认 root 为 `${XDG_DATA_HOME:-$HOME/.local/share}/shw-plugins/worktrees`；可通过 `SHW_WORKTREE_ROOT` 或 `${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/worktree.json` 配置。ZCode 也可使用可选 worktree_root 设置。参数/恢复详见分发的 shw-worktree/config.md 与 operations.md。

这是一套协作工具与 Skill，不拦截宿主工具、不认证会话身份；既有外部/原生工作区不自动接管或删除。状态保存在用户位置，升级插件不清除工作记录。

## 包含的 MCP

| MCP | 作用 | 是否需要配置 |
|-----|------|------------|
| `worktree` | 本地 Go 工作区管理：六工具、统一目录、自动登记、安全清理 | 需要 Git，不需要 Go 或新凭据；根目录可选配置，详见 shw-worktree/config.md |
| `gitea` | 官方 gitea-mcp（经插件自带 shim 网关拉起：工具面毫秒注入，后端按 pin 版本自动下载/监督/对齐，放用户级缓存），Gitea 全能力（CI / PR / issue…） | 机器无需 Go；所有工具可使用用户级/工作区 env 文件；ZCode 与 Claude Code 支持插件设置（userConfig，安装/启用时提示），Kimi/Codex 的 shell 导出兼容；首次调用需访问 gitea.com 下载后端（数秒）；Windows 暂不支持（可用覆盖配置为自装二进制兜底） |
| `kubernetes` | 组织部署的统一多集群只读 Streamable HTTP MCP（项目 Agent 只用于 context、工作负载、Events、rollout 和日志观测） | Codex 随插件分发 stdio 薄壳，自动读取稳定用户级 kubernetes.env，无需额外注册；不运行 Kubernetes 服务。ZCode 与 Claude Code 使用插件设置（userConfig 插值），OpenCode 使用生成的环境变量条目，Kimi Code 使用用户级 MCP 配置直连；完整示例在随插件分发的 `shw-k8s-observer/config.md`。URL 与 Agent 专属 Bearer 不得写入仓库或版本化插件路径。 |

## 版本

当前版本见根目录 `marketplace.json` 的 `plugins[].version` 字段。

发版历史见本仓库的 [Tags](../../tags)。

## 源码与贡献

本仓库是构建产物，源码托管在私有 Gitea（`shw-project/shw-plugins`）。如需贡献或查看实现细节，请联系维护者。

## License

MIT

## 定向测试与缓存

API/E2E/VRT规范见shw-test-spec：Issue→dev只关联模块/文件，dev→main实际启动全量检查，空选择不全测；全量结果不构成用户不可覆盖的绝对门禁，用户可在Gitea Web UI例外合并并记录真实状态、人工验证、风险和测试债务，Agent无main合并权。默认Gitea CI，必要本地小单测使用项目入口。镜像/Action/npm/Go通过公司内网缓存，缺配置先补齐，不静默公网回退。该规范由现有test-plan/TDD/CI入口调用，不增加日常命令。

## v7.4.0：统一 GitOps 发布工具

Kubernetes 项目可通过 init/update 接入固定版本的 `shw-gitops` CI 程序：代码与部署模板绑定同一源码 SHA，校验完整镜像 digest 清单，完整生成声明并普通追加提交至 `fleet/dev`、`fleet/test`、`fleet/prod`，拒绝迟到运行和推送竞争。支持同仓库与预先授权的独立 GitOps 仓库；不回写业务分支、不强推、不直接操作 Kubernetes。

工具镜像独立版本为 `shw-ci-gitops:1.0.0`，项目使用插件内 `shw-release-flow/references/gitops/image.json` 登记的固定 digest，配置和 workflow 示例见同目录 README。安装插件不会自动迁移业务项目或切换 Fleet。旧目录、原生 fleet.yaml 控制语义及实际业务验收须由对应项目评估；镜像与 CI 验证不等同宿主安装或业务部署验收。
