---
name: integrate
description: "Codex prompt workflow for integrate、/integrate. 将已授权 dev 范围正常合入 main，不自动测试。 Use only when the user explicitly asks for this named workflow."
---

# integrate

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `integrate`、`/integrate` 或要求执行该工作流时按下方原文执行。

**参数**：[版本或 Issue 范围]

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-integration` 及 references/candidate.md。固定dev SHA、main基点与候选tree，审查差异、完成必要构建及来源核对。满足当前授权和实际非测试合并要求后正常merge，核验main结果及制品对应关系。

不要求先通过test或人工验收，不触发/等待测试、冒烟或基线晋升。未测试与未体验如实记录；合入main不等于已获生产发布授权，正式发布另走 `/release`。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
