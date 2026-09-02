---
name: shw-roadmap
description: "Codex prompt workflow for shw-roadmap、/shw-roadmap. Milestone 执行驱动——读取既有 Milestone（/shw-milestone 产出的计划），逐 Issue 驱动 change 族（explore → propose → apply → archive）直到全部 Issue 关闭、PR 全绿。不自建任何 Issue/Milestone Use only when the user explicitly asks for this named workflow."
---

# shw-roadmap

这是共享源码中同名 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `shw-roadmap`、`/shw-roadmap` 或要求执行该工作流时按下方原文执行。

**参数**：[Milestone 名或编号（省略时列出 open 的 Milestone 让你选）]

Milestone 的**执行驱动器**：一个 Milestone 装着已排期的 Issue（计划终点），本命令把它跑到完（执行起点）——逐 Issue 走 change 族完整小循环（explore → propose → apply → archive），编排层等 CI 红绿循环，直到 Milestone 内 Issue 全部关闭、PR 全绿。

**本命令不自建任何 Issue/Milestone**——Milestone 是 `/shw-milestone` 的产物，本命令只消费它。计划终于 milestone，执行始于 roadmap。

**输入**：可选 Milestone 名或编号。省略时经 gitea-mcp 列出 open 的 Milestone（含各完成度）让用户选。执行前加载 `shw-gitea-flow` skill；goal 模式编排打法见 `shw-goal-drive` skill（与本命令同构，驱动从手动变自动）。

---

## 步骤

### 1. 选 Milestone 与盘点

- 经 gitea-mcp 定位 Milestone，读其全部 open Issue：编号、标题、验收 checklist、关联 docs 链接、类型 label
- 测试用例前置检查：`e2e/`、`tests/vrt/` 已有经 `/shw-test-review` 放行的用例？（正常流程 milestone → test-draft → test-review → 本命令。）**无已审用例 → 提示先走 test 族**，停止——执行期的测试必须是审过的
- 输出执行计划概览（几个 Issue、建议顺序/可并行组），用户确认开工

### 2. 建常驻 worktree（强制）

执行循环开始前建/验里程碑常驻 worktree——**强制，无判定例外**（见 `shw-worktree`）：

- 不存在 → 建：宿主有 permanent worktree 用原生入口；否则 fallback `git worktree add ../<repo>-milestone -b <首个 Issue 分支> origin/dev`。已存在 → 进目录对齐（`git fetch`，按当前 Issue 切新分支）后使用
- 此后逐 Issue 的 explore → propose → apply → archive 全部小循环都在常驻 worktree 内进行；主目录只做 dev 基座（pull / 切源 / 查阅）
- 期间用户插入的小 issue / hotfix：各开临时 worktree（优先宿主原生 Worktree；fallback `../<repo>-issue-N`），与主线、主目录互不相干
- milestone 收尾（全部 Issue 关闭）后 remove 常驻 worktree（步骤 4）

### 3. 逐 Issue 执行循环

对每个 open Issue（独立任务组可并行推进，组内串行）：

1. **explore**（`/shw-explore <N>`）：差距调查——Issue 需求 × docs 方案 × 代码现状 → 差距清单 + 执行路径
2. **propose**（同会话紧跟）：固化三件套到 `.changes/<N>-<slug>/`
3. **apply**（`/shw-apply`）：测试用例已在（test 族起稿、已审）——实现让用例转绿，并行子智能体执行，提 PR（`Closes #N`）
4. **等 CI 红绿循环**：编排模式由本命令盯 CI run——绿 → 合并**进 dev**（编排模式 agent 可自动合 dev；agent 永不合 main）；红 → 读日志修复再推，循环到绿
5. **archive**（`/shw-archive`）：轨迹回写 Issue 评论、清理本地草稿
6. **记轨迹**：过程性细节按 `shw-work-journal` 落 `docs/journal/issue-N.md`；进下一个 Issue

执行中发现 Issue 要拆/方案要改：**停下问用户**——拆子 Issue 挂本 Milestone 继续（拆分边界是用户的 PO 决策）；方案层冲突走 docs 修订（draft 追加模式 + docs PR），不私改。

### 4. 完成核对与收尾

- 全部 Issue closed（`Closes #N` 自动关单）+ 各 PR CI 全绿 + checklist 全勾 → 完成核对（逐 Issue 亲自核对状态与 CI run 链接，不采信中间过程记忆）
- 清理常驻 worktree：宿主 managed/permanent worktree 按宿主生命周期与用户确认处理；fallback 从主目录 `git worktree remove ../<repo>-milestone`（milestone 全部 Issue 关闭后才清）
- 汇报：Issue 清单 × PR × CI 状态 × checklist 勾选比；未完成项及原因
- 提示下一步：`/shw-review`（双模型对抗终审，范围带上本 Milestone）→ 终审 🔴 清零后建 **dev→main 放行 PR**（列 Milestone Issue 清单，用户确认合并）→ main 打 tag 发布；Milestone 关闭（Sprint Review 口径见 shw-gitea-flow §5）

---

## 约束

- **常驻 worktree 强制**——逐 Issue 循环全程在常驻/permanent worktree 内进行，主目录只做 dev 基座；插入的小活/hotfix 各开临时 worktree（见 `shw-worktree`）
- **不自建 Issue/Milestone**——Milestone 与 Issue 都是计划层产物；执行期拆子 Issue 需用户裁决，且只挂本 Milestone
- **探索与固化同会话衔接**——explore 结论不落盘，propose 必须紧跟着跑（见 /shw-explore、/shw-propose）
- **测试输入必须已审**——测试用例来自 test 族（已过对齐审查），apply 只负责让用例转绿；无已审用例不开工
- **CI 等待是编排层职责**——apply 提 PR 即止，等绿/读日志/重推由本命令循环承担；VRT 基线更新等边界裁决不自动做，留用户
- **完成判定单判据**：全部 Issue 关闭 + 各 PR 全绿 + checklist 全勾；亲自核对，不采信子智能体汇报
