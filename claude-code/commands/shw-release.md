---
description: 选择已通过集成的 main 提交和制品正式发布，不重复测试。
argument-hint: [版本 / main commit]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-release-flow`。核对版本、已通过的集成记录、main commit、人工验收范围、制品digest与发布权限。按项目tag或审批方式发布，优先复用可证明输入一致的已验证digest。

不再创建以发布为目的的dev→main测试流程；未集成先 `/shw-integrate`。不将dev SHA冒充merge后的main SHA，不另设tag测试，不因main已合入就自动部署生产。发布后读取真实部署/制品证据，缺权限或证据如实报告。
