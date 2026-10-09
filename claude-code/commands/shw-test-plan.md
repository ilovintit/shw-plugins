---
description: 记录实际体验步骤和未来集成覆盖；区分快速检查与集成全量回归。
argument-hint: <版本或 Issue>
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-acceptance` 和 `shw-version-planning`。为当前切片列角色、入口、受控数据、起止状态、人工操作与预期结果，关联AC/PRD。另列集成阶段自动断言覆盖，不能把计划写成执行通过。

开发阶段必须执行类型检查、适用 lint/静态检查及本次改动涉及的单元与单模块 API 快速测试；全量 E2E、VRT、全量 API 等长周期回归集中到 dev→main 集成。必要构建、部署正常执行，tag 不新增测试阶段；检查通过不能代替人工验收。
