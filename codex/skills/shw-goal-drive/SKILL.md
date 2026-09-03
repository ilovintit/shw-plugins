---
name: shw-goal-drive
description: 用所用 agent 工具的原生 goal/任务循环跑完一个 Milestone 的编排打法：goal objective 指向 Milestone 完成（判据 = 全部 Issue 关闭 + 各 PR CI 全绿 + checklist 全勾），逐 Issue 走 change 族（explore → propose → apply → archive），apply 提 PR 后由编排层等 CI 红绿循环到绿、合并进 dev（agent 可合 dev 永不合 main，dev→main 放行永远用户）；独立取证、不采信子 agent 汇报。用户要用 goal/目标模式跑 Milestone、问大任务怎么编排时加载。
---

# 用原生 goal 跑完一个 Milestone（编排打法）

## 0. 前置（第一节必执行：先确认 Milestone 就绪）

本 skill 是"编排打法手册"，组合两样东西：**Milestone**（`/milestone` 产出的计划：装着已排期 Issue，各 Issue 有验收 checklist）与**原生 goal**（所用 agent 工具的 goal/任务循环能力）。与 `/roadmap` 的关系：roadmap 是交互模式的手动执行驱动，本 skill 是 goal 模式的同构打法——驱动从手动变自动，纪律完全一致。

**加载本 skill 后第一件事就是确认就绪**——不许跳过、不许凭记忆假设：

| 检查项 | 不满足时的动作 |
|---|---|
| Milestone 存在且有 open Issue（经 gitea-mcp 读） | 先走 `/milestone` 排期 |
| 测试用例已起草并过 `/test-review` 放行 | 先走 test 族（/test-draft → /test-review） |
| 里程碑常驻/permanent worktree 已建/可建（宿主原生 permanent worktree 或 fallback `../<repo>-milestone`，强制无判定例外，见 shw-worktree） | 先建常驻 worktree 再进循环，整个逐 Issue 循环在内进行 |

**goal objective 写法 = 一句话模板**（照抄替换 `<名>`，不要自行改写措辞、不要省略完成判据）：

```
以 Gitea Milestone <名> 的完成为判据（全部 Issue 关闭 + 各 PR CI 全绿 + 验收 checklist 全勾）：逐 Issue 走 change 族（/explore 差距调查 → /propose 同会话固化 → /apply 实现提 PR → 编排层等 CI 红绿循环到绿后合并进 dev → /archive 回写），每个 Issue 合并后亲自核对状态与 CI 再进下一个
```

把这段文本填入所用 agent 工具的 goal 功能的目标设定处（各工具入口不同，按你所用工具的 goal 设置方式粘贴）。

## 1. 逐 Issue 循环：四步纪律

主 agent（goal 会话中的编排者）按固定循环推进。**分层铁律：主 agent 持进度判断与完成核对，子 agent 一个 Issue 一个——只有主 agent 有跨 Issue 的全局视野。**

每轮的形状：核对该 Issue 状态 → explore+propose（同会话）→ apply+等 CI+合并 → archive+记轨迹 → 进下一个。**全程在里程碑常驻/permanent worktree 内进行**（宿主原生 permanent worktree 或 fallback `../<repo>-milestone`，逐 Issue 换分支接力；主目录只做 dev 基座，插入的小活/hotfix 各开临时 worktree——见 shw-worktree）。四步纪律如下，编号即执行顺序：

1. **核状态**：经 gitea-mcp 读 Milestone 的 open Issue，选定下一个（独立任务组可并行推进）——**主 agent 亲自读**，不凭上轮记忆、不采信子 agent 汇报
2. **explore → propose（同会话）**：`/explore <N>` 差距调查（Issue × docs 方案 × 代码现状）→ 紧跟 `/propose` 固化三件套——探索结论不落盘，两步必须同会话衔接
3. **apply → 等 CI → 合并**：`/apply` 实现提 PR（测试用例已由 test 族起稿并审过，apply 做转绿）；**编排层盯 CI run**——绿则合并**进 dev**（编排模式 agent 可自动合 dev，无人值守循环的前提；agent 永不合 main），红则读日志（shw-gitea-ci）修复再推，循环到绿；合并后 `/archive` 回写轨迹
4. **记轨迹**：Issue 合并关闭后，过程性细节按 shw-work-journal 落 `docs/journal/issue-N.md`——然后回到第 1 步核对下一个

执行中发现 Issue 要拆/方案要改：**停下向用户陈述**，拆分边界与方案变更都是用户决策域，agent 不擅自拆改。

**完成判定（单判据）**：全部 Issue closed + 各 PR CI 全绿 + checklist 全勾，且每项经主 agent 亲自核对（Issue 状态、CI run 链接、checklist 勾选）。不以"轮次做够了"或"评论够多了"为判据。goal 完成、目检项（若有）汇总移交用户后，提示用户运行 `/review`（双模型对抗终审，范围带上本 Milestone）——终审 🔴 清零出放行结论后，走 `/release` 放行（建 dev→main 放行 PR 描述列 Milestone 内 Issue 清单，交用户确认合并），main 合并后打 tag 发布——**线上验证通过后才关 Milestone**（Sprint Review 核对时确认，口径见 shw-gitea-flow §5）；skill 不自动终审、不合 main，发布决策是用户确认域。

## 2. 验证纪律

完成判定的取证是整个打法可信度的来源，四条硬纪律：

1. **独立取证，不采信转述**：主 agent 判断每个 Issue 状态自己查——Issue 状态自己读、CI run 链接自己看、checklist 勾选自己核；子 agent 汇报只能当线索，"全部完成，CI 全绿"不算数，自己验过才算
2. **宣布必须出示证据**：宣布任何 Issue 达成/整个 Milestone 完成必须附证据（Issue closed 截图性描述 / CI run 链接 / checklist 位置），**禁止裸判**
3. **CI 红绿是硬门**：每个 PR 必须真实全绿才合并；红 → 修复 → 重推 → 再看，循环到绿——不为赶进度跳过或"先合再说"
4. **轨迹可追溯**：每轮判断与证据落 Issue 评论/轨迹记录，保持可回溯

## 3. 边界与退化

**分层边界**：goal 编排是**外层**，change 族执行是**内层小循环**且对外层零感知——change 族命令文件不含编排读写逻辑，交互模式单独跑 change 族（小活直通）与本体系完全一致。外层与内层的耦合点只有：选定 Issue、等 CI、记轨迹。

**无原生 goal 循环时的退化**：退化为**手动多轮对话**——用户每轮说"继续"，agent 每轮按四步纪律走一个 Issue 并汇报状态与证据（等价于手动跑 /roadmap）；objective 模板作为整个会话的任务书贴在对话里即可。
