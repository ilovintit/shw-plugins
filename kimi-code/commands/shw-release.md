---
description: 统一版本发布入口——核验 dev 候选与人工验收，创建 dev→main PR；用户 Web UI 合并后续跑以打 tag 并验证发布流水线。
argument-hint: <Version 或 Milestone>
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-release-flow`、`shw-acceptance`、`shw-gitea-flow`、`shw-gitea-ci` 和 `shw-verify`。本命令吸收旧 release prepare/approve 和独立终审入口，但不取得 main 合并权。

## 可恢复的两阶段流程

### 阶段 A：放行 PR

1. 核验 Version/Milestone 范围、全部 Issue/PR、CI、迁移、已知问题、回滚方案和文档同步情况。
2. 收集用户已经完成 dev 整体验收的事实与证据；未验收或失败时停止，失败项经 `/shw-bug` 回流。
3. 按 `shw-release-flow` 确定已有发布或 first-release 基准，对固定候选完整差异在**本机**分别以 GLM-5.3 与 Kimi-K3 执行两路独立对抗审查；实施者 GPT 不得单独充当审查结论。宿主 Agent工具自行通过其 provider/profile 和本地调度机制完成两路审查，不进入 CI、不建设仓库 runner、也不提交本机凭证或 profile。按 shw-release-flow 核对本次两路运行时 model/provider 身份与候选关联；profile 名或正文自称不构成证据。两份报告都必须保留；全部阻断项清零、非阻断项有明确处置后才能继续。
4. 创建唯一 dev→main 放行 PR，正文列出版本范围、Issue、镜像/迁移、风险、回滚和验收证据。
5. 停止并明确提示用户在 Gitea Web UI 审查和手动合并。Agent 不调用 main 合并 API。

### 阶段 B：合并后发布

用户合并后再次运行同一命令：

1. 验证 PR 确已合并，main HEAD 与批准的候选 commit 对齐；不采信口头状态。
2. 在 main 合并提交创建并推送版本 tag；若 token 无 tag 权限，输出精确人工操作而不伪造完成。
3. 跟踪发布 CI，分别核验源 tag、CI job、Harbor/发布制品等证据。
4. 输出发布事实并指向 `/shw-deploy`；不把 tag 或镜像存在等同于生产部署完成。

## 权限底线

main 在任何模式下都只能由用户合并；不得请求为 Agent Token 增加 main 合并权限，也不得用 push、force 或变更保护规则绕过。

微信小程序制品使用 shw-release-flow/references/miniprogram/README.md 的插件自包含上传工具。核对本次源码、编译产物指纹、上传版本与目标AppID；SDK上传仅为代码上传，体验选择、审核和正式发布按用户授权办理，不能自动外推。
