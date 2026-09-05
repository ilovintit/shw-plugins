---
name: bug
description: "Codex prompt workflow for bug、/bug. 把 dev、生产或日常使用反馈整理成可复现、可验收的 Bug/Hotfix Issue，并路由到正确版本。 Use only when the user explicitly asks for this named workflow."
---

# bug

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `bug`、`/bug` 或要求执行该工作流时按下方原文执行。

**参数**：[问题描述]

执行前加载 `shw-acceptance` 和 `shw-gitea-flow`。

1. 收集发现环境、版本/tag、时间、入口/角色、前置条件、复现步骤、预期、实际、频率、影响和可用证据；不得把猜测原因写成事实。
2. 先搜索重复 Issue；命中则补充证据，不重复建单。
3. 判定反馈类型：
   - 已承诺行为失效：Bug；
   - 新增能力或改变规则：产品需求，先回 `/product`；
   - 生产 P0/P1：Hotfix，关联当前尚未关闭的 Version；
   - 非阻断生产问题：进入下一维护 Version，不阻止当前版本关闭，除非用户裁决阻断。
4. 创建 Issue，写完整复现、严重度、环境、found-in/fixed-in、验收 checklist、日志/截图链接及关联产品条款。
5. 需要立即修复时提示 `/work <Issue>`；本命令本身不实现代码。

Hotfix 仍然 Issue 先行；从 main 切分支、PR 目标 main、用户 Web UI 合并，随后必须同步回 dev。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
