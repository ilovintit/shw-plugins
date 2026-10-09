# 9. 其他落地约定

### 事务：Transaction + txCtx

多表写用 `g.DB().Transaction`，在 application 层调用。**注意用 txCtx 而非原 ctx**（事务内所有 DAO 调用必须用回调注入的 txCtx，否则不进同一事务）。单表简单写入不用事务。

```go
err := g.DB().Transaction(ctx, func(txCtx context.Context, tx gdb.TX) error {
    // 用 txCtx，不是原 ctx
    _, e := dao.Orders.Ctx(txCtx).Data(...).Insert()
    return e
})
```

### 统一返回格式

落地统一响应四字段规范（lib 仓库错误处理文档），由[错误处理规范](error-handling.md)中的统一响应中间件装配：

```json
{ "traceId": "...", "code": 0, "message": "...", "data": { ... } }
```

成功 `code=0`。

### 会话落地（设计范式：公司 lib 仓库文档）

依照项目锁定的 session/middleware 文档，在模块装配处构造会话服务并绑定认证中间件。构造器、Auth/Validate 的上下文参数、会话字段与 TTL 策略都从实际依赖读取，不复制旧签名或假设统一 ID 字段。

库透传的原始 session 字段由项目基础设施适配为操作者契约；Controller/UseCase 通过该契约取身份，不在 Controller 查库或重新鉴权。角色、授权和数据范围由项目定义。

### 后台任务落地（设计范式：公司 lib 仓库文档）

异步 / 定时 / 父子拆分任务的**设计范式**（DB 为唯一真相源、SKIP LOCKED 并发 claim、attempt 级幂等、Go Worker 周期任务框架）定义在公司 lib 仓库 task 文档（**shw-lib-docs** 指路）。Go/GoFrame 落地：耗时任务不在 Controller 同步处理，提交到后台任务系统或 Go Worker 周期任务框架异步执行。

### 组件级通用范式（定义：公司 lib 仓库文档）

公司组件库的 10 条跨语言通用设计范式（Manager + Provider、接口契约 + 项目端实现、readonly 值对象、模板方法、事件驱动等）定义在公司 lib 仓库文档（**shw-lib-docs** 指路）。在 Go 里实现或迁移这些组件时，按 lib 文档的范式落地 Go 版本。

### 时间字段

- 领域实体用 `*time.Time`
- 生成 entity 用 `*gtime.Time`
- Record 转换：`record["x"].GTime().Time`

### 注释与提示

中文注释 + 中文 doc（`summary` / `dc` / 错误消息）。

---
