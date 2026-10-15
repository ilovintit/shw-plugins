---
name: shw-version-planning
description: 按可体验切片规划小版本与依赖；集成和发布分别计划。
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

# 小版本规划

读取当前 PRD/必要技术方案、未完成 Issue 与已有用户反馈。规划当前可体验切片，写目标、非目标、依赖、人工 AC、入口/角色数据和风险；不要求全产品文档或原型先完成。

先复用已有 Issue/Milestone，避免重复派工。任务粒度让 Go 后端和 Vue/Vite/shw-ui 前端有明确契约与所有权。roadmap 默认按依赖串行；并行需符合 `shw-issue-parallel`，不在本次默认扩展跨 Issue 调度能力。

体验计划记录用户怎么判断结果，可在生产发布后进行；可另列按需test测试范围，但计划不构成执行请求或发布门禁。集成按 `shw-integration` 汇总已授权范围，正式发布另走tag/审批；未体验如实记录。
