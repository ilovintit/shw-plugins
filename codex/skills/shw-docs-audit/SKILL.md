---
name: shw-docs-audit
description: 存量项目全量对齐审计。以代码现实和产品文档真相为证据，检查 Agent 规范、PRD、全部 公司规范驱动的HTML高保真原型、架构文档族、测试、CI、Gitea与部署声明；update 使用。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

部署审查先按 `shw-release-flow` 判定产品形态：以下 Harbor/Fleet/deploy 要求仅适用于 Kubernetes 应用；插件/库/CLI 改核分发、安装升级和回退证据，并记录不适用依据。

# 全量对齐审计

## 范围

- 所有 Agent 指令文件及优先级、冲突和旧命令残留；检查是否完整写入 shw-issue-gate 的项目外只读及用户介入边界，并清除自动修改外部配置/共享库/端口表的冲突指引；
- `docs/prd/product.md` 的唯一性和真实性；
- `docs/design/index.html`、每个真实前端入口的 公司规范驱动的HTML高保真视觉与交互、完整依赖，以及存在时由原型同步派生的 `ui-design.md` 实现映射；
- `docs/architecture/index.md` 及客户端、服务、领域、数据、API、测试、部署子文档；
- 代码、数据库迁移、路由、权限、配置与文档声明；
- Git/Gitea、Issue、Milestone、PR、CI 和分支保护；
- Harbor 构建、项目 `deploy/`、Fleet 目标和只读 MCP 边界。

## 方法

建立“要求—现状证据—差距—修复—验证”矩阵。真实未决产品语义才回用户；已有PRD与公司规范直接执行。`docs/design/` 是唯一原型源码与验收目录，不创建竞争的 `docs/prototype/`。先记录干净Issue工作区基线，盘点旧页面、依赖与已确认交互，再逐端原地整理和修改，不按Issue重建。完整外部导出可一次迁入并保留有效内容与来源；尚未取得完整文件时由用户提供，不派发或轮询外部生成任务，不操作外部项目及用户配置。浏览器预览反馈通过后才清理明确替代文件并复验，提交同一draft产品PR，完成architecture与product-review后合入dev。可选ui-design.md仅作同步派生的实现映射。 审计是否仍有外部设计执行/项目ID/存储例外、独立风格或按Issue重建等旧要求，按update迁移为当前Agent直接维护。

审计不是只出报告：`/update` 应持续修复到机械差距清零；无法当场完成的真实缺口建立 Issue并明确延期。禁止根据文件存在推断内容合格，也禁止从实现猜测并伪造产品意图。
