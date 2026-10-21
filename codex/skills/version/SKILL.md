---
name: version
description: "Codex prompt workflow for version、/version. 规划一个可体验小版本，并区分每日集成与正式发布。 Use only when the user explicitly asks for this named workflow."
---

# version

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `version`、`/version` 或要求执行该工作流时按下方原文执行。

**参数**：[版本范围]

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-version-planning`。复用当前Milestone，写目标、非目标、验收范围和依赖；按当前切片增量维护。分工用 `/split`，体验步骤用 `/test-plan`。

版本计划不要求先完成全部文档、原型或自动测试。已授权范围每日/小批次走 `/integrate`，正式发布单独 `/release`。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
