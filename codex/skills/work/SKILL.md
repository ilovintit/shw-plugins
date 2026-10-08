---
name: work
description: "Codex prompt workflow for work、/work. 实现一个 Issue，同步规格并交付实际体验；自动测试仅后续集成。 Use only when the user explicitly asks for this named workflow."
---

# work

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `work`、`/work` 或要求执行该工作流时按下方原文执行。

文件变更前必须读取 shw-workspace，核对任务所有权和工作区能力；独立 worktree 插件为可选能力，不可用时不得绕过占用检查。

**参数**：<Issue 编号>

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

输入必须是一个Issue。读取 `shw-delivery`，依次完成范围/依赖确认、工作区所有权、实现与同变更文档、自审、必要构建、PR和开发部署、体验交接及事实回写。

不执行体验前测试、lint、类型检查或冒烟；检查脚本依赖不能暗中执行。多个Issue转 `/roadmap`；发现已有匹配PR先复用，不重复派工。工程交付不是人工验收，下一阶段集成走 `/integrate`。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
