---
name: shw-gitea-ci
description: 读取真实 CI 与精确提交证据，构建/发布与用户主动的 test 分支测试独立。
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

# CI 取证

接入/迁移先读 [项目模板](references/project-template.md)；访问方式见 [配置](config.md)。构建输入和内部依赖规范按 `shw-test-spec/references/ci-config.md` 与 `ci-cache.md`。

测试与开发、集成、发布、部署解耦：单元、API、E2E、VRT、回归及冒烟均仅在用户明确要求后，于独立 `test` 分支的固定提交执行。普通 push/PR/tag/部署和推送 test 分支本身不触发测试；未测试不阻挡已授权发布。必要构建/编译、静态与配置检查、来源核对正常执行，不得借“检查”名义运行测试；构建成功不代表测试或人工验收通过。

读取真实 run/job/日志与工件，区分排队、运行、失败、取消、跳过、过期与通过。汇总绿不代表缺失的 required job 成功。网络失败或工具结果未知先回读，不重复触发变更。

失败按日志定位根因；构建/部署失败与测试失败分开；测试重跑限明确授权的独立test任务，不能因发布自动触发。不得删断言、放宽门禁、全量接受快照、只为旧测试绿而回滚正确行为。

取证包括 run URL、job结果、精确候选、实际构建制品digest；仅测试任务另记基线revision与coverage。当前HEAD或目标基点漂移后旧成功不能放行。只有必要时读失败日志，避免把凭据和业务数据复制到报告。

## PR 工作流来源与正常合并

核对服务端版本、实际事件、工作流来源 revision 与 checkout revision，不能仅因补丁尚未进入 dev 就断言 PR 执行旧流程。Gitea 1.27.3 的普通 `pull_request` 取 head 工作流，`pull_request_target` 取 base 工作流（[固定版本源码](https://github.com/go-gitea/gitea/blob/v1.27.3/services/actions/notifier_helper.go#L107-L264)）；仍须以当前 run 事件和来源核实，其他版本重新确认。工作流来源不等于被检出的代码提交；带凭据的 target 事件不能因此执行不可信 head 代码。

当前 PR 候选的实际检查满足已知要求、审批与合并在授权内时，使用正常合并入口继续。无法读取全部分支保护细节本身不是一律停工理由；服务端明确拒绝、已知审批不足、必需检查失败/缺失才报告具体阻塞。不 force/admin 绕过，不将 skipped 当 passed。合并前回读 HEAD 与最新检查，成功后核对合并提交和对应部署；历史成功不替代当前提交。
