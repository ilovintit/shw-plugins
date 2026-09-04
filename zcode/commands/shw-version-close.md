---
description: 在生产使用与观察完成、阻断问题清零后关闭 Version/Milestone，并记录发布、部署、反馈和遗留结论。
argument-hint: <Version 或 Milestone>
---

执行前加载 `shw-acceptance`、`shw-release-flow`、`shw-gitea-flow` 和 `shw-verify`。本命令吸收独立生产验收入口，关闭是用户的产品判断，不是 Agent 根据时间自动推断。

1. 核验 Milestone 全部承诺 Issue、release PR、main commit、tag、发布 CI和部署证据。
2. 收集生产关键流程、真实使用反馈、错误率/日志/告警、必要观察期和回滚状态。
3. 检查所有 found-in 本版本的 Bug：P0/P1 或验收阻断未清零时不得关闭；非阻断项必须有下一 Version 归属和用户裁决。
4. 向用户呈现关闭摘要与仍存在的风险，取得明确“生产验证通过，可以关闭版本”的确认。
5. 更新 Milestone 描述，记录发布、部署、生产验证、遗留 Issue 和最终日期，然后关闭 Milestone。

不得重新打开历史版本承载后来发现的问题；关闭后发现的问题由 `/shw-bug` 进入当前维护 Version、下一 Version 或 Hotfix。
