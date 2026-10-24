---
name: version-close
description: "Codex prompt workflow for version-close、/version-close. 核对版本交付和发布证据后关闭状态，不新增测试或基线阶段。 Use only when the user explicitly asks for this named workflow."
---

# version-close

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `version-close`、`/version-close` 或要求执行该工作流时按下方原文执行。

**参数**：<版本>

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-verify`、`shw-acceptance` 和 `shw-gitea-flow`。交付子 Issue 应在 PR 合入模式目标分支时关闭，不保留到版本关闭、正式发布或人工验收；当前授权范围内仍因等待验收打开的已交付工单，核对合并与范围后补关并回读。版本收口另行核对计划 Issue、当前规格、人工验收范围、正常集成与构建来源记录、实际 main commit、tag/审批、制品与部署证据以及明确遗留项。

按项目授权关闭Milestone/版本并回读。未验收或未验证范围明确列出；关闭不冒充安装/宿主实测。测试基线仅在独立test任务按明确请求维护，不作为版本关闭/生产发布前置，不追加测试或冒烟。后续实际缺陷优先新建关联修复 Issue，也可重新打开原 Issue 记录新问题并用新 PR 修正；不为可能的反馈预留打开的交付工单。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
