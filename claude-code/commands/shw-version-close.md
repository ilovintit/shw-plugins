---
description: 核对版本交付和发布证据后关闭状态，不新增测试或基线阶段。
argument-hint: <版本>
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-verify` 和 `shw-acceptance`。核对计划Issue、当前规格、人工验收范围、正常集成与构建来源记录、实际main commit、tag/审批、制品与部署证据以及明确遗留项。

按项目授权关闭Milestone/版本并回读。未验收或未验证范围明确列出；关闭不冒充安装/宿主实测。测试基线仅在独立test任务按明确请求维护，不作为版本关闭/生产发布前置，不追加测试或冒烟。后续缺陷使用关联修复Issue。
