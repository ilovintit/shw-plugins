---
name: product
description: "Codex prompt workflow for product、/product. 新建或更新唯一的产品级 PRD 当前真相，收敛目标用户、价值、范围、业务规则、主流程和验收结果。 Use only when the user explicitly asks for this named workflow."
---

# product

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `product`、`/product` 或要求执行该工作流时按下方原文执行。

## Issue 工作区管理

文件修改前加载 shw-worktree，使用插件的 worktree MCP acquire 取得独立编号分支与绝对路径。当前会话全程执行，所有文件/命令明确指向返回路径；不为隔离工作区自动 fork 或调用 Handoff。保存本次 claim_id，暂停用 release，交付完成后按 Skill 调用 remove；查询和恢复使用 inspect/list/reconcile。
这是插件提供的协作工具，不拦截 shell/文件操作，也不改变 Codex 的任务环境绑定。用户明确选择的外部工作区不自动接管或删除。

**参数**：[产品定义 Issue 或变更说明]

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-product-docs`、`shw-gitea-flow`、`shw-docs-review` 和 `shw-worktree`。

1. 关联本次产品定义 Issue；没有就先创建。产品文档变更不得无 Issue 开工。
2. 读取完整代码现实、现有 `docs/prd/product.md`、原型索引和架构入口，先找出本次变化影响的主流程。
3. 与用户收敛目标用户、问题、目标、非目标、范围、角色权限、业务规则、正常/异常流程、数据口径和可验证验收标准。
4. 只维护一份 `docs/prd/product.md` 作为当前产品真相；规模大时章节可链接附录，但不得按客户端或版本复制多份竞争 PRD。
5. 写回当前有效形态，不写已废弃方案；重要裁决与被否方案留在 Issue/Journal。
6. 与同一产品变更 Issue 的原型、架构共用一个 worktree/分支/PR；若只改 PRD，也仍经 docs review 和 PR 进入 dev。

PRD 不规定代码细节，但必须让 `/prototype`、`/architecture`、`/version` 可以据此作确定性判断。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
