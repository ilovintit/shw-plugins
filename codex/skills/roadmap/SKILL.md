---
name: roadmap
description: "Codex prompt workflow for roadmap、/roadmap. 按依赖顺序连续交付一个 Version/Milestone 的多个 Issue；一次只推进一个 Issue，直到版本开发范围全部进入 dev。 Use only when the user explicitly asks for this named workflow."
---

# roadmap

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `roadmap`、`/roadmap` 或要求执行该工作流时按下方原文执行。

**参数**：<Version 或 Milestone>

版本级执行编排器。执行前加载 `shw-version-planning`、`shw-delivery`、`shw-gitea-flow`、`shw-gitea-ci`、`shw-worktree` 和 `shw-verify`。

## 前置条件

- Version/Milestone 已存在并由 `/version` 定义范围；
- `/split` 已生成边界清晰的 Issue；
- `/test-plan` 已完成验收标准与测试映射；
- 仍有需要用户裁决的范围、依赖或验收问题时不得开工。

## 执行

1. 读取 Milestone、全部 open/closed Issue、依赖、PR 和 CI，建立拓扑顺序。
2. 使用版本常驻 worktree，但每个 Issue 仍建立编号对应的独立分支和 PR。
3. **严格串行**：一次只选择一个所有依赖均已进入 dev 的 Issue；调用与 `/work` 同源的 `shw-delivery` 流程完成它。
4. PR CI 失败时读取真实日志并修复到绿；目标 dev 的 PR 全绿后合并、关闭 Issue，再从最新 dev 开始下一项。
5. 发现范围变化、拆分错误、外部阻塞或需要产品裁决时暂停并交给用户，不擅自改 Version。
6. 循环直到 Milestone 内全部交付 Issue closed、相关 PR 已进入 dev、CI 证据齐全。

## 完成边界

本命令只表示“版本开发范围已全部进入 dev”，不会发布、部署或关闭 Milestone。后续由用户完成 dev 人工验收，再运行 `/release`。

禁止并行推进多个 Issue，禁止分支互相 merge，禁止自动合并 main。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
