---
name: work
description: "Codex prompt workflow for work、/work. 实现一个 Issue，同步规格并交付实际体验；快速检查随交付执行，全量回归后续集成。 Use only when the user explicitly asks for this named workflow."
---

执行前读取 [cloud-runtime.md](cloud-runtime.md)，按实际工具与工作区提供者执行。

# work

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `work`、`/work` 或要求执行该工作流时按下方原文执行。

文件变更前必须读取 shw-workspace，核对任务所有权和工作区能力；独立 worktree 插件为可选能力，不可用时不得绕过占用检查。

**参数**：<Issue 编号>

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

输入必须是一个Issue。读取 `shw-delivery`，依次完成范围/依赖确认、工作区所有权、实现与同变更文档、自审、必要构建、PR和开发部署、体验交接及事实回写。

开发阶段必须执行类型检查、适用 lint/静态检查及本次改动涉及的单元与单模块 API 快速测试；全量 E2E、VRT、全量 API 等长周期回归集中到 dev→main 集成。必要构建、部署正常执行，tag 不新增测试阶段；检查通过不能代替人工验收。

多个 Issue 转 `/roadmap`；发现已有匹配 PR 先复用，不重复派工。后续集成走 `/integrate`。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
