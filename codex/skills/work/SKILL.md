---
name: work
description: "Codex prompt workflow for work、/work. 完成一个且仅一个 Issue——调查、计划、测试、实现、自审、PR、CI、合入 dev 与轨迹回写全链路。 Use only when the user explicitly asks for this named workflow."
---

# work

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `work`、`/work` 或要求执行该工作流时按下方原文执行。

**参数**：<Issue 编号>

单 Issue 交付入口。执行前加载 `shw-delivery`、`shw-gitea-flow`、`shw-worktree`、`shw-tdd`、`shw-pr-review`、`shw-gitea-ci` 和 `shw-verify`。

## 硬边界

- 输入必须解析为一个 Issue；多个 Issue 或 Version/Milestone 必须转 `/roadmap`。
- Issue 必须有明确范围、非目标、依赖和可验证 checklist；缺失时先补齐并取得必要裁决。
- 一个 Issue 对应一个分支、一个 worktree、一个 PR；分支从最新 dev 创建。

## 执行

1. 读取完整 Issue/评论、产品文档、依赖 Issue、相关代码和历史 PR，确认依赖已进入 dev。
2. 在会话内完成差距调查和具体计划；计划不是新的用户命令，也不创建 `.changes/` 或 `specs/` 真相源。
3. 先按 `/test-plan` 的映射写自动化测试并做断言自审，再实现最小改动；本地只做构建/类型检查，测试红绿交给 PR CI。
4. 按任务边界实现、同步必要文档，运行 `shw-pr-review` 收敛验收、架构、安全和回归问题。
5. 提交并推送，创建目标 dev 的 PR，正文使用 `Closes #N`，列出 checklist 与验证证据。
6. 等待真实 CI；失败时读 job 日志、定位根因、修复并重复，直到所需 checks 全绿。
7. CI 全绿后合并目标 dev 的 PR、确认 Issue 已关闭、删除分支并清理 worktree；不得自动合并 main。
8. 回写实现摘要、PR、CI、关键决策和遗留项；没有证据不得声称完成。

如果执行中发现必须改变产品范围、公开契约或 Version 边界，暂停交给用户，不能在单 Issue 内暗中扩张。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
