---
name: shw-gitea-repo
description: 按项目模式维护仓库设施；不扩大权限或强制引入业务规范。
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

# 仓库设施

读取 `shw-gitea-flow` 与 `shw-gitea-ci/references/project-template.md`。记录宿主、仓库、默认分支、模式、保护分支、PR 合并授权、required contexts、部署触发和 GitOps 映射。

初始化仅创建所选模式需要的设施；存量仓库先盘点规则和未知改动，给出实际差异再在授权内迁移。不因为新插件规则就修改业务仓库、Fleet登记或用户配置。

普通Issue与dev→main只做必要构建/静态编译、来源/权限核对，不执行测试或冒烟。测试仅用户明确请求时在test固定候选手动运行，不参与发布聚合或required checks。迁移工作流/保护配置须在该项目授权内正常进行，不能留下永久pending或force绕过。

共享库按已发布的真实包/版本消费，不能编造 shw-ui 包名/API或跨仓修改。凭据通过既有受控连接引用，不写入仓库或日志。写操作回读并列出缺失权限与尚未验证的行为。
