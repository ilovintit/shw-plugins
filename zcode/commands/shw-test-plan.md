---
description: 按用户需求制定独立 test 分支测试计划，计划不等于执行授权。
argument-hint: <版本或 Issue> [测试范围]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-test-spec`，列出目标源码、test候选准备方式、角色/受控资源、范围、命令、预期行为及证据。保持与开发、集成和发布分离，不把计划作为发布前置。

仅当用户明确要求实际运行，才在test分支固定提交后手动执行；不因创建计划、push/PR/tag或发布自动启动测试。

测试状态按提交SHA而非分支隔离：test候选必须是独立的test-only提交，不能是dev/main当前可达的提交。准备候选时保留选定源码SHA和tree，可以用相同源码tree生成仅供test的快照提交；保护已有test历史，不强推或重置。手动入口刷新dev/main引用并拒绝会把测试状态写到开发/发布提交上的候选。test快照本身不合入dev/main，修复走普通Issue分支；运行报告同时记录test SHA与原始来源。
