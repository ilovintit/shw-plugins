---
name: release
description: "Codex prompt workflow for release、/release. 统一版本发布入口——核验 dev 候选与人工验收，创建 dev→main PR；用户 Web UI 合并后续跑以打 tag 并验证发布流水线。 Use only when the user explicitly asks for this named workflow."
---

# release

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `release`、`/release` 或要求执行该工作流时按下方原文执行。

**参数**：<Version 或 Milestone>

执行前加载 `shw-release-flow`、`shw-acceptance`、`shw-gitea-flow`、`shw-gitea-ci` 和 `shw-verify`。本命令吸收旧 release prepare/approve 和独立终审入口，但不取得 main 合并权。

## 可恢复的两阶段流程

### 阶段 A：放行 PR

1. 核验 Version/Milestone 范围、全部 Issue/PR、CI、迁移、已知问题、回滚方案和文档同步情况。
2. 收集用户已经完成 dev 整体验收的事实与证据；未验收或失败时停止，失败项经 `/bug` 回流。
3. 对上一发布 tag..dev 执行发布前对抗审查；阻断项清零，非阻断项有明确处置。
4. 创建唯一 dev→main 放行 PR，正文列出版本范围、Issue、镜像/迁移、风险、回滚和验收证据。
5. 停止并明确提示用户在 Gitea Web UI 审查和手动合并。Agent 不调用 main 合并 API。

### 阶段 B：合并后发布

用户合并后再次运行同一命令：

1. 验证 PR 确已合并，main HEAD 与批准的候选 commit 对齐；不采信口头状态。
2. 在 main 合并提交创建并推送版本 tag；若 token 无 tag 权限，输出精确人工操作而不伪造完成。
3. 跟踪发布 CI，分别核验源 tag、CI job、Harbor/发布制品等证据。
4. 输出发布事实并指向 `/deploy`；不把 tag 或镜像存在等同于生产部署完成。

## 权限底线

main 在任何模式下都只能由用户合并；不得请求为 Agent Token 增加 main 合并权限，也不得用 push、force 或变更保护规则绕过。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
