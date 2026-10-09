---
name: roadmap
description: "Codex prompt workflow for roadmap、/roadmap. 按依赖推进当前版本的可体验 Issue，复用单 Issue 交付核心。 Use only when the user explicitly asks for this named workflow."
---

执行前读取 [cloud-runtime.md](cloud-runtime.md)，按实际工具与工作区提供者执行。

# roadmap

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `roadmap`、`/roadmap` 或要求执行该工作流时按下方原文执行。

文件变更前必须读取 shw-workspace，核对任务所有权和工作区能力；独立 worktree 插件为可选能力，不可用时不得绕过占用检查。

**参数**：<版本>

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-version-planning` 和 `shw-delivery`。检查已有Issue状态、PR和占用，再按依赖顺序推进，默认串行且一个Issue一个分支/PR。不要重复派工；Issue内独立任务在明确授权后可按 `shw-issue-parallel` 委派。

每个切片代码与规格同变更，提供真实体验入口并记录反馈。连续开发授权不代表人工验收通过。已验收范围可每日/小批次集成，版本完成不是自动发布授权。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
