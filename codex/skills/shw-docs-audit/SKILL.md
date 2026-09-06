---
name: shw-docs-audit
description: 存量项目全量对齐审计。以代码现实和产品文档真相为证据，检查 Agent 规范、PRD、所有原型入口、架构文档族、测试、CI、Gitea与部署声明；update 使用。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

部署审查先按 `shw-release-flow` 判定产品形态：以下 Harbor/Fleet/deploy 要求仅适用于 Kubernetes 应用；插件/库/CLI 改核分发、安装升级和回退证据，并记录不适用依据。

# 全量对齐审计

## 范围

- 所有 Agent 指令文件及优先级、冲突和旧命令残留；检查是否完整写入 shw-issue-gate 的项目外只读及用户介入边界，并清除自动修改外部配置/共享库/端口表的冲突指引；
- `docs/prd/product.md` 的唯一性和真实性；
- `docs/design/index.html` 与每个真实前端入口；
- `docs/architecture/index.md` 及客户端、服务、领域、数据、API、测试、部署子文档；
- 代码、数据库迁移、路由、权限、配置与文档声明；
- Git/Gitea、Issue、Milestone、PR、CI 和分支保护；
- Harbor 构建、项目 `deploy/`、Fleet 目标和只读 MCP 边界。

## 方法

建立“要求—现状证据—差距—修复—验证”矩阵。机械差距可修；产品语义、删除历史资料和部署安全变化必须让用户裁决。有效知识先迁入新真相，再删除旧文件。

审计不是只出报告：`/update` 应持续修复到机械差距清零；无法当场完成的真实缺口建立 Issue并明确延期。禁止根据文件存在推断内容合格，也禁止从实现猜测并伪造产品意图。
