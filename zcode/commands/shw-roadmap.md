---
description: 按依赖推进当前版本的可体验 Issue，复用单 Issue 交付核心。
argument-hint: <版本>
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-version-planning` 和 `shw-delivery`。检查已有Issue状态、PR和占用，再按依赖顺序推进，默认串行且一个Issue一个分支/PR。不要重复派工；每个 Issue 开始、拆分和审查时，按 `shw-delivery` 主动评估并优先使用子智能体推进 Issue 内独立任务，无需用户逐次提醒；遵守宿主限制、依赖串行和 `shw-issue-parallel` 的文件所有权要求，不自动扩展跨 Issue 并发。

每个切片代码与规格同变更，提供真实体验入口并记录反馈。连续开发授权不代表人工验收通过。已授权范围可每日/小批次集成，版本完成不是自动发布授权。
