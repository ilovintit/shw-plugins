---
name: test-plan
description: "Codex prompt workflow for test-plan、/test-plan. 按当前可体验功能整理人工步骤和反馈方式，随小版本迭代补齐验收映射。 Use only when the user explicitly asks for this named workflow."
---

# test-plan

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `test-plan`、`/test-plan` 或要求执行该工作流时按下方原文执行。

**参数**：<Version 或 Milestone>

**项目外只读**：仅可修改当前项目已确认的工作目录；完整边界见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-test-spec`、`shw-version-planning`、`shw-acceptance` 和 `shw-gitea-flow`。

1. 读取 Milestone、当前及已交付 Issue 的 AC、PRD、相关技术方案和真实开发入口。
2. 先为当前功能记录入口、角色/数据、步骤、预期、必要前置/重置方式和证据位置，反向引用 AC/PRD；后续功能随交付增量补齐。
3. 单列适用工程构建、静态、单元、协议、安全和性能检查；不把自动化回归候选或全版本计划完备性设为当前开发前置。
4. 明确逐功能体验→反馈修正→继续开发的循环。版本收敛时复核当前候选的跨功能旅程及受改动影响的已确认范围，不机械重复全部历史体验。
5. 保留用户 main 合并、发布后最终人工验收与生产观察；最终验收后才由 `/baseline` 固化明确确认的范围。
6. 写回 Milestone/Issue。Agent 可在交付当前功能时维护此映射，不要求用户另行调用本命令；当前 AC 含糊才回需求或拆分裁决。

可以记录未来 API/E2E/VRT 保护候选，本命令不运行测试、不生成基线，也不创建独立的测试实现大 Issue。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
