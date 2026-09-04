---
name: product-review
description: "Codex prompt workflow for product-review、/product-review. 综合审查并修正 PRD、各端原型与整体架构，消除三者冲突后形成可用于版本规划的产品基线。 Use only when the user explicitly asks for this named workflow."
---

# product-review

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `product-review`、`/product-review` 或要求执行该工作流时按下方原文执行。

**参数**：[产品定义 Issue]

执行前加载 `shw-product-docs`、`shw-docs-review`、`shw-design-review` 和 `shw-verify`。

1. 读取产品定义 Issue、`docs/prd/product.md`、完整原型索引及所有入口、架构入口及所有子文档。
2. 双向核对：PRD 能否在原型/架构中落地；原型中的字段与动作是否有业务依据；架构中的能力与约束是否服务于产品目标。
3. 检查跨端主流程、权限、状态、异常、数据口径、API/事件、测试策略、部署和回滚是否闭环。
4. 按阻断、需用户裁决、可改进分类；先向用户呈现真正需要裁决的问题，其余确定性问题直接修正。
5. 修正后重新全量审查，提交/更新产品定义 PR并等待 CI；目标 dev 的合并遵循当前交付规则。
6. 回写产品基线 commit 与仍明确延期的 Issue。只有零阻断、所有关键裁决落文档后，才允许 `/version`。

本命令是综合审查并修正，不再拆成 PRD/原型/架构各自的 draft/review 命令族。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
