---
description: 完成一个且仅一个 Issue——调查、计划、测试、实现、自审、PR、CI、合入 dev 与轨迹回写全链路。
argument-hint: <Issue 编号>
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

单 Issue 交付入口。执行前加载 `shw-delivery`、`shw-gitea-flow`、`shw-worktree`、`shw-tdd`、`shw-pr-review`、`shw-gitea-ci` 和 `shw-verify`。

## 硬边界

- 输入必须解析为一个 Issue；多个 Issue 或 Version/Milestone 必须转 `/shw-roadmap`。
- Issue 必须有明确范围、非目标、依赖和可验证 checklist；缺失时先补齐并取得必要裁决。
- 一个 Issue 对应一个交付分支、工作区和 PR；先按 `shw-gitea-flow` 的交付路由表确定 source/target。Hotfix 从 main 创建，不能沿用普通 dev 路径。

## 执行

1. 读取完整 Issue/评论、产品文档、依赖 Issue、相关代码和历史 PR，确认依赖已进入该类型的 source。
2. 在会话内完成差距调查和具体计划；计划不是新的用户命令，也不创建 `.changes/` 或 `specs/` 真相源。
3. 按 `shw-tdd` 先提交复现测试到同一草稿 PR，确认 CI 因目标行为缺失而红，再实现；本地默认只做构建/类型检查。
4. 按任务边界实现、同步必要文档，运行 `shw-pr-review` 收敛验收、架构、安全和回归问题。
5. 更新同一个交付 PR；source/target、Issue 关联语法与合并责任按路由表，列出 checklist 与验证证据。
6. 等待真实 CI；失败时读 job 日志、定位根因、修复并重复，直到所需 checks 全绿。
7. CI 全绿后按路由表收口：普通 PR 合 dev；Hotfix 停等用户合 main，核验后完成 dev 同步。按 `shw-worktree` 分别处理分支、工作区和任务，完成后关闭 Issue。
8. 回写实现摘要、PR、CI、关键决策和遗留项；没有证据不得声称完成。

如果执行中发现必须改变产品范围、公开契约或 Version 边界，暂停交给用户，不能在单 Issue 内暗中扩张。
