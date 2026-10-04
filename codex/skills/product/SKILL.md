---
name: product
description: "Codex prompt workflow for product、/product. 增量维护轻量产品级 PRD，确认当前需求、范围、关键业务规则和可体验结果。 Use only when the user explicitly asks for this named workflow."
---

# product

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `product`、`/product` 或要求执行该工作流时按下方原文执行。

## Issue 工作区管理

文件修改前加载 shw-worktree，使用插件的 worktree MCP acquire 取得独立编号分支与绝对路径。当前会话全程执行，所有文件/命令明确指向返回路径；不为隔离工作区自动 fork 或调用 Handoff。保存本次 claim_id，暂停用 release，交付完成后按 Skill 调用 remove；查询和恢复使用 inspect/list/reconcile。
这是插件提供的协作工具，不拦截 shell/文件操作，也不改变 Codex 的任务环境绑定。用户明确选择的外部工作区不自动接管或删除。

**参数**：[产品定义 Issue 或变更说明]

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-product-docs`、`shw-gitea-flow`、`shw-docs-review` 和 `shw-worktree`。

1. 关联本次产品变更 Issue；先搜索已有载体，没有再创建。文档与本次功能实现可使用同一 Issue/工作区/分支/PR，不为每份文档另建单。
2. 读取现有 PRD、架构入口、相关代码与已记录的用户反馈，识别本次受影响流程；复用已确认事实，不重复询问。
3. 与用户确认当前需求的目标、范围与非目标、相关角色权限、关键业务规则和可观察验收结果。仅影响未来范围的未知项留为待裁决，不阻止已明确的小功能开发。
4. 增量更新唯一 `docs/prd/product.md`，以足够支撑当前小版本开工为完成标准；不预写全部未来功能，也不要求用户先打磨页面布局、逐字段文案和全部交互细节。
5. 页面布局、间距与操作体验在实际前端中迭代；反馈改变权限、状态、数据口径或其他业务规则时，取得裁决后同步 PRD 和必要技术方案。
6. 内部运行文档一致性审查，按适用工程 CI 和 PR 规则进入 dev；保留重要裁决与被否方案于 Issue/Journal，不把未确认假设写成结论。

当前需求明确后直接进入必要技术方案与小版本开发。文档由 Agent 随用户确认结果维护，不要求独立原型或全产品文档完备。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
