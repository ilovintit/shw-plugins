---
description: 记录实际体验步骤和未来集成覆盖；不执行体验前测试。
argument-hint: <版本或 Issue>
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-acceptance` 和 `shw-version-planning`。为当前切片列角色、入口、受控数据、起止状态、人工操作与预期结果，关联AC/PRD。另列集成阶段自动断言覆盖，不能把计划写成执行通过。

初版无独立原型阶段。体验前不运行任何测试、lint、类型检查或冒烟；自动测试仅dev→main集成，tag不另测。
