---
name: baseline
description: "Codex prompt workflow for baseline、/baseline. 按明确请求维护独立 test 候选的测试基线，不阻挡发布。 Use only when the user explicitly asks for this named workflow."
---

# baseline

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `baseline`、`/baseline` 或要求执行该工作流时按下方原文执行。

**参数**：<test commit> [已确认差异范围]

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-test-spec` 及 references/execution.md。关联用户本次基线请求、test固定提交与确认的预期行为，不要求dev→main集成PR。

仅更新有依据的预期变化范围，保留来源和历史；禁止全量接受快照、删除断言掩盖问题。未请求执行时不自动跑测试；没有基线不阻挡正常发布，维护结果不自动晋升main或发布。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
