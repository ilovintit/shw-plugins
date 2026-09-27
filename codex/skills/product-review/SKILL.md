---
name: product-review
description: "Codex prompt workflow for product-review、/product-review. 综合审查并修正 PRD、各端原型与整体架构，消除三者冲突后形成可用于版本规划的产品基线。 Use only when the user explicitly asks for this named workflow."
---

# product-review

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `product-review`、`/product-review` 或要求执行该工作流时按下方原文执行。

## Issue 工作区管理

文件修改前加载 shw-worktree，使用插件的 worktree MCP acquire 取得独立编号分支与绝对路径。当前会话全程执行，所有文件/命令明确指向返回路径；不为隔离工作区自动 fork 或调用 Handoff。保存本次 claim_id，暂停用 release，交付完成后按 Skill 调用 remove；查询和恢复使用 inspect/list/reconcile。
这是插件提供的协作工具，不拦截 shell/文件操作，也不改变 Codex 的任务环境绑定。用户明确选择的外部工作区不自动接管或删除。

**参数**：[产品定义 Issue]

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-product-docs`、`shw-docs-review`、`shw-design-review` 和 `shw-verify`。

1. 读取产品定义 Issue、`docs/prd/product.md`、完整HTML原型索引及所有入口、原型派生的可选 `ui-design.md` 实现映射、架构入口及所有子文档。
2. 双向核对：PRD 能否在原型/架构中落地；原型中的字段与动作是否有业务依据；架构中的能力与约束是否服务于产品目标。
3. 检查跨端主流程、权限、状态、异常、视觉、响应式、可访问性、数据口径、API/事件、测试策略、部署和回滚是否闭环；原型必须由当前Agent按公司规范在docs/design直接维护，可选实现映射必须与原型同步且不得暗改业务语义，也不要求插件仓库保存业务截图或 VRT。
4. 按阻断、需用户裁决、可改进分类；先向用户呈现真正需要裁决的问题，其余确定性问题直接修正。
5. 修正后重新全量审查，提交/更新产品定义 PR并等待 CI；目标 dev 的合并遵循当前交付规则。
6. 回写产品基线 commit 与仍明确延期的 Issue。只有零阻断、所有关键裁决落文档后，才允许 `/version`。

本命令是综合审查并修正，不再拆成 PRD/原型/架构各自的 draft/review 命令族。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
