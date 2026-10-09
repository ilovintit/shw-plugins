---
name: shw-gitea-repo
description: 按项目模式维护仓库设施；不扩大权限或强制引入业务规范。
---

执行前读取 [cloud-runtime.md](cloud-runtime.md)，按实际工具与工作区提供者执行。

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

# 仓库设施

读取 `shw-gitea-flow` 与 `shw-gitea-ci/references/project-template.md`。记录宿主、仓库、默认分支、模式、保护分支、PR 合并授权、required contexts、部署触发和 GitOps 映射。

初始化仅创建所选模式需要的设施；存量仓库先盘点规则和未知改动，给出实际差异再在授权内迁移。不因为新插件规则就修改业务仓库、Fleet登记或用户配置。

普通 Issue→dev 必须执行类型检查、适用静态检查与受影响模块单元/API 快速测试，并执行必要构建/部署和来源/权限检查。全量 E2E/VRT/API 长周期回归集中 dev→main，tag 只提升已验证制品。迁移 workflow 时同步检查 required contexts，不能留下永久 pending 或删除保护后强合。

共享库按已发布的真实包/版本消费，不能编造 shw-ui 包名/API或跨仓修改。凭据通过既有受控连接引用，不写入仓库或日志。写操作回读并列出缺失权限与尚未验证的行为。
