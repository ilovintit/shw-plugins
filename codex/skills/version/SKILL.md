---
name: version
description: "Codex prompt workflow for version、/version. 从当前产品真相选择一个可独立发布的版本范围，确认目标、非目标、质量门槛并创建 Gitea Milestone。 Use only when the user explicitly asks for this named workflow."
---

# version

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `version`、`/version` 或要求执行该工作流时按下方原文执行。

**参数**：<版本号或版本主题>

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-version-planning`、`shw-product-docs` 和 `shw-gitea-flow`。

1. 核验产品基线已经 `/product-review` 放行并进入 dev。
2. 从产品真相选择本版本用户价值、范围、明确非目标、依赖、风险、迁移、上线/回滚和完成判据。
3. 由用户裁决版本边界；Agent 负责指出范围膨胀、不可独立发布和隐藏依赖。
4. 创建或更新唯一 Gitea Milestone，描述中记录产品基线 commit、目标、非目标、发布门槛和状态 checklist。
5. 不在此时创建含糊的大 Issue；Issue 拆分统一交 `/split`。

Version/Milestone 在生产验证完成前保持 open；tag 产生不等于版本完成。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
