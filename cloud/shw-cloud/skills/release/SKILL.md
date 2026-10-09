---
name: release
description: "Codex prompt workflow for release、/release. 选择已通过集成的 main 提交和制品正式发布，不重复测试。 Use only when the user explicitly asks for this named workflow."
---

执行前读取 [cloud-runtime.md](cloud-runtime.md)，按实际工具与工作区提供者执行。

# release

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `release`、`/release` 或要求执行该工作流时按下方原文执行。

**参数**：[版本 / main commit]

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-release-flow`。核对版本、已通过的集成记录、main commit、人工验收范围、制品digest与发布权限。按项目tag或审批方式发布，优先复用可证明输入一致的已验证digest。

不再创建以发布为目的的dev→main测试流程；未集成先 `/integrate`。不将dev SHA冒充merge后的main SHA，不另设tag测试，不因main已合入就自动部署生产。发布后读取真实部署/制品证据，缺权限或证据如实报告。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
