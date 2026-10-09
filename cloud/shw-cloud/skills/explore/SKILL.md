---
name: explore
description: "Codex prompt workflow for explore、/explore. 只读调查代码、需求与证据，不创建变更或自动接管仓库。 Use only when the user explicitly asks for this named workflow."
---

执行前读取 [cloud-runtime.md](cloud-runtime.md)，按实际工具与工作区提供者执行。

# explore

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `explore`、`/explore` 或要求执行该工作流时按下方原文执行。

**参数**：[调查问题]

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

识别目标仓库和范围，读取必要代码/文档/状态，回答事实、可复现证据、未知项和建议。不读取凭据、auth或sessions，不修改配置/文件，不执行部署或自动测试。

无Git/无SHW模式仍可完成明确授权的只读调查。若需要实现，先确定Issue/工作区及写入授权再转交付流程。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
