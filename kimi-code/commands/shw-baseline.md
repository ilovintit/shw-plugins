---
description: 按明确请求维护独立 test 候选的测试基线，不阻挡发布。
argument-hint: <test commit> [已确认差异范围]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-test-spec` 及 references/execution.md。关联用户本次基线请求、test固定提交与确认的预期行为，不要求dev→main集成PR。

仅更新有依据的预期变化范围，保留来源和历史；禁止全量接受快照、删除断言掩盖问题。未请求执行时不自动跑测试；没有基线不阻挡正常发布，维护结果不自动晋升main或发布。
