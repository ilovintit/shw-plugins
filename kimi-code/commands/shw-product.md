---
description: 新建或更新唯一的产品级 PRD 当前真相，收敛目标用户、价值、范围、业务规则、主流程和验收结果。
argument-hint: [产品定义 Issue 或变更说明]
---

执行前加载 `shw-product-docs`、`shw-gitea-flow`、`shw-docs-review` 和 `shw-worktree`。

1. 关联本次产品定义 Issue；没有就先创建。产品文档变更不得无 Issue 开工。
2. 读取完整代码现实、现有 `docs/prd/product.md`、原型索引和架构入口，先找出本次变化影响的主流程。
3. 与用户收敛目标用户、问题、目标、非目标、范围、角色权限、业务规则、正常/异常流程、数据口径和可验证验收标准。
4. 只维护一份 `docs/prd/product.md` 作为当前产品真相；规模大时章节可链接附录，但不得按客户端或版本复制多份竞争 PRD。
5. 写回当前有效形态，不写已废弃方案；重要裁决与被否方案留在 Issue/Journal。
6. 与同一产品变更 Issue 的原型、架构共用一个 worktree/分支/PR；若只改 PRD，也仍经 docs review 和 PR 进入 dev。

PRD 不规定代码细节，但必须让 `/shw-prototype`、`/shw-architecture`、`/shw-version` 可以据此作确定性判断。
