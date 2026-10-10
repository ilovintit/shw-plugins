---
name: shw-ddd
description: DDD 四层架构（domain/application/interfaces/infrastructure）的通用设计规范，跨语言跨框架。涉及后端目录划分、新建文件放哪层、跨层依赖方向、module+shared 模块组织、组件库组件归层时调用。用户提到 DDD、四层架构、目录结构、某文件该放哪层时自动触发。
---

**执行前置**：先读 [适用模式与权限](../shw-issue-gate/SKILL.md)。仅修改当前已确认项目工作目录；项目外只读，未知修改不得覆盖。涉及写入先按 [工作区能力契约](../shw-workspace/SKILL.md) 确认所有权，不强制依赖本地 worktree 插件。

# DDD 四层架构契约

- 依赖方向为 Interfaces → Application → Domain ← Infrastructure。Domain 不依赖框架、数据库、ORM或外部SDK；仓储接口由 Domain 定义，实现放 Infrastructure。
- 业务规则由领域实体/服务承载；Application 只编排用例和权限/数据范围入口；Interfaces 只取参、调用用例、响应，不直接查库或开事务。
- 依赖在模块入口集中装配。跨模块通过应用层或共享服务协作，不直接访问其他模块模型。
- Shared 只放已发生跨模块复用的代码，仍按四层划分；不提前抽象。
- 组件库由 Infrastructure 接入，Domain 依赖项目定义的抽象；中间件实现归 Infrastructure，管道装配归 Interfaces。
- 异常保留原始语义并向上冒泡，由全局处理器映射；不逐层捕获改写。具体库签名以项目锁定版本文档为准。

目录名由具体框架决定，不通过机械改名改造存量工程。业务逻辑、权限或状态流转改变时同步 PRD；接口、数据或架构变化同步技术文档，区分当前规格与待实现方案。

**测试时机**：测试与开发、集成、发布、部署解耦：单元、API、E2E、VRT、回归及冒烟均仅在用户明确要求后，于独立 `test` 分支的固定提交执行。普通 push/PR/tag/部署和推送 test 分支本身不触发测试；未测试不阻挡已授权发布。必要构建/编译、静态与配置检查、来源核对正常执行，不得借“检查”名义运行测试；构建成功不代表测试或人工验收通过。

## 按需加载（执行对应动作前必读）

下列文件随插件版本分发，属于执行规范。按改动主题读取并记录所用路径；找不到时报告缺口，不以记忆替代。多个主题命中时全部读取。

| 触发条件 | 本地规范 |
|---|---|
| 涉及依赖方向（不可违反） | [依赖方向（不可违反）](references/dependencies.md) |
| 涉及四层职责定义 | [四层职责定义](references/layer-responsibilities.md) |
| 涉及Module 模式 | [Module 模式](references/module-layout.md) |
| 涉及Shared 模式 | [Shared 模式](references/shared-layout.md) |
| 涉及组件库组件归层约定 | [组件库组件归层约定](references/component-boundaries.md) |
| 涉及异常分层规则 | [异常分层规则](references/exception-boundaries.md) |
