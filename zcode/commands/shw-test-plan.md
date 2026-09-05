---
description: 为一个 Version/Milestone 建立验收标准与自动化、人工测试的双向映射，确认发布和生产观察口径。
argument-hint: <Version 或 Milestone>
---

执行前加载 `shw-version-planning`、`shw-acceptance` 和 `shw-gitea-flow`。

1. 读取 Milestone、全部 Issue checklist、PRD、原型状态和架构测试策略。
2. 为每条验收标准标识测试层：单元、集成、API、E2E、VRT、安全、性能或人工验收，并给出稳定用例名。
3. 双向核对：每条验收标准都有测试；每个测试都能回指需求，不夹带未裁决需求。
4. 区分 PR CI、dev 人工整体验收、生产冒烟和观察指标；写清测试数据、环境前置、失败回流与允许豁免。
5. 用户确认人工验收与豁免后，把映射写回 Milestone/Issue；自动化测试代码由对应 `/shw-work` 在实现前写入同一 Issue 分支。
6. 存在阻断缺口时回 `/shw-split` 或产品定义，不允许带着含糊判据启动 `/shw-roadmap`。

本命令定义测试口径，不在本地运行测试；真实红绿以 PR CI 为准。
