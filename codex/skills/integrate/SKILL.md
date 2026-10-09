---
name: integrate
description: "Codex prompt workflow for integrate、/integrate. 每日或小批次将已验收 dev 候选集成到 main，执行长周期全量回归阶段。 Use only when the user explicitly asks for this named workflow."
---

# integrate

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `integrate`、`/integrate` 或要求执行该工作流时按下方原文执行。

**参数**：[版本或已验收 Issue 范围]

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-integration` 及其 references/candidate.md。确认已验收Issue/commit/制品范围，冻结dev SHA、main基点、预合并结果与基线revision，复用/建立集成PR。

按候选契约执行测试、分类差异、局部更新候选基线并重跑；目标/基线漂移重新计算检查。满足当前授权后正常merge commit，核验实际main结果及制品映射。合入main不等于正式发布；tag/审批另走 `/release`。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
