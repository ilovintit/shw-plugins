---
name: architecture
description: "Codex prompt workflow for architecture、/architecture. 确定稳定技术边界与当前小版本的必要方案，随实际开发和反馈增量维护技术文档。 Use only when the user explicitly asks for this named workflow."
---

# architecture

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `architecture`、`/architecture` 或要求执行该工作流时按下方原文执行。

## Issue 工作区管理

文件修改前加载 shw-worktree，使用插件的 worktree MCP acquire 取得独立编号分支与绝对路径。当前会话全程执行，所有文件/命令明确指向返回路径；不为隔离工作区自动 fork 或调用 Handoff。保存本次 claim_id，暂停用 release，交付完成后按 Skill 调用 remove；查询和恢复使用 inspect/list/reconcile。
这是插件提供的协作工具，不拦截 shell/文件操作，也不改变 Codex 的任务环境绑定。用户明确选择的外部工作区不自动接管或删除。

**参数**：[产品定义 Issue 或架构范围]

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-product-docs`、`shw-design-review`、`shw-docs-review`、相关技术栈规范和 `shw-worktree`。

1. 关联当前需求/功能 Issue，读取已确认 PRD、现有技术文档和相关实现；直接依据实际客户端与服务设计，不要求先制作或验收原型。
2. 维护 `docs/architecture/index.md` 作为统一入口，记录稳定的系统边界、技术栈、关键约束、开发环境与文档地图。
3. 仅补齐当前小版本开工必需的客户端/服务边界、数据模型、API/事件、权限、状态、迁移与部署方案；按实际复杂度拆分 clients/services/domains/data/apis/security/testing/deployment，不机械创建空文档。
4. 当前核心契约必须足够明确；涉及用户业务裁决时集中询问。未来能力和界面细节可以随迭代完善，不能把全产品方案完整性设为当前功能前置。
5. 对照当前 PRD、实际实现与本次反馈进行内部设计和文档审查，记录必要的权衡、失败模式、兼容/回滚；将技术文档与实现放在同一功能 PR，反馈改变契约时同步更新。
6. 首个可体验功能前打通最小可运行工程、开发 API/前端入口、配置、受控测试数据与部署/调试链。后续复用环境，交付时核对本次源码与目标环境，明确未联调范围。

按产品形态审查部署：Kubernetes 应用使用项目内 `deploy/` 与 Fleet；插件/库/CLI 核对制品分发、安装/回退与可运行调用，不生成应用部署要求。

项目 Agent 不使用 Ansible、不持有 kubeconfig/Rancher Token、不直接写 Kubernetes；集群查询只经统一多集群只读 MCP。Kubernetes 应用加载 shw-release-flow/references/environments.md 与 shw-test-spec/references/ci-config.md，说明分支触发、受影响服务映射、固定开发集群/域名、中间件职责、HTTP Ingress、回滚和外部前置。

开发中间件使用 shw-backend-stack/references/middleware-images.json 的 verified 引用与匹配平台，先缓存验证再部署。微信小程序加载 shw-release-flow/references/miniprogram/README.md，明确真实 AppID/入口/编译目录/API 环境、凭据责任与插件镜像 digest；上传、审核发布和端内人工验收分别取证。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
