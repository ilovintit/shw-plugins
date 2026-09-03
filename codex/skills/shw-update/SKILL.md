---
name: shw-update
description: "Codex prompt workflow for shw-update、/shw-update. 插件升级后的存量项目迁移 - 按迁移清单幂等检测并修复项目 AGENTS.md 等旧版工作流写入内容（死链 / 旧口径 / 作废文件），v6.0.0 含 change→Issue 工作流大迁移（specs 分流 + .changes 内 v5 specs 残留清理）。新项目直接 /shw-init Use only when the user explicitly asks for this named workflow."
---

# shw-update

这是共享源码中同名 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `shw-update`、`/shw-update` 或要求执行该工作流时按下方原文执行。

存量项目迁移命令：插件版本升级后，旧版 `/shw-init` 写入项目的模板内容可能已过时（命令死链、旧口径、作废机制的残留文件）。本命令对照迁移清单逐条**检测 → 修复 → 报告**，幂等设计——不依赖项目记录版本号，任意旧版本初始化的项目都能一次跑到最新口径，重复运行安全。

---

**步骤**

1. **前置检查**

   - 项目根存在 `.changes/`、`specs/` 之一，或 AGENTS.md 含 `<!-- shw-workflow:v6 -->` 标记或「## change 管理」章节 → 继续步骤 2
   - 无任何新旧工作流痕迹 → 停止：本项目未初始化过工作流，无迁移对象——空项目/新项目提示改用 `/shw-init`，已有代码的存量项目提示改用 `/shw-import`（首次接入对齐）；v6 起 Issue 驱动工作流
   - 无 `AGENTS.md` 但有 `.changes/`/`specs/` → 报告状态异常（init 写入应落在 AGENTS.md），交用户判断

2. **逐条应用迁移清单**

   对下方迁移清单的**每一条**：先执行「检测」，命中的执行「修复动作」并记录；未命中的标记跳过。**逐条独立处理，一条失败不影响其余条目。**

   **清单条目按分类限定作用范围**：A 类条目只作用于 AGENTS.md 的工作流模板区段（「## change 管理」段落或含 `<!-- shw-workflow:v6 -->` 标记的「## 工作流」区段，init 写入的模板范围）——用户在段落外手写的内容绝不动；段落内不在检测模式中的自定义行也不动（唯一例外：整段替换型条目 A10，以其条目内说明为准）。B/C 类文件级条目只作用于条目明确列出的路径模式（`.changes/`、`.roadmaps/` 下），不碰路径模式外的任何文件。

3. **`.roadmaps/` git 忽略检查（通用口径，非版本条目）**

   `.roadmaps/` 是本地探索性工作区，过程内容不入库。项目用 git 且存在 `.roadmaps/` 目录时：

   - 检测：`git check-ignore -q .roadmaps/`（退出码 0 = 已忽略）
   - 未忽略 → 向用户说明该目录不应入库，向 `.gitignore` 追加一行 `.roadmaps/`（无 `.gitignore` 则创建），报告中记录
   - 已忽略或无 `.roadmaps/` 目录 → 跳过
   - `.roadmaps/` 内有已被 git 跟踪的文件时，gitignore 不影响已跟踪文件——不自动 `git rm --cached`，写入「需人工处理」由用户裁决

4. **汇总报告**

   ```
   ## ✅ 迁移完成（v6.0.0 口径）

   **已修复：**
   - <条目 ID + 一句话说明（文件 + 改动）>

   **未命中（已是最新，跳过）：**
   - <条目 ID 列表>

   **需人工处理（本命令不自动修）：**
   - <发现的问题 + 建议>
   ```

   无任何命中时输出「项目已是最新口径，无需迁移」。

---

## 迁移清单

> 维护约定（插件维护者）：凡影响存量项目 `/shw-init` 写入内容的变更（命令增删改名、模板口径变化、作废机制残留文件），发版时 MUST 在此清单追加条目——版本号 + 检测模式 + 修复动作。条目按版本倒序排列（最新在前），跨多版本的项目会依次命中所有适用条目。

### v6.3.0（/shw-release 放行链固化）

| ID | 范围 | 检测 | 修复动作 |
|----|------|------|---------|
| D14 | 项目 AGENTS.md 工作流段落 | 段落内无 `/shw-release` 字样 | 报告提示：新增 `/shw-release` 命令（放行链固化——收集版本/Milestone 放行范围与 CI 证据，核对终审后自动建 dev→main 放行 PR，用户合并后经确认打 tag 并跟踪发布结果）。需重装插件对齐新口径 |

### v6.2.0（gitea MCP shim 网关 + 入口强制 worktree）

| ID | 范围 | 检测 | 修复动作 |
|----|------|------|---------|
| D12 | 插件本身 | 任意 | 报告提示：gitea MCP 拉起方式变更——插件自带 shim 网关（内嵌 pin 版工具快照，工具面毫秒注入），后端官方 gitea-mcp 由 shim 按 pin 版本自动下载/监督/对齐（用户级缓存，机器不再需要 Go；首次调用需访问 gitea.com；$GITEA_MCP_BIN 可覆盖；Windows 暂不支持）。Kimi 用户主路径为 shell 导出 GITEA_HOST/GITEA_ACCESS_TOKEN，原 mcp.json 覆盖条目继续有效（属用户自选直连形态）。需重装插件对齐新口径 |
| D13 | 插件本身 | 任意 | 报告提示：入口强制 worktree——do/explore/roadmap/goal-drive 一切 issue 开发一律先建/进 worktree（主目录只做 dev 基座），"孤立串行可在主目录"的 agent 自判例外删除，豁免仅用户明示；shw-issue-gate 加工作区检查（挂单 ≠ 可开工，还须合规 worktree）；shw-wrap 合并后清理 issue worktree。存量项目按 `shw-worktree` 新口径执行，进行中的主目录开发迁入 worktree。需重装插件对齐新口径 |

### v6.1.0（工作流增补：微活链 + 入口闸门 + 合并时序验收后置）

| ID | 范围 | 检测 | 修复动作 |
|----|------|------|---------|
| A11 | AGENTS.md 工作流段落 | 段落内含「合并进 dev 即归档」或「单入口两分支」字样 | 将「- **流程**」bullet 及其随行旧子行（如「两分支终点相同：…」）整组替换为 v6.1.0 三层版（微活/小活/大活三分支 + 用户人工验收 → 归档环节合并 + shw-issue-gate 兜底，模板见 `/shw-init` 步骤 4）；幂等依据 = 替换后旧字样消失 |
| D11 | 插件本身 | 任意 | 报告提示：v6.1.0 相对 v5.x 新增命令 `/shw-research`（免 Issue 自由调研）、`/shw-do`（微活直通执行）、`/shw-wrap`（微活收尾一条龙）；新增 skill `shw-issue-gate`（入口闸门：无单不开工）、`shw-backend-stack`（后端基础设施选型口径：PG18/Valkey/silo）、`shw-worktree`（roadmap 主线与多 Issue 并行 worktree 纪律）。合并时序变化：交互模式 PR 合并后置到归档环节（apply 提 PR 即止，archive 用户确认时合并；微活 wrap 全绿自动合并）；编排模式 CI 全绿自动合不变。需重装插件对齐新口径 |

### v6.0.0（change 工作流退役 → Issue 驱动工作流）

| ID | 范围 | 检测 | 修复动作 |
|----|------|------|---------|
| A10 | AGENTS.md「## change 管理」段落 | 段落存在**且不含 `<!-- shw-workflow:v6 -->` 标记**（含标记视为已迁移，跳过——v6 模板本身含 `/shw-propose` 等字样，不设排除会反复命中、幂等失效） | **整段替换**为 v6 工作流区段（`<!-- shw-workflow:v6 -->` 标记 + 真相源/流程/分支/验证分层/状态流转（label）/工作记忆六要点，模板见 `/shw-init` 步骤 4）。本条目是 21 行作用范围限定的**唯一例外**：段落内用户自定义行一并被替换——替换前把段落全文列给用户确认；段落外用户手写内容不动 |
| B10 | `specs/` 目录 | 目录存在 | **先分流后删**：逐模块读取——业务规则 → `docs/prd/<模块>.md`；技术契约/决策 → `docs/architecture/<主题>.md`；仓库级纪律 → AGENTS.md；能力约束条目标注对应 skill 供并入。分流预览经用户确认后落盘，再删 `specs/`。无法安全归类的列入「需人工处理」 |
| B11 | `.changes/` 目录 | 目录存在 | **执行层草稿，保留不删**（v6 起 change 族回归为执行层，`.changes/` 已 gitignore 合法）。仅当其下有 v5 遗留 `specs/` 子目录时按 B10 同款规则分流后删除该子目录；v5 遗留 `.changes/config.yaml`（schema: spec-driven）无消费方，经用户确认后删除。检测范围：`.changes/` 下任意层级 `specs/` 子目录（含 `archive/` 子目录下的残留），但不删除 `.changes/` 本身 |
| D10 | 插件本身 | 任意 | 报告提示：v6.0.0 命令/skill/MCP 有增删改名——命令：`explore`→`issue`、`propose`→`milestone` 改名让位；change 族 `explore`/`propose`/`apply`/`archive` 以执行层语义回归（explore=差距调查、propose=固化三件套）；新增 `/shw-import`（存量项目首次接入）、`/shw-review`（发布前双模型对抗终审）、test 族 `/shw-test-draft`/`/shw-test-review`；`roadmap-explore/verify/archive` 三合一为 `/shw-roadmap`（Milestone 执行驱动）；`/shw-prd-revise` 退役（review 即修正、主动增改走 draft 追加模式）。skill：`shw-e2e-vrt-audit` 退役；`shw-change-parallel`/`shw-change-review`/`shw-change-review-code`/`shw-change-sync-spec` 退役；`shw-spec-audit` 改名为 `shw-docs-audit`；新增 `shw-gitea-flow`/`shw-gitea-repo`/`shw-docs-review`/`shw-issue-parallel`/`shw-pr-review`/`shw-work-journal`/`shw-frontend-spec-common`/`shw-frontend-spec-pc`/`shw-frontend-spec-mobile`。MCP：`mcp-spec` 本地 server 退役，仅保留外部 `gitea` 官方 MCP。需重装插件对齐新口径 |
| C10 | `.roadmaps/` 目录 | 目录存在 | 说明并经用户确认后处置：v6 起 roadmap 模型已搬到 Gitea（Milestone + Issue），本地 .roadmaps/ 无任何消费方——仍有价值的过程结论（被否方案/踩坑）回写对应 Issue 评论或 `docs/journal/`，其余内容 git 历史可考，目录删除；用户要留作个人参考也可保留，如实记录。`verify.md` 中仍有效的验收要点若有对应 Issue，转写进该 Issue 的验收 checklist |

### v5.0.0（Stop 闸门废弃 + 命令修正）

| ID | 范围 | 检测 | 修复动作 |
|----|------|------|---------|
| A1 | AGENTS.md「## change 管理」段落 | 存在行 `` - `/shw-sync` 同步 delta spec 到主 spec `` | 删除该行（`/shw-sync` 命令从未存在，同步能力由 `/shw-archive` 内嵌承载） |
| A2 | AGENTS.md「## change 管理」段落 | 存在行 `` - `/shw-archive` 归档已完成的 change `` | 替换为 `` - `/shw-archive` 归档 change（含 delta spec 同步到主 spec） ``（A1 删除 sync 行后，同步语义归位到 archive 行） |
| B1 | `.changes/*/contract.yaml`（排除 `.changes/archive/`） | 文件存在 | **不自动删**——列出并说明：契约机制已随 Stop 闸门废弃，该文件无任何消费方；经用户确认后删除 |
| B2 | `.changes/*/metrics.jsonl`（排除 `.changes/archive/`） | 文件存在 | 同 B1（闸门度量事件文件，已无消费方；确认后删除） |

注：A1/A2 针对的行内容以实际匹配为准（行内空白差异容错）；若用户已自行改过该段落且不匹配任何检测模式，视为已迁移，跳过。

---

**约束**

- **幂等**：所有修复动作可重复执行；检测未命中即跳过，不产生任何改动
- **只动条目列出的范围**：A 类条目限定在 AGENTS.md「## change 管理」段落内且仅命中检测模式的行；B/C 类条目只处理各自条目明确列出的路径与文件；步骤 3 通用检查仅允许向 `.gitignore` 追加 `.roadmaps/` 条目，不做其他任何改动
- **删文件必须确认**：B 类条目（删除作废文件）一律先报告、经用户确认再删；确认前只列不删
- **不擅自扩围**：迁移过程中发现清单外的项目问题（如 AGENTS.md 其他段落异常、`.changes/` 结构损坏），只写进「需人工处理」报告，不主动修
- **不加载 skill、不创建 change**：本命令是纯迁移维护动作，不进入 change 工作流
- 修改 AGENTS.md 前若有 git，可先确认工作区干净或提示用户改动将立即落盘
