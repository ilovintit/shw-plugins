---
name: test-plan
description: "Codex prompt workflow for test-plan、/test-plan. 为一个 Version/Milestone 建立验收标准与自动化、人工测试的双向映射，确认发布和生产观察口径。 Use only when the user explicitly asks for this named workflow."
---

# test-plan

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `test-plan`、`/test-plan` 或要求执行该工作流时按下方原文执行。

**参数**：<Version 或 Milestone>

执行前加载 `shw-version-planning`、`shw-acceptance` 和 `shw-gitea-flow`。

1. 读取 Milestone、全部 Issue checklist、PRD、原型状态和架构测试策略。
2. 为每条验收标准标识测试层：单元、集成、API、E2E、VRT、安全、性能或人工验收，并给出稳定用例名。
3. 双向核对：每条验收标准都有测试；每个测试都能回指需求，不夹带未裁决需求。
4. 区分 PR CI、dev 人工整体验收、生产冒烟和观察指标；写清测试数据、环境前置、失败回流与允许豁免。
5. 用户确认人工验收与豁免后，把映射写回 Milestone/Issue；自动化测试代码由对应 `/work` 在实现前写入同一 Issue 分支。
6. 存在阻断缺口时回 `/split` 或产品定义，不允许带着含糊判据启动 `/roadmap`。

本命令定义测试口径，不在本地运行测试；真实红绿以 PR CI 为准。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
