---
description: 新建或更新整体技术架构文档族——用统一入口连接客户端、服务、领域、数据、接口、测试与部署设计。
argument-hint: [产品定义 Issue 或架构范围]
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

部署审查先按 `shw-release-flow` 判定产品形态：以下 Harbor/Fleet/deploy 要求仅适用于 Kubernetes 应用；插件/库/CLI 改核分发、安装升级和回退证据，并记录不适用依据。

执行前加载 `shw-product-docs`、`shw-design-review`、`shw-docs-review`、相关技术栈规范和 `shw-worktree`。

1. 关联产品定义 Issue，读取 PRD 与所有适用原型；有界面但原型未覆盖时先回 `/shw-prototype`。
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
