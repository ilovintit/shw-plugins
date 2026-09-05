---
name: update
description: "Codex prompt workflow for update、/update. 全量升级并对齐存量项目——审计代码、Agent 规范、产品文档、Gitea、CI、测试与部署声明，修到符合当前生命周期工作流。 Use only when the user explicitly asks for this named workflow."
---

# update

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `update`、`/update` 或要求执行该工作流时按下方原文执行。

**参数**：[Issue 编号]

这不是“接入工作流”的轻量命令，而是存量项目的全量一致性迁移。执行前加载 `shw-docs-audit`、`shw-product-docs`、`shw-gitea-flow`、`shw-gitea-repo`、`shw-worktree` 和 `shw-verify`。

## 执行

1. 关联现有迁移 Issue；没有就先建一个 `chore` Issue，再进入独立 worktree。
2. 全量盘点：
   - 所有 Agent 指令文件及其冲突、重复和过时命令；
   - Git 分支、保护规则、Issue/label/Milestone/PR 纪律；
   - PRD 是否收敛为一份产品级当前真相；
   - 原型是否覆盖所有实际入口，并有产品级索引与跨入口主流程；
   - 技术文档是否有整体入口，并覆盖客户端、服务、领域、数据、接口、测试和部署；
   - 自动化测试、PR Gate、Harbor 镜像、`deploy/` 声明与 Fleet 目标；
   - 代码现实与文档声明是否漂移。
3. 输出逐项矩阵：现状证据、目标要求、差距、修复动作、是否需要用户裁决。
4. 自动修复机械性差距；涉及产品语义、删除历史文件、改变部署目标或安全边界时先取得用户裁决。
5. 缺少产品知识时不得编造：通过同一命令继续访谈并补齐；明确延期的缺口必须创建 Issue，不得写假完成文档。
6. 更新 Gitea 设施，提交 PR，等待 CI 并修复到绿；目标 dev 可按交付规则合并，main 永远不合。
7. 回写迁移报告：已修复、经用户确认保留、延期 Issue、验证证据。

## v7.0.0 迁移清单（#56）

检测任一旧命令或旧标记即进入迁移：`/shw-research`、`/shw-import`、`/shw-issue`、`/shw-do`、`/shw-wrap`、旧 change 族、旧 prd/proto/arch/test 命令族、`/shw-review`，或 `<!-- shw-workflow:v6 -->`。

修复动作：

- 替换为 16 个生命周期命令；旧入口不保留 alias 或兼容 wrapper；
- 移除 `.changes/`、`specs/` 等已退役流程说明，先迁移有效知识再删除文件；
- `/shw-research` 的纯读语义迁移到 `/explore`；
- 首次接入与插件升级统一迁移到本命令；
- 全量重写项目工作流段，不局部字符串替换；用户自定义的非工作流规范保留；
- 部署改为项目仓库声明 + Fleet 拉取，项目 Agent 只经统一多集群 MCP 读取 Kubernetes。

迁移必须幂等：再次执行时无新的机械性改动，并仍会重新审计语义漂移。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
