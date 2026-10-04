---
name: shw-docs-audit
description: 存量项目全量对齐审计。以代码现实和产品文档真相为证据，检查 Agent 规范、轻量 PRD、实际客户端与体验反馈、增量技术文档、测试、CI、Gitea与部署声明；update 使用。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

部署审查先按 `shw-release-flow` 判定产品形态：以下 Harbor/Fleet/deploy 要求仅适用于 Kubernetes 应用；插件/库/CLI 改核分发、安装升级和回退证据，并记录不适用依据。

# 全量对齐审计

## 模式前置

本 Skill 不是所有项目的默认约束。先读取仓库根 `.shw/project.yaml` 的模式：无标识时不主动应用；`issue-main` 只保留 Issue 分支→main 的轻量闭环；`issue-dev` 只保留 Issue 分支→dev→main 的轻量闭环；只有 `managed` 才应用本 Skill 中的业务项目目录、分支、测试、发布、部署或公司规范要求。模式定义见 `shw-issue-gate/project-mode.md`。

## 范围

- 所有 Agent 指令文件及优先级、冲突和旧命令残留；检查是否完整写入 shw-issue-gate 的项目外只读及用户介入边界，并清除自动修改外部配置/共享库/端口表的冲突指引；
- `docs/prd/product.md` 的唯一性和真实性；
- 每个真实客户端的路由、页面、组件、API/权限/状态、开发入口、目标源码/制品/部署标识和体验反馈；历史 `docs/design/` 或 `ui-design.md` 盘点保留，不再要求生成、验收或持续同步；
- `docs/architecture/index.md` 及客户端、服务、领域、数据、API、测试、部署子文档；
- 代码、数据库迁移、路由、权限、配置与文档声明；
- Git/Gitea、Issue、Milestone、PR、CI 和分支保护；
- Harbor 构建、项目 `deploy/`、Fleet 目标和只读 MCP 边界。

## 方法

建立“要求—现状证据—差距—修复—验证”矩阵。已有 PRD 与公司规范直接复用，真正未决的当前业务语义交用户裁决，不能把未来方案未定当作全部开发阻断。

解除独立原型、全产品文档完备和综合审查放行要求；当前 PRD/技术方案足够支撑小功能开工。核对最小运行链与实际端入口，每个可体验功能提供交接并等待反馈，修正优先于下一项；必要设计、文档和实现一致性审查在交付内完成。

存量原型、有效页面和来源只作历史参考，盘点并保留，不自动删除、复制成第二套当前真相或从旧页面推断未确认业务。当前文档与实际实现有冲突时标记已实现、待实现、未联调与待裁决，取得业务决定后修正。

`/update` 持续修复确定性差距；无法当场完成的真实缺口建立 Issue 并明确延期。禁止根据文件存在推断内容合格，也禁止从实现伪造产品意图。

环境与 CI 审计覆盖 shw-release-flow/references/environments.md 和 shw-test-spec/references/ci-config.md：dev 合并触发、端与服务影响清单、三环境中间件隔离、HTTP Ingress、内部依赖与统一配置、管理员前置及 Kubernetes 只读边界。
