---
description: 实现一个 Issue，同步规格并交付实际体验；快速检查随交付执行，全量回归后续集成。
argument-hint: <Issue 编号>
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

输入必须是一个Issue。读取 `shw-delivery`，依次完成范围/依赖确认、工作区所有权、实现与同变更文档、自审、必要构建、PR和开发部署、体验交接及事实回写。

开发阶段必须执行类型检查、适用 lint/静态检查及本次改动涉及的单元与单模块 API 快速测试；全量 E2E、VRT、全量 API 等长周期回归集中到 dev→main 集成。必要构建、部署正常执行，tag 不新增测试阶段；检查通过不能代替人工验收。

多个 Issue 转 `/shw-roadmap`；发现已有匹配 PR 先复用，不重复派工。后续集成走 `/shw-integrate`。
