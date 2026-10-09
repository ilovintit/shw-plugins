---
name: split
description: "Codex prompt workflow for split、/split. 按可体验切片拆分 Issue，避免重复和共享契约冲突。 Use only when the user explicitly asks for this named workflow."
---

执行前读取 [cloud-runtime.md](cloud-runtime.md)，按实际工具与工作区提供者执行。

# split

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `split`、`/split` 或要求执行该工作流时按下方原文执行。

**参数**：<版本>

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-version-planning` 和已有Issue/PR/占用。每个Issue写目标、非目标、依赖、文件/资源边界、人工AC及规格链接；不按内部动作制造重复Issue。

先明确后端/前端接口和数据所有权；共享契约、迁移及依赖任务顺序可审查。当前命令不自动启动多Issue并发编排；获授权的Issue内并行按 `shw-issue-parallel`。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
