---
name: deploy
description: "Codex prompt workflow for deploy、/deploy. 按授权部署必要制品并只读取证，不运行体验前或发布阶段测试。 Use only when the user explicitly asks for this named workflow."
---

# deploy

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `deploy`、`/deploy` 或要求执行该工作流时按下方原文执行。

**参数**：[dev / test / production] [commit 或 digest]

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-release-flow/references/environments.md`、`shw-k8s-observer` 和 `shw-acceptance`。确认目标环境、精确源码/制品、既有部署入口和授权。项目只维护声明，由既有CI/Fleet执行；不直接写集群或改用户配置。

开发体验允许必要构建部署；自动测试、lint、类型检查、冒烟不得作为体验前置。生产仅选择已通过集成提交/制品，经tag或审批发布。读取Fleet/工作负载、声明revision与digest，给实际体验入口和缺失证据；状态读取不冒充自动测试或用户验收。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
