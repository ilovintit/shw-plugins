# 4. 错误处理落地：锁定依赖版本，保持原始语义

使用公司 gf-lib 的项目先通过 `shw-lib-docs` 读取锁定版本的 exception、response、middleware 文档与源码。错误载体、构造器、数据字段和响应接线由库定义；不在项目里另造 gcode detail/ErrorType 转换体系，也不把 `*exception.AppError` 压缩成只有 code/message 的错误。

- Controller 返回原始 `(res, err)`，统一响应交库中间件，不逐层转换或重建错误。
- 路由层校验、业务错误与未知异常必须按库的实际顺序分流；不能仅用一个自定义类型断言兜底所有错误。
- 未捕获普通 error/未知技术异常保持 HTTP 500 与内部错误语义，日志保留原始原因，响应不泄漏内部详情；不能默认归为应用失败并返回 HTTP 200。
- 没有公司 lib 的 GoFrame 项目可用 gerror/gcode，但须由项目架构定义响应契约；不得声称自定义 detail 与公司库自动兼容。
- 业务错误码按所属领域/应用契约定义，库保留码段直接引用；不要把所有模块业务码集中成 shared 根的第二份库规范。

接入示例不固定私有模块地址与易漂移构造器签名；实际 import、middleware 注册及测试断言从项目依赖的文档取证。

---
