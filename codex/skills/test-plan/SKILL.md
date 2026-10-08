---
name: test-plan
description: "Codex prompt workflow for test-plan、/test-plan. 记录实际体验步骤和未来集成覆盖；不执行体验前测试。 Use only when the user explicitly asks for this named workflow."
---

# test-plan

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `test-plan`、`/test-plan` 或要求执行该工作流时按下方原文执行。

**参数**：<版本或 Issue>

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-acceptance` 和 `shw-version-planning`。为当前切片列角色、入口、受控数据、起止状态、人工操作与预期结果，关联AC/PRD。另列集成阶段自动断言覆盖，不能把计划写成执行通过。

初版无独立原型阶段。体验前不运行任何测试、lint、类型检查或冒烟；自动测试仅dev→main集成，tag不另测。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
