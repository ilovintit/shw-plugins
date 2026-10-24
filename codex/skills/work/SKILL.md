---
name: work
description: "Codex prompt workflow for work、/work. 实现一个 Issue，主动评估并优先使用子智能体，同步规格并交付实际体验；构建与来源核对随交付执行，测试独立按需运行。 Use only when the user explicitly asks for this named workflow."
---

# work

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `work`、`/work` 或要求执行该工作流时按下方原文执行。

文件变更前必须读取 shw-workspace，核对任务所有权和工作区能力；独立 worktree 插件为可选能力，不可用时不得绕过占用检查。

**参数**：<Issue 编号>

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

输入必须是一个Issue。读取 `shw-delivery`，依次完成范围/依赖确认、工作区所有权、实现与同变更文档、自审、必要构建、PR 合入模式目标分支后立即关闭 Issue 并回读、已授权开发部署跟进、体验交接及事实回写。`issue-dev` / `managed` 合入 dev 即关单，`issue-main` 合入 main 即关单；未验收独立记录，不等待用户反馈或版本发布。

开发开始、任务拆分和进入审查时，必须读取 `shw-subagent-dispatch`，主动评估并优先使用子智能体推进可独立的调查、实现、文档或审查；有合适任务且宿主允许时实际派发，无需用户逐次提醒或再次授权。简单任务直接完成，依赖任务串行，写入文件所有权互斥，具体按 `shw-delivery` 和 `shw-issue-parallel` 执行。

测试与开发、集成、发布、部署解耦：单元、API、E2E、VRT、回归及冒烟均仅在用户明确要求后，于独立 `test` 分支的固定提交执行。普通 push/PR/tag/部署和推送 test 分支本身不触发测试；未测试不阻挡已授权发布。必要构建/编译、静态与配置检查、来源核对正常执行，不得借“检查”名义运行测试；构建成功不代表测试或人工验收通过。

多个 Issue 转 `/roadmap`；发现当前范围匹配且未合并的 PR 先复用，不重复派工。重开原单后的修正使用新分支/PR。后续集成走 `/integrate`。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
