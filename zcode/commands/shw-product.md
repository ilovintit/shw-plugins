---
description: 维护够用的当前 PRD 与待实现范围，直接进入可体验实现。
argument-hint: [需求或反馈]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-product-docs`。从已确认目标、当前实现和反馈增量更新产品规格，写范围、非目标、业务规则、权限/状态和可体验AC。当前规格与待实现方案分开；无需独立原型或终审。

必要技术决策转 `/shw-architecture`，当前切片规划后按 `/shw-work` 实现。业务变更与代码同Issue/PR更新PRD，不能只在评论记需求。
