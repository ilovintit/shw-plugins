---
name: shw-docs-audit
description: 存量项目全量对齐审计。以代码现实和产品文档真相为证据，检查 Agent 规范、PRD、所有原型入口、架构文档族、测试、CI、Gitea与部署声明；update 使用。
---

# 全量对齐审计

## 范围

- 所有 Agent 指令文件及优先级、冲突和旧命令残留；
- `docs/prd/product.md` 的唯一性和真实性；
- `docs/design/index.html` 与每个真实前端入口；
- `docs/architecture/index.md` 及客户端、服务、领域、数据、API、测试、部署子文档；
- 代码、数据库迁移、路由、权限、配置与文档声明；
- Git/Gitea、Issue、Milestone、PR、CI 和分支保护；
- Harbor 构建、项目 `deploy/`、Fleet 目标和只读 MCP 边界。

## 方法

建立“要求—现状证据—差距—修复—验证”矩阵。机械差距可修；产品语义、删除历史资料和部署安全变化必须让用户裁决。有效知识先迁入新真相，再删除旧文件。

审计不是只出报告：`/update` 应持续修复到机械差距清零；无法当场完成的真实缺口建立 Issue并明确延期。禁止根据文件存在推断内容合格，也禁止从实现猜测并伪造产品意图。
