---
name: shw-gitea-flow
description: 产品全生命周期的 Gitea 状态与关联机制。定义产品定义 Issue、Version/Milestone、交付 Issue、Bug、PR、label、发布和关闭边界；所有生命周期命令操作 Gitea 时使用。
---

# Gitea 生命周期映射

## 四层真相

| 层级 | 真相载体 | 完成含义 |
| --- | --- | --- |
| 产品 | `docs/prd/product.md` + 原型/架构文档族 | 当前产品定义已审查进入 dev |
| Version | 一个 Gitea Milestone | 本次可独立发布范围与状态 |
| 交付 | 一个 Issue + 一个分支 + 一个 PR | 单项实现经 CI 进入 dev |
| 生产 | tag + 制品 + Fleet/K8s + 反馈证据 | 用户确认后关闭 Milestone |

Issue 只承载摘要、状态、AC、依赖和链接，不复制产品文档正文。

## Issue 类型

- 产品定义：PRD/原型/架构的一次一致性变更，三者共用一个 Issue/分支/PR。
- 交付 Issue：由 `/shw-split` 从 Version 拆出，可独立验收。
- Bug/Hotfix：由 `/shw-bug` 从 dev、生产或使用反馈产生。
- 基础设施/维护：chore，不得混入无关产品 Issue。

## 状态

Issue 使用 `backlog`、`status/待开发`、`status/开发中`、`status/待评审`；完成由 closed 表达，一次只能有一个生命周期状态。Version 状态写在 Milestone 描述 checklist，不为状态另建 Issue。

## 关联纪律

- Issue : 分支 : PR = 1:1:1；PR 目标 dev，正文 `Closes #N`。
- 产品文档、测试、实现和必要部署声明都进入同一个交付 PR，不拆假 Issue。
- 依赖必须等前序进入 dev，再从最新 dev 建分支。
- Hotfix 从 main 切、PR 目标 main，由用户 Web UI 合并，再同步回 dev。
- main 永远只由用户合并；Agent 不应获得或请求 main 合并权限。

## 命令边界

- `/shw-version` 创建范围；`/shw-split` 创建多个 Issue；`/shw-test-plan` 固定验收映射。
- `/shw-work` 交付一个 Issue；`/shw-roadmap` 串行调度多个 Issue。
- `/shw-release` 创建放行 PR并在人工合并后打 tag；`/shw-deploy` 只读观测；`/shw-version-close` 经用户确认关闭 Milestone。

任何 Gitea 写操作完成后重新读取验证，不能只相信 API 请求返回。
