---
description: 按依赖推进当前版本的可体验 Issue，复用单 Issue 交付核心。
argument-hint: <版本>
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-version-planning` 和 `shw-delivery`。检查已有Issue状态、PR和占用，再按依赖顺序推进，默认串行且一个Issue一个分支/PR。不要重复派工；Issue内独立任务在明确授权后可按 `shw-issue-parallel` 委派。

每个切片代码与规格同变更，提供真实体验入口并记录反馈。连续开发授权不代表人工验收通过。已授权范围可每日/小批次集成，版本完成不是自动发布授权。
