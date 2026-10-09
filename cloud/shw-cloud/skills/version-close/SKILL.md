---
name: version-close
description: "Codex prompt workflow for version-close、/version-close. 核对版本交付和发布证据后关闭状态，不新增测试或基线阶段。 Use only when the user explicitly asks for this named workflow."
---

执行前读取 [cloud-runtime.md](cloud-runtime.md)，按实际工具与工作区提供者执行。

# version-close

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `version-close`、`/version-close` 或要求执行该工作流时按下方原文执行。

**参数**：<版本>

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-verify` 和 `shw-acceptance`。核对计划Issue、当前规格、人工验收范围、集成通过记录、实际main commit、tag/审批、制品与部署证据以及明确遗留项。

按项目授权关闭Milestone/版本并回读。未验收或未验证范围明确列出；关闭不冒充安装/宿主实测。基线已在集成PR随通过合并晋升，不在版本关闭后独立生成，不追加tag/关闭测试。后续缺陷使用关联修复Issue。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
