---
name: baseline
description: "Codex prompt workflow for baseline、/baseline. 在当前集成 PR 内维护有验收依据的候选基线，合并通过后晋升。 Use only when the user explicitly asks for this named workflow."
---

# baseline

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `baseline`、`/baseline` 或要求执行该工作流时按下方原文执行。

**参数**：<集成 PR> [已验收差异范围]

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-integration/references/candidate.md`、`shw-test-spec` 和 references/execution.md。必须关联当前dev→main集成PR、冻结候选与人工验收范围；不是独立dev回归或最终发布后的基线维护入口。

只处理已验收预期变化对应的断言/候选基线。无旧基线先正常执行场景且确认候选已人工验收，再建立候选并复跑。不能全量接受快照、删除断言掩盖回归或直接写正式基线。候选/目标/基线漂移重算，成功合并且结果一致才晋升。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
