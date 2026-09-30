---
name: split
description: "Codex prompt workflow for split、/split. 将小版本按可体验结果拆成交付 Issue，建立依赖、优先级和逐功能反馈检查点。 Use only when the user explicitly asks for this named workflow."
---

# split

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `split`、`/split` 或要求执行该工作流时按下方原文执行。

**参数**：<Version 或 Milestone>

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-version-planning` 和 `shw-gitea-flow`。

1. 读取 Milestone、已确认 PRD、当前必要技术方案和实际实现，不从技术目录机械拆任务。
2. 每个 Issue 对应一个可体验或可验证的用户结果，贯通所需前端、接口与数据；说明范围、非目标、依赖、风险和人工 AC。开发环境未就绪时先规划最小运行链路。
3. 为当前及紧接着的交付项补齐入口、角色/数据、步骤、预期与适用工程检查；后续细节随迭代补齐，不以全版本详细测试计划阻止首项开发。
4. 用户决定边界、优先级和范围；已授权的小步方案由 Agent 直接落实，仅对新增的真实产品裁决提问。
5. 所有 Issue 挂入当前 Milestone，建立稳定依赖顺序及体验检查点。每个可体验功能完成后先接收用户反馈，再从最新 dev 推进下一项；非体验维护项不单独制造界面验收。
6. 将无法独立体验的过大项继续拆分；不把数据库、API、前端拆成无法独立交付的孤岛。反馈修改已合入功能时建立关联的小修正 Issue，历史 Issue 保持原交付事实。

本命令负责规划；单项实现交 `/work`，按反馈逐步推进版本交 `/roadmap`。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
