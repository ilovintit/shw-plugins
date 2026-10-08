---
description: 实现一个 Issue，同步规格并交付实际体验；自动测试仅后续集成。
argument-hint: <Issue 编号>
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

输入必须是一个Issue。读取 `shw-delivery`，依次完成范围/依赖确认、工作区所有权、实现与同变更文档、自审、必要构建、PR和开发部署、体验交接及事实回写。

不执行体验前测试、lint、类型检查或冒烟；检查脚本依赖不能暗中执行。多个Issue转 `/shw-roadmap`；发现已有匹配PR先复用，不重复派工。工程交付不是人工验收，下一阶段集成走 `/shw-integrate`。
