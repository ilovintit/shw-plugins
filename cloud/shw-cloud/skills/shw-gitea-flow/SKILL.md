---
name: shw-gitea-flow
description: 仓库宿主、分支路由和写操作证据；集成与正式发布分离。
---

执行前读取 [cloud-runtime.md](cloud-runtime.md)，按实际工具与工作区提供者执行。

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

# 仓库与分支路由

先读取 `.shw/project.yaml`、当前 Git remote 和项目规则，不从目录名猜宿主或权限。Gitea 优先适配的 MCP；GitHub 使用其已授权连接。不可用时按 `shw-issue-gate/config.md` 的适用兜底；不读凭据文件或新设权限。

| 模式/动作 | source → target | 收口 |
| --- | --- | --- |
| issue-main 普通 Issue | main → main | 项目明确授权的 PR 合并；不擅自引入 dev 或业务测试门禁 |
| issue-dev / managed 普通 Issue | dev → dev | 自审、必要构建与部署证据；无自动测试前置 |
| issue-dev / managed 集成 | 冻结 dev 与 main 基点 → main | `shw-integration` 通过后正常 merge commit |
| Hotfix | main → 项目明确的修复目标 | 不自动直合 main；需指定集成/发布及回灌策略，不能绕过验收与集成 |
| 发布 | 已通过集成的 main commit/制品 | tag 或审批按 `shw-release-flow`，不再运行测试 |

表中 source 是创建分支的来源，不是允许在保护分支直接编辑。`issue-main` 无 dev→main 阶段；普通 PR 必须执行类型检查和受影响模块快速测试；全量长周期回归按项目集成流程安排。

所有 PR 检查必须对应当前 HEAD。Issue关联、合并、关闭、分支删除等远端写入按用户/项目授权执行，并回读验证。无权限则保留具体待办；不 force、绕保护、伪造 checks 或删除他人分支。不将普通“完成”理解为发布授权。

每日/小批次合入 main 是集成，不触发本插件默认生产发布。项目现有 main push 自动部署必须单独审计、明确迁移授权；文档更新不代表业务 CI/Fleet 已改。
