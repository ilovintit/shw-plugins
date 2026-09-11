---
name: version-close
description: "Codex prompt workflow for version-close、/version-close. 在生产使用与观察完成、阻断问题清零后关闭 Version/Milestone，并记录发布、部署、反馈和遗留结论。 Use only when the user explicitly asks for this named workflow."
---

# version-close

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `version-close`、`/version-close` 或要求执行该工作流时按下方原文执行。

**参数**：<Version 或 Milestone>

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-acceptance`、`shw-release-flow`、`shw-gitea-flow` 和 `shw-verify`。本命令吸收独立生产验收入口，关闭是用户的产品判断，不是 Agent 根据时间自动推断。

1. 核验 Milestone 全部承诺 Issue、release PR、main commit、tag、发布 CI与适用的部署/分发证据；发布 PR 若由用户在全量自动化失败、未完成或测试滞后时例外合并，必须保留实际状态、用户决定、人工验证依据、风险/回滚及未修测试的后续 Issue。产品形态按 `shw-release-flow`；插件/库/CLI 用真实安装升级与使用验收，不索取不存在的 Fleet 证据。
2. 收集生产关键流程、真实使用反馈、错误率/日志/告警、必要观察期和回滚状态。
3. 检查所有 found-in 本版本的 Bug：P0/P1 或验收阻断未清零时不得关闭；非阻断项及自动化例外留下的测试债务必须有下一 Version/Issue 归属和用户裁决。生产验证通过不能改写历史 CI 结果。
4. 向用户呈现关闭摘要与仍存在的风险，取得明确“生产验证通过，可以关闭版本”的确认。
5. 更新 Milestone 描述，记录发布、部署、生产验证、遗留 Issue 和最终日期，然后关闭 Milestone。

不得重新打开历史版本承载后来发现的问题；关闭后发现的问题由 `/bug` 进入当前维护 Version、下一 Version 或 Hotfix。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
