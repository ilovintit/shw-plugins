---
name: shw-worktree
description: 生命周期工作流的 worktree 纪律。主目录只做 dev 基座；单 Issue 使用独立 worktree，roadmap 使用常驻 worktree但逐 Issue 切独立分支；work/roadmap/update/产品文档变更使用。
---

# Worktree 纪律

## 不变量

- 主工作目录只用于更新和查阅 dev，不承载任何 Issue 改动。
- 宿主有原生 Worktree/Handoff/permanent worktree 时优先使用；否则用 Git worktree。
- 一个 Issue 同时只在一个 worktree、一个编号分支中工作。

## 单 Issue

```bash
git fetch origin dev
git worktree add ../<repo>-issue-<N> -b feat/<N>-<slug> origin/dev
```

进入后必须用 `git branch --show-current` 验证编号分支。依赖自行安装，被忽略但必要的文件按宿主机制安全注入。

## Roadmap

版本执行可使用一个常驻 worktree减少反复初始化，但仍严格串行：上个 Issue 合入 dev并清理分支后，fetch 最新 dev，再为下一个 Issue 创建新编号分支。不得让多个 Issue 共用一个分支或并行改动。

## 清理

- 自建单 Issue worktree 在 PR 合并后 remove，并删除已合并分支。
- 宿主管理的 worktree 交宿主回收，不在 shell 中强删。
- roadmap 常驻 worktree 在版本全部 Issue 交付后清理；Milestone 仍保持 open 等待发布和生产验证。

落后 dev 时 rebase；禁止把另一 feature 分支 merge 进来解决依赖。
