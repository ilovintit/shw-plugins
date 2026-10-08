---
name: shw-test-spec
description: dev→main 集成测试与候选基线规则，保护未预期改变的行为。
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

# 测试与基线

自动测试仅在 dev→main 集成流程运行。普通 Issue→dev、dev体验部署之前不运行测试，也不以 lint、类型或冒烟变相设门槛。必要构建部署可执行；tag/审批发布不另跑测试。

执行前必须读取 `shw-integration` 及其 `references/candidate.md`，再读 [执行与覆盖](references/execution.md)。测试环境不得污染共享开发或生产数据。

适用单元/协议/安全检查和 API/E2E/VRT 在冻结候选中执行；后者保护未预期改变的行为。默认比较全部适用既有基线，定向诊断标为 partial，不能冒充完整放行。

只有分类为已验收预期变化的差异才能更新对应断言/候选基线，范围绑定本集成 PR。无旧基线须场景正常执行且候选已人工验收，才建立初始候选并重跑。通过后随合并晋升，禁止直接覆盖正式基线。并发基线、目标分支或候选变化使旧结果失效。

工具链/内部依赖见 references/ci-config.md、ci-cache.md、ci-images.md 及版本化镜像 JSON；这些是执行配置，不迁出到不可验证的知识库。恢复与漂移见 [历史与恢复](references/history-sync.md)。
