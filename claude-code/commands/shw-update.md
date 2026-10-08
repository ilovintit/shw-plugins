---
description: 审计存量项目并按当前契约迁移，替代逐版本历史规则重放。
argument-hint: [项目或迁移范围]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-docs-audit`、`shw-issue-gate/project-mode.md` 和 `shw-gitea-ci/references/project-template.md`。先盘点Git状态、现有Agent规范、模式、PRD/技术文档、工作区提供者、CI调用图、required contexts与真实部署触发，保护未知修改。

有模式默认复用；无模式或明确切换先确定目标，旧ignore保留直到明确迁移。只在授权范围内修改实际冲突点，不逐段重放历史版本清单，不恢复退役原型/终审技能。

必须对齐：代码与当前规格同变更；够用方案直接可体验实现；体验前无测试（含lint/typecheck/smoke）；自动测试只dev→main；冻结候选和验收映射；候选基线仅本集成PR且通过合并才晋升；main每日集成与tag/审批发布分离；来源可证明才复用digest。

按 `shw-workspace` 审计可选提供者、占用与迁移兼容，不替用户安装/配置插件、不双重注册MCP。知识库先核实可检索可访问，关键执行reference留版本化分发。schema/images等工具契约不可用文本概述替代。

项目CI/Fleet迁移必须有该项目授权；本插件更新不能被记录为业务流水线已改。报告已修改、未修改、证据、风险与剩余手工项，不新造空版本或空PR。

项目配置字段与提供者选择见 `shw-workspace/references/project-settings.md`；加载对应schema核对真实值，能力缺失且无已验证独占工作区时停止写入，不绕占用检查。
