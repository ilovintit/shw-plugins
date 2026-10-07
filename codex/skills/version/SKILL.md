---
name: version
description: "Codex prompt workflow for version、/version. 从已确认需求选择一个可体验的小版本，记录范围、反馈检查点和发布门槛。 Use only when the user explicitly asks for this named workflow."
---

# version

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `version`、`/version` 或要求执行该工作流时按下方原文执行。

**参数**：<版本号或版本主题>

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-version-planning`、`shw-product-docs` 和 `shw-gitea-flow`。

1. 核对当前需求已写入 PRD，现有技术边界可支撑本次开发；必要方案可随功能 PR 增量补齐，不要求独立综合审查放行或全产品文档先全部进入 dev。
2. 优先选择一个可完整体验的用户目标作为小版本范围，明确非目标、依赖、必要迁移与发布/回滚条件。
3. 用户决定版本范围；已有明确授权直接复用，只有真实范围冲突或未决业务才询问，避免再次要求用户逐条确认已有决定。
4. 创建或更新唯一 Gitea Milestone，记录当前 PRD/技术文档引用及 commit、范围、逐功能体验反馈、dev 候选确认、发布与最终验收 checklist。
5. 按可体验结果通过 `/split` 拆分；首版开发环境未打通时列为先行交付项。Agent 可在已授权的开发请求内完成规划和验收映射，不要求用户依次调用每个命令。

Milestone 记录本次范围，开发中可按用户裁决更新；进入 dev 或产生 tag 不等于生产版本完成。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
