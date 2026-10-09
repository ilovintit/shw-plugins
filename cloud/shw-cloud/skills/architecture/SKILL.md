---
name: architecture
description: "Codex prompt workflow for architecture、/architecture. 定义当前切片够用的技术边界，随实现同变更维护。 Use only when the user explicitly asks for this named workflow."
---

执行前读取 [cloud-runtime.md](cloud-runtime.md)，按实际工具与工作区提供者执行。

# architecture

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `architecture`、`/architecture` 或要求执行该工作流时按下方原文执行。

文件变更前必须读取 shw-workspace，核对任务所有权和工作区能力；独立 worktree 插件为可选能力，不可用时不得绕过占用检查。

**参数**：[当前技术范围]

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-product-docs`、`shw-design-review` 和实际栈规范。基于当前PRD/代码明确接口、数据、权限、模块依赖、部署及必要风险处理；不预先设计全产品或建立独立原型阶段。

当前实现与方案分开，接口/数据/架构变化与代码同Issue/PR交付。项目环境和宿主配置外置可访问项目文档；未确认的目标、包名、API和权限不猜测。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
