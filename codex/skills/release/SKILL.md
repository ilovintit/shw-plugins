---
name: release
description: "Codex prompt workflow for release、/release. 按授权发布 main 提交和可追溯制品，不执行或等待测试、冒烟。 Use only when the user explicitly asks for this named workflow."
---

# release

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `release`、`/release` 或要求执行该工作流时按下方原文执行。

**参数**：[版本 / main commit]

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-release-flow`。核对版本、集成来源、main commit、构建制品digest与发布权限；按项目tag或审批方式发布，保留源码与部署映射。

发布依赖链不执行测试/冒烟，也不要求test分支或测试基线通过。未集成先按项目分支路由正常合并，不借测试政策绕过权限或分支保护。部署后读取实际状态，不发业务冒烟请求，不把构建/部署成功说成测试通过。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
