---
name: shw-gitea-flow
description: Issue 驱动工作流的 Gitea 流程编排公共机制。经官方 gitea-mcp 操作 Issue/label/Milestone/PR：建 Issue、状态 label 流转、Refs #N / Closes #N 关联纪律、分支命名、六状态语义、微活小活大活分层、Issue 先行无例外。/init /issue /milestone /roadmap、change 族（/explore /propose /apply /archive）、微活链（/do /wrap）与免单调研入口 /research与 prd/proto/arch 文档族命令执行流程设施操作时加载；shw-issue-gate 在任务开工前做 Issue 先行自查时加载。建流程设施、流转 Issue 状态、关联 Issue 与 PR、判断走微活、小活还是大活路径时触发。
---

# Gitea 流程编排（Issue 驱动工作流的公共机制）

单人 + Agent × Gitea 的流程设施操作约定。所有流程状态住在 Gitea（Issue / Milestone / label / PR），本地文件只放文档真相源（`docs/`）与执行草稿（`.changes/`，gitignore）。本 skill 是 `/init` `/issue` `/milestone` `/roadmap`、change 族（draft→apply→archive）与 prd/proto/arch 文档族命令的公共依赖。

## 1. 流程全景与状态流转（label 承载）

Issue 的生命周期状态用 **label 表达**（不使用 Project 看板——看板只是视图层，label 是可过滤、可 API 操作的正式载体）：

```
需求池(backlog) → 方案中(status/方案中) → 待开发(status/待开发) → 开发中(status/开发中) → 待评审(status/待评审) → 完成(closed)
```

| 状态 | 载体 | 语义 | 进入时机 |
|---|---|---|---|
| 需求池 | `backlog` label | 已接收待排期，不挂 Milestone | /issue 建 Issue 时 |
| 方案中 | `status/方案中` label | PRD/原型/技术方案进行中 | 首个文档命令（prd/proto/arch-draft）领单时 |
| 待开发 | `status/待开发` label | Definition of Ready：方案全合入，等 Sprint 计划 | 方案 docs PR 合入时（/arch-draft，三件套最后一个） |
| 开发中 | `status/开发中` label | 已挂 Milestone、已开分支 | /apply 领单时 |
| 待评审 | `status/待评审` label | PR 已提、等 CI + 等用户人工验收 | PR 提交时（CI 门禁中） |
| 完成 | **closed**（不加 label） | 已合并、Issue 已关 | PR 合并时（`Closes #N` 自动关单） |

**流转纪律**：一次只有一个状态在身——打新 status/* label 的同时摘旧的；`backlog` 与 `status/*` 互斥（进方案中即摘 backlog）；完成态由 `Closes #N` 关单表达，不加 label。过滤口径：Sprint 计划查 `is:open label:status/待开发`，需求池查 `is:open label:backlog`。

## 2. Issue 纪律

- **一个需求一个 Issue**：Issue 是需求的 thread，不是动作的容器。PRD/原型/技术方案是这条生命的三个阶段，用状态 label 表达，不各建 Issue
- **Issue 出生在需求入口**（接收时），不是 Sprint 计划时
- **Issue 不承载文档内容**：只写摘要 + docs 链接，真相源在 `docs/`；评论时间线是决策留痕处
- 验收 checklist 写在 Issue 描述末尾（Sprint 计划时生成），逐条注明 E2E/VRT 用例名
- 大活拆子 Issue：拆分发生在 /milestone 的拆分裁决（agent 依据父方案出建议、用户裁决边界）；子 Issue 打 `status/待开发` 直继承父方案（DoR），随入选挂上本 Milestone；原 Issue 打 `epic` 留作线索不关闭不挂 Milestone，全部子 Issue 关闭后收口
- 临时杂活（线上 bug 等）不经 backlog，插队直进当前 Milestone
- **Issue 先行无例外**：任何产生 git 变更的任务开工前 Issue 必须已存在（含线上紧急修复）；agent 接到任务动手前自查有无关联 Issue，无则按 /issue 步骤 1 语义当场建单（gitea-mcp 优先；gitea-mcp 不可用时经 Gitea REST API + 当前 agent 工具的 gitea 凭证配置兜底，工具特定获取路径不在本 skill 展开）；纯读侧任务（调研/答疑/读码）豁免。本条纪律的 agent 侧载体是 `shw-issue-gate` skill

## 3. 关联纪律（全链可溯的咬合点）

- **docs PR 描述写 `Refs #N`**——PRD/原型/技术方案的每次变更反向出现在 Issue 时间线
- **代码 PR 描述写 `Closes #N`**——合并自动关单
- **Issue : 分支 : PR = 1:1:1**：分支名 `feat/12-short-desc` / `bug/34-fix-timeout`，编号对齐 Issue（无例外，线上紧急修复也先建 Issue 再开 `hotfix/<N>-<slug>`）；**一切 PR 目标 = dev**（分支从 dev 切、基点三禁令与放行流程见 `shw-gitea-repo` §1）；分支检出在 issue worktree 内——主目录只做 dev 基座，强制口径见 `shw-worktree`；唯一例外：hotfix 从 main 切、PR 目标 main，合并后 cherry-pick 回 dev
- 开启仓库的"合并后自动删除分支"（无权限时提示用户在仓库设置开）

## 4. label 约定

| label | 语义 |
|---|---|
| `backlog` | 已接收、待排期（需求池态）；过滤条件 `is:open label:backlog` |
| `status/方案中` / `status/待开发` / `status/开发中` / `status/待评审` | 生命周期状态（见 §1；完成态 = closed 不加 label） |
| `feat` / `bug` / `chore` / `retro` / `epic` | 工作项类型 |
| 优先级 label（按项目自定义） | 排期参考 |

**Project 看板不建**：状态语义全部由 label 承载（可过滤、可 API 操作、跨工具一致）；Web UI 的 Project 看板属个人视图偏好，想用可自建，不是流程设施的一部分。

## 5. Milestone（= Sprint）

- 名字 `sprint-N` 或主题名；截止日期默认两周
- 挂 Milestone 发生在 Sprint 计划时（/milestone 挑选入选即挂）；"待开发 → 开发中"（apply 领单）只流转状态 label
- Sprint Review = 核对 Milestone 完成度 + Demo；未完成项滚入下个 Milestone
- **关闭闸 = 线上验证通过，不是 tag 打完即关**：Milestone 全部 Issue 关闭 + 终审 🔴 清零后走 `/release` 放行（dev→main 放行 PR → 用户合并 → main 打 tag 发布）——放行动作管到打 tag 为止；之后**线上验证通过（Sprint Review 核对时确认）才关闭 Milestone**
- **放行期回灌路径**：放行后线上测出问题 → 新建 bug Issue 挂**同一 Milestone** → 修复走日常链（change 族/微活链按规模分流）合 dev → 再次 `/release` 放行 → 再验证；验证干净才进关闭。Milestone 开着 = 下个 Milestone 不开，与 dev 单 Milestone 纪律天然串行闭环
- **PR 合并执行权（按模式与目标分支分档）**：日常交互模式 = **用户人工验收后合并**，合并动作发生在归档环节——change 族在 /archive（核对 CI 全绿 → 用户确认 → 合并），微活链在 /wrap（用户发 wrap 指令即验收授权：提 PR → 盯 CI → 全绿自动合并 → 回写）；roadmap/goal 编排模式由编排层 agent 在 CI 全绿后**自动合并**（shw-gitea-ci 绝对禁令的编排模式例外，无人值守循环的前提，goal objective 判据已含验收）；目标是 **main** 的 PR（dev→main 放行、hotfix）——**永远仅用户**，agent 只建不合

## 6. 微活 / 小活 / 大活分层

三层分流的单一真源（其他文件只引用不复述）。判定权在用户（PO 决策，agent 不替判）；**边界模糊保守缺省走小活**（change 族）——微活链是 token 优化不是绕过 change 族的捷径。

- **微活**（单文件单点修改、不碰逻辑结构——改文案/调样式/换参数/一行修复）：执行走微活链 /do → /wrap，两条命令跑完，不进 change 族
- **小活**（三五句话能说清的实现，含小逻辑、可跨文件但边界清晰）：Issue 里补三五句话，执行走 change 族完整链（explore 差距调查 → propose 固化 → test-draft/test-review 测试起稿审查 → apply → archive），无需 docs；`status/开发中` 在 apply 领单时打
- **大活**（跨多天/动表结构/定新契约）：文档三件套由 prd/proto/arch 命令族承接（各 draft→review，审查即修正、无独立修正命令），三阶段 docs PR 齐备（/arch-draft 合入）后才进"待开发"；排期拆分走 /milestone，测试起稿审查走 test 族，执行驱动走 /roadmap；执行期发现要再拆 → 拆子 Issue（用户裁决）

## 7. 操作注意事项

- 经 gitea-mcp 一切操作走 API，不留本地状态文件
- PR 合并纪律：feature 分支 CI 全绿可合并，执行主体见 §5 "PR 合并执行权"（按目标分支分档）；受保护分支（dev/main/test）按仓库规则，目标 main 被拦等用户
- 完成后流程动作（挪列、关单、删分支）由 agent 顺手完成——流程纪律不靠人肉维持

## 8. 与 shw-gitea-ci 的分工

本 skill 管**流程设施与状态流转**（Issue/label/Milestone/PR 关联）；`shw-gitea-ci` 管 **CI 操作与合并质量**（查 run、重试、盯门禁、受保护分支合并）；`shw-gitea-repo` 管**仓库工程规范**（分支设计模型 + PR 门禁 workflow 定义）。日常常一起用：apply 提 PR 后先 ci 盯绿、再回 flow 流转状态；分支与门禁问题找 repo。
