---
name: explore
description: "Codex prompt workflow for explore、/explore. 免 Issue 的纯读探索入口——调查问题、代码、产品或技术方案，给出证据与选择；决定落地后再转入正式生命周期。 Use only when the user explicitly asks for this named workflow."
---

# explore

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `explore`、`/explore` 或要求执行该工作流时按下方原文执行。

**参数**：[要探索的问题]

处理一次不产生仓库或外部状态变更的探索。它取代旧 `/shw-research`；旧 change 族的 explore 步骤已经取消，不能把本命令解释成开发前置命令。

## 执行

1. 用一句话复述问题、范围和成功判据；只有会改变结论的关键信息缺失时才提问。
2. 优先读取仓库、现有产品文档、Issue/PR/CI 与权威资料；区分已验证事实、推断和未知项。
3. 需要比较方案时给出适用条件、成本、风险和推荐，不替用户作产品范围或发布决策。
4. 输出：结论、关键证据、备选方案、风险/未知项、建议下一步。
5. 若用户决定落地：
   - 产品定义变化转 `/product`、`/prototype` 或 `/architecture`；
   - 版本范围转 `/version`；
   - 缺陷反馈转 `/bug`；
   - 已有交付 Issue 转 `/work`。

## 边界

- 不改文件、不建分支、不提交、不创建 PR、不部署。
- 默认不建 Issue；一旦要产生变更，先按 `shw-issue-gate` 建立或关联 Issue。
- 不把探索结论伪装成已经验证的实现结果。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
