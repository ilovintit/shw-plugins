---
name: shw-goframe-conventions
description: 公司设计规范（DDD 四层架构见 shw-ddd；错误处理体系、RBAC 权限、后台任务、会话管理等组件规范见公司 lib 仓库文档，shw-lib-docs 指路）在 Go/GoFrame（GoFrame v2）项目里的落地实现指南。把架构/流程规范翻译成具体 Go/GoFrame 代码时触发：项目分层落地、手工依赖注入、公司库异常/响应契约落地、Controller 极薄实现、DAO/Entity 用法、decimal string 金额精度、Go 命名约定、启动入口与多角色部署（gcmd 子命令树、单二进制、worker 编成 ENABLE_WORKERS、Dockerfile、K8s Deployment）。最近 go.mod 含 github.com/gogf/gf/v2 时适用。
---

**执行前置**：先读 [适用模式与权限](../shw-issue-gate/SKILL.md)。仅修改当前已确认项目工作目录；项目外只读，未知修改不得覆盖。涉及写入先按 [工作区能力契约](../shw-workspace/SKILL.md) 确认所有权，不强制依赖本地 worktree 插件。

# Go / GoFrame 执行契约

先检查当前 `go.mod`、锁定版本和既有目录；仅对实际 GoFrame 工程应用本规范。分层先读 [DDD](../shw-ddd/SKILL.md)，组件用法经 [lib 文档](../shw-lib-docs/SKILL.md) 获取锁定版本证据。

- 手工 DI，在模块入口显式构造依赖；不使用全局 service 注册或自行增加 DI 容器。
- Controller 极薄：取参、调 UseCase、响应。认证由中间件完成，授权和数据范围在 UseCase；不查库或重做鉴权。
- 错误类型、响应中间件、session 与后台任务 API 从实际依赖文档读取；不复制漂移的构造器或吞掉原始错误。
- 生成 DAO/entity 仅作 DB 映射，领域实体手写。生成只能用 [一次性数据库](../shw-ephemeral-db/SKILL.md)，禁止共享 dev/test/生产库。
- 金额用 decimal string，禁止浮点；多表事务使用回调 `txCtx`，不能混入外层 ctx。
- 单二进制按 gcmd 子命令区分 api/worker/migrate；角色复用同一镜像，worker 覆盖 args，禁止误以 command 覆盖 ENTRYPOINT。
- 响应契约为 `{traceId, code, message, data}`，成功 code=0；时间字段区分领域 `*time.Time` 与生成 `*gtime.Time`。

同步代码与当前 PRD/技术文档；不要把未实现方案写成当前能力。

**测试时机**：测试与开发、集成、发布、部署解耦：单元、API、E2E、VRT、回归及冒烟均仅在用户明确要求后，于独立 `test` 分支的固定提交执行。普通 push/PR/tag/部署和推送 test 分支本身不触发测试；未测试不阻挡已授权发布。必要构建/编译、静态与配置检查、来源核对正常执行，不得借“检查”名义运行测试；构建成功不代表测试或人工验收通过。

## 按需加载（执行对应动作前必读）

下列文件随插件版本分发，属于执行规范。按改动主题读取并记录所用路径；找不到时报告缺口，不以记忆替代。多个主题命中时全部读取。

| 触发条件 | 本地规范 |
|---|---|
| 涉及项目分层落地（设计规范：shw-ddd） | [1. 项目分层落地（设计规范：shw-ddd）](references/layout.md) |
| 涉及依赖注入落地：手工 DI（设计规范：shw-ddd） | [2. 依赖注入落地：手工 DI（设计规范：shw-ddd）](references/dependency-injection.md) |
| 涉及Controller 落地：极薄 + 规范路由（架构规范：shw-ddd；权限规范：项目架构与实际依赖契约） | [3. Controller 落地：极薄 + 规范路由（架构规范：shw-ddd；权限规范：项目架构与实际依赖契约）](references/controllers.md) |
| 涉及错误处理落地：锁定依赖版本，保持原始语义 | [4. 错误处理落地：锁定依赖版本，保持原始语义](references/error-handling.md) |
| 涉及DAO / Entity 落地：生成的 DB 映射 vs 手写领域实体（设计规范：shw-ddd） | [5. DAO / Entity 落地：生成的 DB 映射 vs 手写领域实体（设计规范：shw-ddd）](references/dao-entities.md) |
| 涉及金额精度落地：decimal string | [6. 金额精度落地：decimal string](references/money.md) |
| 涉及Go 命名约定 | [7. Go 命名约定](references/naming.md) |
| 涉及启动入口与多角色部署 | [8. 启动入口与多角色部署](references/runtime-roles.md) |
| 涉及事务、会话、后台任务或时间字段 | [9. 其他落地约定](references/transactions-and-components.md) |
| 安装或排查 GoFrame 官方 skill | [环境搭建](setup.md) |
| 从 PHP 迁移 Go | [迁移陷阱](migration.md) |
