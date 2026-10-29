---
description: 按授权发布 main 提交和可追溯制品，不执行或等待测试、冒烟。
argument-hint: [版本 / main commit]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-release-flow`。核对版本、集成来源、main commit、构建制品digest与发布权限；按项目tag或审批方式发布，保留源码与部署映射。

发布依赖链不执行测试/冒烟，也不要求test分支或测试基线通过。`issue-dev` / `managed` 尚需 dev→main 集成时，先按 `shw-integration` 准备 PR、完成必要检查，并按合并执行人契约默认交用户手动合并；发布、继续或 CI 通过不覆盖人工边界，合并被拒不能换工具代做。`issue-main` 按自身 Issue→main 授权处理，不引入 dev 阶段。合并后回读实际 main 来源，继续已有发布授权；所需 PR 未实际 merged 不打生产 tag。其他 PR 合并被拒按 `shw-gitea-flow/references/merge-authority.md` 持续排查门禁并推进，不因拒绝本身停工。部署后读取实际状态，不发业务冒烟请求，不把构建/部署成功说成测试通过。

用户输入：$ARGUMENTS
