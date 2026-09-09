---
name: shw-gitea-flow
description: 产品全生命周期的 Gitea 状态与关联机制。定义产品定义 Issue、Version/Milestone、交付 Issue、Bug、PR、label、发布和关闭边界；所有生命周期命令操作 Gitea 时使用。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# Gitea 生命周期映射

## 四层真相

| 层级 | 真相载体 | 完成含义 |
| --- | --- | --- |
| 产品 | `docs/prd/product.md` + 原型/架构文档族 | 当前产品定义已审查进入 dev |
| Version | 一个 Gitea Milestone | 本次可独立发布范围与状态 |
| 交付 | 一个 Issue + 一个分支 + 一个交付 PR | 普通项进入 dev；Hotfix 按下表完成 main 与 dev 同步 |
| 生产 | tag + 制品 + 适用部署/分发 + 反馈证据 | 用户确认后关闭 Milestone |

Issue 只承载摘要、状态、AC、依赖和链接，不复制产品文档正文。

## Issue 类型

- 产品定义：PRD/原型/架构的一次一致性变更，三者共用一个 Issue/分支/PR。
- 交付 Issue：由 `/shw-split` 从 Version 拆出，可独立验收。
- Bug/Hotfix：由 `/shw-bug` 从 dev、生产或使用反馈产生。
- 基础设施/维护：chore，不得混入无关产品 Issue。

## 状态

Issue 使用 `backlog`、`status/待开发`、`status/开发中`、`status/待评审`；完成由 closed 表达，一次只能有一个生命周期状态。Version 状态写在 Milestone 描述 checklist，不为状态另建 Issue。

## 交付路由（唯一分支/合并真相）

| Issue 类型 | 来源 source | PR 目标 target | 合并与收尾 |
| --- | --- | --- | --- |
| 普通功能、Bug、chore、产品文档 | 最新 origin/dev | dev | required CI 全绿后 Agent 可合并并关闭 Issue |
| Hotfix | 最新 origin/main | main | 停在用户 Web UI 合并前；核实合并后同步 dev，再关闭 Issue |

先解析 Issue 类型再选工作区、分支和 PR 目标。不能把从 dev 创建的分支改投 main 充当 Hotfix。
Hotfix 回灌采用用户合并的 main 提交到 dev 的同步 PR，并单独核对 CI；这是发布线同步记录，引用原 Hotfix Issue，不创建新的交付 Issue，也不冒充第二个 Hotfix 交付 PR。同步不自动合并 main。Issue:分支:PR 的 1:1:1 约束适用于交付 PR，不包含 dev→main 放行与 main→dev 同步记录。

## 关联纪律

- 交付 Issue : 分支 : PR = 1:1:1；source/target 按上表。普通 PR 用 `Closes #N`；Hotfix PR 用 `Refs #N`，人工合 main并完成 dev同步后再关闭 Issue。
- 产品文档、测试、实现和必要部署声明都进入同一个交付 PR，不拆假 Issue。
- 普通交付依赖必须已进入 dev；Hotfix 的依赖必须已在 main，不把未发布功能带入生产。
- Hotfix 从 main 切、PR 目标 main，由用户 Web UI 合并，再同步回 dev。
- main 永远只由用户合并；Agent 不应获得或请求 main 合并权限。

## 命令边界

- `/shw-version` 创建范围；`/shw-split` 创建多个 Issue；`/shw-test-plan` 固定验收映射。
- `/shw-work` 交付一个 Issue；`/shw-roadmap` 串行调度多个 Issue。
- `/shw-release` 创建放行 PR并在人工合并后打 tag；`/shw-deploy` 只读观测；`/shw-version-close` 经用户确认关闭 Milestone。

任何 Gitea 写操作完成后重新读取验证，不能只相信 API 请求返回。
