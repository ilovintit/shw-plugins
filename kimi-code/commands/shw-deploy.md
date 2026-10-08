---
description: 按授权部署必要制品并只读取证，不运行体验前或发布阶段测试。
argument-hint: [dev / test / production] [commit 或 digest]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-release-flow/references/environments.md`、`shw-k8s-observer` 和 `shw-acceptance`。确认目标环境、精确源码/制品、既有部署入口和授权。项目只维护声明，由既有CI/Fleet执行；不直接写集群或改用户配置。

开发体验允许必要构建部署；自动测试、lint、类型检查、冒烟不得作为体验前置。生产仅选择已通过集成提交/制品，经tag或审批发布。读取Fleet/工作负载、声明revision与digest，给实际体验入口和缺失证据；状态读取不冒充自动测试或用户验收。
