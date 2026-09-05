---
name: shw-issue-gate
description: 仓库变更入口闸门。除 init 引导期外，任何文件或 Gitea 配置变更前必须关联 Issue并进入对应 worktree；纯读 explore 豁免。
---

# Issue 入口闸门

## 判定

- 纯读调查、答疑、状态查询：不建单。
- 会改文件、配置、文档、CI或外部状态：必须先有 Issue。
- `/shw-init` 在新仓库设施尚不存在时允许先建立初始化载体；一旦 Gitea 可用立即关联。

## 执行

1. 用户给了 Issue：读取并确认与任务匹配。
2. 未给：按关键词搜索 open Issue，避免重复。
3. 仍无：创建标题清晰的 Issue，写背景、目标、约束和初步验收；产品需求应先进入产品定义，缺陷用 `/shw-bug`。
4. 确认当前目录是该 Issue 的 worktree，分支编号一致；主目录只做 dev 基座。
5. 再开始修改。

产品文档的一次一致性变更使用一个产品定义 Issue；Version 的多个交付 Issue 由 `/shw-split` 创建。不得为了每个内部动作或文档类型重复建单。

用户明确要求不建 Issue 时记录豁免；除此之外，无单开工和事后补单都不允许。
