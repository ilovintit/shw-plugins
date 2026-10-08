---
name: shw-verify
description: 证据契约：区分未执行、构建、体验、集成和发布，结论只覆盖已取证范围。
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

# 证据契约

每个结论给出对象、精确 revision/SHA、动作、结果、可访问日志/工件/引用及未覆盖范围。未运行不是通过；partial 不是全量；工具调用成功不是业务成功。

- Issue：diff审查、同变更规格、必要构建、部署来源及人工体验状态；没有体验前测试。
- 集成：dev SHA、main base、预合并 tree、PR HEAD、验收范围、基线 revision、所有适用检查与差异处置。
- 合并：实际 main merge commit和tree、父提交与冻结候选关系；dev SHA不等于main SHA。
- 发布：已通过集成提交、tag/审批、对应制品 digest、部署 revision；不另跑 tag 测试。

读真实日志/状态而不是推断；敏感值只保留安全引用。漂移、缺失证据、失败、权限阻塞分别说明。不因赶进度删断言、伪造检查或扩大授权。
