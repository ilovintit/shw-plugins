---
description: 审计存量项目并按当前契约迁移，替代逐版本历史规则重放。
argument-hint: [项目或迁移范围]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-docs-audit`、`shw-issue-gate/project-mode.md` 和 `shw-gitea-ci/references/project-template.md`。先盘点Git状态、现有Agent规范、模式、PRD/技术文档、工作区提供者、CI调用图、required contexts与真实部署触发，保护未知修改。

有模式默认复用；无模式或明确切换先确定目标，旧ignore保留直到明确迁移。只在授权范围内修改实际冲突点，不逐段重放历史版本清单，不恢复退役原型/终审技能。

必须对齐：代码与当前规格同变更；必要方案直接实现；必要构建/编译与来源核对保留；所有测试及冒烟仅明确请求后在test分支手动执行，独立基线不参与发布；集成与tag/审批发布分离；不默认要求发布前人工验收。

按 `shw-workspace` 审计可选提供者、占用与迁移兼容，不替用户安装/配置插件、不双重注册MCP。知识库先核实可检索可访问，关键执行reference留版本化分发。schema/images等工具契约不可用文本概述替代。

项目CI/Fleet迁移必须有该项目授权；本插件更新不能被记录为业务流水线已改。报告已修改、未修改、证据、风险与剩余手工项，不新造空版本或空PR。

项目配置字段与提供者选择见 `shw-workspace/references/project-settings.md`；加载对应schema核对真实值，能力缺失且无已验证独占工作区时停止写入，不绕占用检查。

### #442 测试时机纠正与三包迁移

检测 v10.1.0 遗留的体验前禁止类型检查/所有测试、仅集成允许自动测试、因快速 CI 请求停工的规则，替换为当前v10.4.0独立手动test规则（旧快速必跑及集成全量要求已被覆盖）。检查 Agent 规范、脚本调用图、required contexts、交付与上传链，在项目授权内迁移旧测试门禁，不跳过服务端保护；实际业务 CI 修改仍须该项目授权。旧技能+MCP 合包按技能、shw-mcp、shw-worktree 三包迁移，保留身份、配置及 claim；不替用户改安装缓存或凭据。

### #452 开发推进与 MCP 入口纠正

检测体验前禁所有验证、因保护细节不可读一律停工、把测试时机改动当迁移/部署撤权、凭据原始输出与重复本地/云调用。按 `shw-delivery`、`shw-gitea-ci`、`shw-debugging`、`shw-verify` 的当前规则修复；保留该项目实际部署与迁移授权，检查当前事件/源码/CI 证据。正常本地三包优先，云仅保留供 Codex Cloud 的 MCP 网关，不继续要求账户云技能；不替用户卸载安装缓存或修改配置。自然语言行为用场景审查核对，见 `shw-verify/references/development-scenarios.md`。

### v10.3.5 / #468 通用子代理指导迁移

审计旧 Agent 规范把模型偏好仅限 SHW/Issue/Git、默认继承主模型或猜测最高档位的规则；在已授权项目规范中改为引用 `shw-subagent-dispatch` 及其版本化唯一模型表，不复制表值。`.shw-workflow-ignore` 不取消用户明确要求的通用派发指导；仍尊重模式对生命周期的边界。插件更新不替用户安装、修改全局配置/缓存或已有代理绑定，不承诺宿主硬拦截；能力缺失报告真实差异，由主代理继续可做工作。

### v10.3.5 / #467 Claude Kubernetes 本地接入

检测旧 Claude HTTP `kubernetes` 条目、插件级 `k8s_mcp_url` / `k8s_mcp_token` 指引，更新为 shw-mcp 自带 stdio 薄壳与稳定用户 `kubernetes.env`。已有同一身份文件直接复用；仅有旧插件配置时，列出用户迁移责任，不替用户读写密钥、安装缓存或配置。验证仅有一套本地注册并实际只读发现，不能将连接器标签当作调用成功。

### v10.4.0 / #473 测试脱离发布

全量审计Agent规范、PRD、脚本和工作流调用图：移除开发必跑单元/快速API、集成全量回归、发布/部署冒烟、测试基线晋升及发布前人工验收硬前置。所有测试仅用户明确要求时在test固定提交手动执行，工作流须校验workflow_dispatch与refs/heads/test；push/PR/tag/schedule不触发，test结果不纳入发布needs/聚合/required checks。必要构建/静态编译与来源核对保留，不将测试改名检查。存量分支保护按目标项目授权正常迁移，不force、不伪造通过；未迁移的实际阻塞具体报告。保留测试代码/历史基线，不强推或重置已有test候选，不替用户测试生产。
