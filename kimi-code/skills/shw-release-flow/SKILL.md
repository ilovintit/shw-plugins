---
name: shw-release-flow
description: 从已通过集成的提交/制品正式发布；与每日 main 集成分离，无独立 tag 测试。
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

# 正式发布

先读取 `shw-integration` 与 `shw-verify`。发布输入是已通过集成的 main commit、集成证据和可追溯制品，而不是“当前dev大概可用”。每日/小批次正常merge到main不等于发布。

1. 核对用户/项目发布授权、版本范围、main提交、成功集成和人工验收引用。tag或审批方式来自项目配置，不擅自切换。
2. 优先提升同一已验证 digest。dev SHA与merge后的main SHA不同；复用制品须有代码tree、构建配置、锁文件、依赖、工具链、参数与部署输入的等价证据。不能只因祖先关系就认为相同。
3. tag指向已验证main提交，制品记录同时保留实际build source与对应main commit。来源未知/输入改变时回到集成验证候选；不在tag阶段另设测试。
4. 执行已有授权的发布/部署，读取真实结果；失败保留现场和可逆恢复方案，不force改tag或浮动digest冒充成功。
5. 记录版本、提交、digest、审批/tag与部署revision，分清发布成功、工作负载就绪和人工验收。

Kubernetes按 [环境契约](references/environments.md) 与 references/gitops/README.md；小程序按 references/miniprogram/README.md。工具schema、镜像清单和模板随版本分发。业务仓库实际CI/Fleet的main-push触发需要单独授权迁移，本插件文字更新不等于已迁移。
