---
name: shw-goal-drive
description: 用所用 agent 工具的原生 goal/任务循环能力执行 roadmap 的编排打法：goal objective 指向 .roadmaps/<name>/ 的 roadmap.md + verify.md 双文件，逐 change 推进（每个走 propose→apply→archive），每轮对照 verify.md 逐条验证，红灯不跳、全 pass 才算完成。用户要用 goal/目标模式执行 roadmap、以多 change 编排跑大任务、问 roadmap 清单怎么推进时加载。
---

# 用原生 goal 执行 roadmap（多 change 编排打法）

## 0. 前置（第一节必执行：先判定双文件是否就绪，再往下）

本 skill 是"编排打法手册"，组合三样东西：**roadmap**（`.roadmaps/<name>/roadmap.md`，有序 change 清单 + 验收目标）、**verify.md**（`.roadmaps/<name>/verify.md`，每轮迭代的条目判断对象）、**原生 goal**（所用 agent 工具的 goal/任务循环能力，每轮自动校验驱动迭代）。

背景先明示一句：原生 goal 的验证是模型自判，判据含糊会放水——verify.md 条目就是每轮迭代的明确对照物。所以 objective 必须引用双文件路径与完成判据，不引用则每轮校验没有对照物，goal 循环会退化为"感觉差不多了就宣布完成"。

**加载本 skill 后第一件事就是确认双文件就绪**——不许跳过、不许凭记忆假设"roadmap 应该已经生成"：

```bash
# <name> 为 roadmap 名（.roadmaps/ 下的目录名），未知时列出后问用户
ls .roadmaps/ 2>/dev/null
test -f .roadmaps/<name>/roadmap.md && echo "roadmap 就绪" || echo "roadmap 缺失"
test -f .roadmaps/<name>/verify.md && echo "verify 就绪" || echo "verify 缺失"
```

| 判定结果 | 动作 |
|---|---|
| 双文件都在 | 按下方模板设定 goal objective，进入第 1 节编排循环 |
| roadmap.md 缺失（还没做探索拆解） | 先走 `/shw-roadmap-explore` 生成 roadmap，完成后再回本节 |
| verify.md 缺失（验收目标还没转写成条目） | 先走 `/shw-roadmap-verify` 定稿 verify.md，完成后再回本节 |

**goal objective 写法 = 一句话模板**（照抄替换 `<name>`，不要自行改写措辞、不要省略完成判据）：

```
按 .roadmaps/<name>/roadmap.md 的清单逐个完成全部 change（每个走 propose→apply→archive），
每轮迭代读取 .roadmaps/<name>/verify.md 逐条验证，全部条目 pass（user-confirm 项除外）才算完成；
有 fail 条目时优先修复其所属 change
```

把这段文本填入所用 agent 工具的 goal 功能的目标设定处（各工具入口不同，按你所用工具的 goal 设置方式粘贴）。

## 1. 编排循环：六步纪律

主 agent（goal 会话中的编排者）按固定循环推进。**分层铁律：主 agent 持 roadmap 编排（选 change / 派子 agent / 更新状态），子 agent 一个 change 一个；整体验证归主 agent——只有它有跨 change 的全局视野。**

每轮迭代的形状：选一个 change → 交付 → 回写状态 → 对照 verify.md 全量验证 → 有红灯先修红灯 → 没红灯进下一轮。六步纪律如下，编号即执行顺序：

1. **选 change**：读 roadmap.md 清单状态，选第一个非 `done-archived` 的 change
2. **小循环**：该 change 走完整 propose → apply → archive 小循环；实现工作可派子 agent——**一个子 agent 负责一个 change 的完整交付**（不按 propose/apply 拆段派发，交付责任整体归一个子 agent）
3. **回写状态**：change 归档后立即回写 roadmap.md 清单状态为 `done-archived`——roadmap 状态由本会话主 agent 维护，change 命令不管这事
4. **逐条验证**：每轮迭代对照 verify.md 逐条判断 pass / fail / pending / user-confirm，并更新 verify.md 顶部状态表
5. **红灯回修**：存在 fail 条目时：定位其所属 change，开修复 change 回修（或重开原 change）——**不跳过红灯继续新 change**；修复归档后重验该条目为 pass 才继续推进
6. **完成判定**：全部条目 pass（user-confirm 除外）goal 才算完成；user-confirm 条目汇总移交用户

红灯回修示例：第 3 轮验证发现"编辑回显"条目 fail（属于 change-2，已归档）→ 开一个修复 change（或重开 change-2）处理该条目 → 修复归档后重验该条目 → pass 才回到第 1 步继续下一个 change。

## 2. 验证纪律

第 4 步的逐条判断是整个打法可信度的来源，两条硬纪律：

1. **独立取证，不采信转述**：verifier（每轮迭代的验证判定者，即主 agent 自己）判断时读实际代码 / 实际发请求独立取证——**不采信实现者（子 agent）的汇报转述**。子 agent 说"CRUD 全部完成，测试全绿"不算数，verifier 自己验：自动证据条目自己执行条目中写的命令并比对期望结果，交互证据条目自己发请求看响应，观察证据条目读代码到检查点。汇报只能当线索，不能当结论
2. **user-confirm 不越界**：user-confirm 条目（视觉 / 体验类）到代码级检查点确认后标 user-confirm 状态列入移交清单，**不得自行标 pass**——这类结论只有用户能下；goal 完成时把移交清单汇总交给用户逐条确认

verify.md 是文档条目，不是脚本——验证动作是 agent 逐条执行 / 观察后把状态写回状态表，不要试图把它转成自动化验证程序。

## 3. 边界与退化

**分层边界**：roadmap/goal 编排是**外层**，change 流程（propose/apply/archive）是**内层小循环**且对 roadmap 零感知——change 命令文件不含 roadmap 读写逻辑，在无 roadmap 的项目里跑 change 流程与本体系存在前完全一致。外层与内层唯一的耦合点是主 agent 的第 3 步回写（读 roadmap、写 roadmap 都发生在编排层，change 小循环内部不碰这两个文件）。

**无原生 goal 循环时的退化**：所用 agent 工具若无原生 goal 循环，退化为**手动多轮对话 + 每轮结束时按 verify.md 自验**——用户每轮说"继续"，agent 每轮按六步纪律走一遍并汇报 verify.md 状态表。纪律不变，只是驱动从自动变手动；objective 模板同样有效，作为整个会话的任务书贴在对话里即可。
