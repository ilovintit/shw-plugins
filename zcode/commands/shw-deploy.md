---
description: 按授权部署必要制品并只读取证，核对来源与部署结果，不自动执行测试或冒烟。
argument-hint: [dev / test / production] [commit 或 digest]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-release-flow/references/environments.md`、`shw-k8s-observer` 和 `shw-acceptance`。确认目标环境、精确源码/制品、既有部署入口和授权。项目只维护声明，由既有CI/Fleet执行；不直接写集群或改用户配置。

测试与开发、集成、发布、部署解耦：单元、API、E2E、VRT、回归及冒烟均仅在用户明确要求后，于独立 `test` 分支的固定提交执行。普通 push/PR/tag/部署和推送 test 分支本身不触发测试；未测试不阻挡已授权发布。必要构建/编译、静态与配置检查、来源核对正常执行，不得借“检查”名义运行测试；构建成功不代表测试或人工验收通过。

生产仅选择已通过集成提交/制品，经 tag 或审批发布。读取 Fleet/工作负载、声明 revision 与 digest，提供实际体验入口和缺失证据；状态读取不冒充自动测试或用户验收。
