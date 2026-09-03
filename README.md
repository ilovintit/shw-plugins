# shw-plugins

> Issue-driven development workflow with parallel agent execution, TDD/debugging/verification disciplines, DDD architecture spec, and Gitea CI integration.

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
    └── skills/（27 个共享 skills + 25 个 command prompt wrappers）
```

## 包含的 Commands

ZCode 与 Kimi Code 直接安装这 25 个 commands。Codex 插件清单没有原生 commands 字段，构建器把同名 command 映射为显式触发的 skill-backed prompt：用户点名 `/shw-*`、`shw-*` 或该工作流时执行，不新增私有 commands 机制。

| Command | 作用 |
|---------|------|
| `/shw-init` | 初始化空项目/新项目为 Issue 驱动工作流——询问 → 骨架 → AGENTS.md → Gitea 设施（存量项目走 /shw-import） |
| `/shw-import` | 存量项目接入——设施对齐、specs 写入 Issue、历史 Milestone 驱动真相源回补（PRD/原型/技术文档） |
| `/shw-issue` | 需求入口——建 Issue、澄清、初步整理进 Issue、判定微活/小活/大活 |
| `/shw-research` | 免 Issue 自由调研——纯读侧探索，结论摘要经闸门转交 Issue |
| `/shw-do` | 微活直通执行——直接执行 Issue 内容，不进 change 族 |
| `/shw-wrap` | 微活收尾一条龙——回写 Issue + 提 PR + 盯 CI + 全绿自动合并 |
| `/shw-explore` | 差距调查（change 族第一步，不可跳过）——读 Issue 需求 × 代码现状，产出差距清单与具体执行方案，供同会话 /shw-propose 固化 |
| `/shw-milestone` | Sprint 计划——开 Milestone，从"待开发"挑 Issue，大活拆分裁决，生成验收 checklist |
| `/shw-propose` | 固化 explore 结论为 change 三件套（.changes/ 本地草稿，可关联 Issue）；无探索结论不固化 |
| `/shw-apply` | 执行 change——读三件套并行子智能体实现、自我审查收敛、提 PR 即止——合并归 /shw-archive（CI 门禁在 Gitea 看，编排模式由编排层等红绿） |
| `/shw-archive` | 归档 change——核对 CI 全绿、用户确认合并 PR，执行轨迹回写关联 Issue、清理本地草稿（无 specs 产物） |
| `/shw-roadmap` | Milestone 执行驱动——逐 Issue 走 change 族（explore→propose→apply→archive），编排层等 CI 红绿循环 |
| `/shw-test-draft` | 测试用例起稿——milestone 或单 Issue 的验收 checklist（TC: 命名）落成可执行测试（e2e/VRT/单元），只写不跑 |
| `/shw-test-review` | 测试对齐审查（执行前对抗闸）——AC↔测试双向映射核对，问题经用户裁决直接修正，零 🔴 放行 |
| `/shw-prd-draft` | 起草/增改模块 PRD 活文档（验收标准可取证自查、逐节确认） |
| `/shw-prd-review` | PRD 完备性细化审查（多视角无锚定找洞，问题经用户裁决直接写回，docs PR 提交） |
| `/shw-prd-audit` | 盘点 PRD 完成度——逐条验收标准独立取证（纯读取，Sprint Review 可用） |
| `/shw-prd-release` | 外包交付边界冻结（fresh audit + git tag 验收基线） |
| `/shw-proto-draft` | 起草/增改功能 HTML 原型（从 Issue+PRD 反推界面结构，四态枚举齐全，用户验收交互逻辑） |
| `/shw-proto-review` | 原型完备性细化审查（多视角无锚定找洞：PRD 咬合/状态覆盖/操作流/权限可见性，问题直接写回） |
| `/shw-arch-draft` | 起草/增改技术方案八章节（内置 design-review 对照 PRD，docs PR 合入即 Definition of Ready） |
| `/shw-arch-review` | 技术方案完备性细化审查（多视角无锚定找洞：表结构/API 契约/异常分支/非功能性，问题直接写回） |
| `/shw-review` | 发布前双模型对抗终审——范围由输入确定（milestone/版本区间/全仓/任意变更集），同题独立审查×2，回收对账合并，🔴 清零放行 |
| `/shw-update` | 插件升级后的存量项目迁移（v6.0.0 含 change→Issue 工作流大迁移） |

## 包含的 Skills（27 个）

### 工作流编排与纪律（16 个）

| Skill | 作用 |
|-------|------|
| `shw-gitea-flow` | Gitea 流程编排：Issue/状态 label/Milestone/PR 关联纪律（Refs #N / Closes #N / 1:1:1） |
| `shw-issue-gate` | 入口闸门：动手前自查关联 Issue，无单不开工；MCP 缺失 API 兜底 |
| `shw-gitea-repo` | Gitea 仓库工程规范：分支设计模型（main/test 保护、1:1:1、feat/bug/hotfix）+ PR 门禁 workflow 模板（快速层 + API/E2E/VRT 全在门禁） |
| `shw-work-journal` | 工作记忆两层结构：Session Log（docs/journal/）+ AGENTS.md 定期提炼 |
| `shw-issue-parallel` | 并行任务委派决策框架（6 段式派发 prompt、本地静态确认/CI 测试分层） |
| `shw-worktree` | worktree 纪律（主目录只做 dev 基座不承载开发；宿主原生 Worktree 优先，roadmap 主线常驻/permanent worktree，一切 issue 开发各自 worktree——小活并发是常态） |
| `shw-design-review` | 数据库/API 设计对照 PRD 过审（PRD 已覆盖自主核对、未覆盖逐项确认） |
| `shw-docs-review` | docs PR 逐字符审查（PRD/原型/技术方案 vs 需求讨论上下文） |
| `shw-pr-review` | 代码 PR 双次审查（提 PR 前 + 合并前，逐字符对照验收 checklist 与技术方案） |
| `shw-goal-drive` | 用原生 goal 跑完 Milestone 的编排打法（逐 Issue change 族 + 等 CI 红绿 + 独立取证） |
| `shw-docs-audit` | 活文档为锚的全量审计（断言对账代码现实，不符修文档，分组 commit 不 push） |
| `shw-tdd` | 测试先行 RED-GREEN-REFACTOR——红绿由 PR CI 判定（agent 本地不跑测试） |
| `shw-debugging` | 强制 4 阶段根因分析 |
| `shw-verify` | 声称前强制取证（编译级检查本地出，测试以 CI run 链接为准） |
| `shw-commit` | 任务完成后主动 commit 到本地 git |
| `shw-port-manager` | 端口登记管理（先查全局登记表再分配，杜绝跨项目冲突） |

### 设计规范与栈落地（10 个，语言无关或栈绑定）

| Skill | 作用 |
|-------|------|
| `shw-ddd` | DDD 四层架构（domain/application/interfaces/infrastructure）通用设计规范 |
| `shw-frontend-stack` | 前端技术栈选型规范（3 套标准栈 + 2 套特殊形态） |
| `shw-frontend-spec-common` | 前端通用操作逻辑规范（编辑/详情必须调详情接口等铁律） |
| `shw-frontend-spec-pc` | PC 后台（Vite + Element Plus）视觉与操作逻辑规范 |
| `shw-frontend-spec-mobile` | Taro 移动端视觉与操作逻辑规范（@shwkj/taro-ui 组件库） |
| `shw-backend-stack` | 后端基础设施技术栈选型规范（数据库=PostgreSQL 18 / 缓存=Valkey / 对象存储=silo，固定口径禁止自由发挥） |
| `shw-hyperf-conventions` | 公司设计规范在 PHP+Hyperf 栈的落地实现指南 |
| `shw-goframe-conventions` | 公司设计规范在 Go+GoFrame 栈的落地实现指南 |
| `shw-lib-docs` | 公司 lib 组件库文档指路（依赖检测 → 读 lib README 与 docs） |
| `shw-k8s-rancher` | 经 Rancher 只读排查 K8s 集群（kubectl 只读白名单） |

### 外部工具集成（1 个）

| Skill | 作用 |
|-------|------|
| `shw-gitea-ci` | Gitea Actions CI 查询 / 重试失败 run / 合并 PR（走官方 gitea-mcp；流程设施归 shw-gitea-flow） |

> 组件级设计规范（错误处理 / 权限 / 任务 / 会话 / 加密 / 短信等）由公司 lib 仓库自己的 README 与 docs 承载，`shw-lib-docs` 只做指路。

## Codex Worktree 结合

`shw-worktree` 的纪律不变：主目录只是 dev 基座，Issue 开发一律隔离进 worktree。Codex 的映射如下：

- **普通 Issue**：新 chat 选择 **Worktree**，起点 `dev`；开工后创建 `feat/<N>-<slug>`，保持 Issue:分支:Worktree 1:1。
- **Roadmap / Milestone**：使用 **permanent worktree** 承载整个里程碑，逐 Issue 换分支；不要用一次性 managed worktree 承载长循环。
- **Handoff**：需要在本机 IDE / dev server 前台检查时，用 Codex Handoff 在 Local 与 Worktree 之间移动同一会话。
- **依赖与本地文件**：依赖装在 Local Environment setup（例如 `cd scripts && npm ci`）；被 Git 忽略但 worktree 必需的文件放目标仓库 `.worktreeinclude`。
- **清理**：Codex managed worktree 交给宿主生命周期；不要手动删除其目录。fallback Git worktree 仍按 `shw-worktree` 清理。

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
