---
description: 按授权部署必要制品并只读取证，核验开发快速检查，不重复发布阶段测试。
argument-hint: [dev / test / production] [commit 或 digest]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-release-flow/references/environments.md`、`shw-k8s-observer` 和 `shw-acceptance`。确认目标环境、精确源码/制品、既有部署入口和授权。项目只维护声明，由既有CI/Fleet执行；不直接写集群或改用户配置。

开发阶段必须执行类型检查、适用 lint/静态检查及本次改动涉及的单元与单模块 API 快速测试；全量 E2E、VRT、全量 API 等长周期回归集中到 dev→main 集成。必要构建、部署正常执行，tag 不新增测试阶段；检查通过不能代替人工验收。

生产仅选择已通过集成提交/制品，经 tag 或审批发布。读取 Fleet/工作负载、声明 revision 与 digest，提供实际体验入口和缺失证据；状态读取不冒充自动测试或用户验收。
