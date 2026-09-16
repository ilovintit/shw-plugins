---
description: 在生产使用与观察完成、阻断问题清零后关闭 Version/Milestone，并记录发布、部署、反馈和遗留结论。
argument-hint: <Version 或 Milestone>
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-acceptance`、`shw-release-flow`、`shw-gitea-flow` 和 `shw-verify`。本命令吸收独立生产验收入口，关闭是用户的产品判断，不是 Agent 根据时间自动推断。

1. 核验 Milestone 全部承诺 Issue、release PR、main commit、tag、发布 CI与适用的部署/分发证据；API/E2E/VRT 不作为关闭前置或例外债务。产品形态按 `shw-release-flow`。
2. 收集生产关键流程、真实使用反馈、错误率/日志/告警、必要观察期和回滚状态。
3. 检查所有 found-in 本版本的 Bug：P0/P1 或验收阻断未清零时不得关闭；非阻断项必须有下一 Version/Issue 归属。生产验证通过不能改写历史 CI 结果。
4. 向用户呈现关闭摘要与风险，取得对不可变版本“最终人工验收通过，可以关闭版本”的明确确认；发布或健康状态不能代替。
5. 更新 Milestone 描述，记录发布、部署、最终验收和遗留 Issue。已维护基线则记录 baseline ID/PR；未维护则记录独立基线 Issue、范围与当前未受保护状态，不伪称已有保护。然后关闭 Milestone。

不得重新打开历史版本承载后来发现的问题；关闭后发现的问题由 `/shw-bug` 进入当前维护 Version、下一 Version 或 Hotfix。
