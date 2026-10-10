---
description: 规划一个可体验小版本，并区分每日集成与正式发布。
argument-hint: [版本范围]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-version-planning`。复用当前Milestone，写目标、非目标、验收范围和依赖；按当前切片增量维护。分工用 `/shw-split`，体验步骤用 `/shw-test-plan`。

版本计划不要求先完成全部文档、原型或自动测试。已授权范围每日/小批次走 `/shw-integrate`，正式发布单独 `/shw-release`。
