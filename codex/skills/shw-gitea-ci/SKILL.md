---
name: shw-gitea-ci
description: 读取真实 CI 与精确提交证据，业务自动测试仅 dev→main 集成执行。
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

# CI 取证

接入/迁移先读 [项目模板](references/project-template.md)；访问方式见 [配置](config.md)。构建输入和内部依赖规范按 `shw-test-spec/references/ci-config.md` 与 `ci-cache.md`。

先识别事件、source SHA、target/base SHA、PR HEAD、workflow版本和实际 job，再判断允许执行的阶段。普通 Issue→dev/dev体验部署不运行任何测试、lint、类型或冒烟；必要构建部署可以执行。dev→main 执行 `shw-integration` 的自动测试与差异处置。tag/审批发布不重跑测试。

读取真实 run/job/日志与工件，区分排队、运行、失败、取消、跳过、过期与通过。汇总绿不代表缺失的 required job 成功。网络失败或工具结果未知先回读，不重复触发变更。

失败按日志定位根因；集成环境故障修复重跑，行为差异按候选规则分类。不得删断言、放宽门禁、全量接受快照、只为旧测试绿而回滚正确行为。

取证包括 run URL、job结果、精确候选、基线 revision、coverage及制品digest。当前HEAD或目标基点漂移后旧成功不能放行。只有必要时读失败日志，避免把凭据和业务数据复制到报告。
