---
name: architecture
description: "Codex prompt workflow for architecture、/architecture. 新建或更新整体技术架构文档族——用统一入口连接客户端、服务、领域、数据、接口、测试与部署设计。 Use only when the user explicitly asks for this named workflow."
---

# architecture

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `architecture`、`/architecture` 或要求执行该工作流时按下方原文执行。

## Issue 工作区管理

文件修改前加载 shw-worktree，使用插件的 worktree MCP acquire 取得独立编号分支与绝对路径。当前会话全程执行，所有文件/命令明确指向返回路径；不为隔离工作区自动 fork 或调用 Handoff。保存本次 claim_id，暂停用 release，交付完成后按 Skill 调用 remove；查询和恢复使用 inspect/list/reconcile。
这是插件提供的协作工具，不拦截 shell/文件操作，也不改变 Codex 的任务环境绑定。用户明确选择的外部工作区不自动接管或删除。

**参数**：[产品定义 Issue 或架构范围]

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

部署审查先按 `shw-release-flow` 判定产品形态：以下 Harbor/Fleet/deploy 要求仅适用于 Kubernetes 应用；插件/库/CLI 改核分发、安装升级和回退证据，并记录不适用依据。

执行前加载 `shw-product-docs`、`shw-design-review`、`shw-docs-review`、相关技术栈规范和 `shw-worktree`。

1. 关联产品定义 Issue，读取 PRD、所有已确认的公司规范驱动的高保真HTML原型及其可选实现映射；有界面但视觉、状态或交互未完整覆盖时先回 `/prototype`。
2. 维护 `docs/architecture/index.md` 作为整体入口，明确系统上下文、组件关系、关键约束、文档地图和架构决策。
3. 按复杂度拆分文档，而不是强制单文件：
   - `clients/`：各前端入口及共享能力；
   - `services/`、`domains/`：服务、领域与集成边界；
   - 数据模型、API/事件契约、权限、安全、测试策略；
   - `deployment.md`：镜像、Harbor、项目内 `deploy/` 声明、Fleet 目标、回滚与可观测性。
4. 每个子文档必须由整体入口索引，跨文档契约只设一个权威定义位置。
5. 对照 PRD/原型逐条验证，记录权衡、失败模式、兼容/迁移和非功能要求；不把待定项伪装成结论。
6. 经用户裁决关键契约后，运行设计与文档审查，更新同一产品定义 PR。

部署架构必须声明：项目 Agent 不使用 Ansible、不持有 kubeconfig/Rancher Token、不直接写 Kubernetes；部署声明在项目仓库，Fleet 拉取；集群查询经统一多集群只读 MCP。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
