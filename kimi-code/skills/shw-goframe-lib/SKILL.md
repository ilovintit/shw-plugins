---
name: shw-goframe-lib
description: gf-lib 组件库（Go/GoFrame 实现）的使用指南。在 GoFrame 项目里使用或集成公司组件库（会话、错误处理、后台任务、权限、附件、加密、序列号、分布式锁、验证码、短信、快递、企微、地区库等）时触发。讲每个组件的 Go 调用方法、配置、引入方式；设计思路和接口契约见各 shw-* 设计规范 skill。用户提到 gf-lib、组件库怎么用、session 怎么初始化、错误码怎么定义、Worker 怎么写时自动触发。
---

# gf-lib 组件库使用指南

## 概述

gf-lib 是公司组件库的 Go/GoFrame 实现。本 skill 是它的**使用指南**——讲每个组件怎么引入、怎么配置、怎么调。

**核心原则**：本 skill 只讲"Go/gf-lib 里怎么用"。设计思路（表结构、算法、为什么这样设计）不在这里重复，在各设计规范 skill 里查。

### 三层 skill 分工

| 你要查的 | 去哪个 skill |
|---------|------------|
| 组件的设计思路、表结构、算法、为什么这样设计 | 各 `shw-*` 设计规范 skill |
| **组件在 Go/gf-lib 里怎么 import、怎么初始化、怎么调** | **本 skill** |
| GoFrame 项目通用编码约定（DDD 分层、手工 DI、Controller 极薄、命名） | shw-goframe-conventions |
| 组件库跨语言通用设计范式（Manager+Provider 等 10 条） | shw-design-conventions |

### 组件清单与状态

| 组件 | 设计规范 skill | gf-lib 状态 | 说明 |
|------|--------------|------------|------|
| 会话 | shw-session | ✅ 已实现 | Redis Hash+Set + UUID token + 滑动过期 + 多角色参数化 |
| 错误处理 | shw-error-handling | ✅ 已实现 | gerror + gcode detail 反推 ErrorType |
| 后台任务 | shw-task | 🔶 部分 | 进程内周期 Worker 已实现；Table-First 双表/状态机/attempt 幂等/RetryScan 待迁移 |
| 分布式锁 | shw-redis-lock | 🔶 待确认 | SET NX EX + Lua owner 释放 |
| 权限系统 | shw-rbac | ❌ 待迁移 | 8 张表 + 权限点代码化 + 5 档数据范围 |
| 编码生成 | shw-seqnum | ❌ 待迁移 | Redis INCR + DB 恢复（带锁）+ N 进制 |
| 验证码 | shw-verify-code | ❌ 待迁移 | Redis 四键协同 + 频率限制 + 防爆破 |
| AES 加密 | shw-crypto | ❌ 待迁移 | AES-256-GCM + nonce[12]+tag[16]+ciphertext |
| 附件管理 | shw-attachment | ❌ 待迁移 | 前端直传 + 双表索引 + md5 去重 |
| 短信通知 | shw-sms | ❌ 待迁移 | Scene 枚举 + Provider 接口 + 日志驱动 |
| 快递物流 | shw-express | ❌ 待迁移 | Manager+Provider 胖接口 + 值对象转换 |
| 企业微信 | shw-wecom | ❌ 待迁移 | 两层设计 + Token 缓存去重 + 回调五步流水线 |
| 行政区划 | shw-region | ❌ 待迁移 | 只采集不存储 + 9 位 adcode + path 子树 |

> 状态随 gf-lib 完善更新：✅ 已实现 / 🔶 部分实现 / ❌ 待迁移

---

## 引入

<!-- TODO: 确认 gf-lib 的包路径和引入方式，替换下面的占位 -->

```bash
# 引入 gf-lib（包路径待确认）
go get github.com/yourorg/gf-lib
```

> **需要确认**：gf-lib 的实际 Go module 路径。下文所有 `import` 中的包路径均为占位，以实际为准。

---

## 已实现组件

### 会话（session）

设计范式（Redis Hash+Set 双结构、UUID token、滑动过期、多角色参数化、Bearer 中间件）见 **shw-session**。

#### 构造：三参数实例化

Go 用构造函数注入 Role/TTL/IDField 三参数，等价于 PHP 的模板方法模式（设计理由见 shw-session 第 3 节"参数注入两种落地形态"）：

```go
import "gf-lib/session"  // TODO: 确认实际包路径

// module.go 手工装配（非 DI 容器，非全局注册）
adminSession  := session.New("admin", 86400, "admin_id")   // 后台 24h
clientSession := session.New("client", 259200, "id")        // C 端 72h
```

| 参数 | 作用 | 示例 |
|------|------|------|
| Role | key 前缀隔离（跨端 token 天然失效） | `admin` / `client` |
| TTL | 会话有效期（秒） | 后台 86400 / C 端 259200 |
| IDField | Hash 中用户 ID 的字段名 | `admin_id` / `id` |

#### 中间件

```go
import "gf-lib/middleware"  // TODO: 确认实际包路径

// 认证中间件：取 Bearer token → Validate（刷新活跃 + 重置 TTL）→ 注入 context
adminAuth := middleware.Auth(adminSession)
clientAuth := middleware.Auth(clientSession)

// 仅超管端点中间件（读 session 里的 is_super_admin）
requireSuperAdmin := middleware.RequireSuperAdmin()
```

路由层挂哪个中间件就用哪套会话服务——管理员路由挂 adminAuth，C 端路由挂 clientAuth，天然隔离。

#### 取操作人

Controller / UseCase 统一从 context 取操作人，不查库（会话数据已在中间件注入 context）：

```go
operatorID := contextutil.OperatorID(ctx)
```

#### 核心 API

| 方法 | 说明 | 对应 shw-session 章节 |
|------|------|---------------------|
| `New(role, ttl, idField)` | 构造会话服务（三参数实例化） | 第 3 节 |
| `Create(userId, extraData)` | 登录创建会话，返回 token + 会话数据 | 第 6 节 Create |
| `Validate(token)` | 校验 + 刷新 last_active_at + 重置 TTL | 第 2 节 + 第 6 节 Validate |
| `Destroy(token)` | 销毁单条会话（主动登出） | 第 6 节 Destroy |
| `DestroyByUserID(userId)` | 销毁用户所有会话（踢下线 / 改密失效） | 第 6 节 DestroyByUserID |

> API 签名以 gf-lib 源码为准，此处基于 shw-session 设计契约列出。

---

### 错误处理（gerror + gcode detail）

设计范式（三分类 Domain/Application/Infrastructure、四字段响应、错误码编号规则、日志分级）见 **shw-error-handling**。

Go 没有继承也没有异常（error 是值），用 gerror + gcode detail 携带 ErrorType，中间件从 detail 反推类型映射 HTTP。

#### 错误类型枚举

```go
type ErrorType string

const (
    ErrorTypeDomain         ErrorType = "domain"          // → HTTP 422 / 日志 Warning
    ErrorTypeApplication    ErrorType = "application"     // → HTTP 200 / 日志 Info
    ErrorTypeInfrastructure ErrorType = "infrastructure"  // → HTTP 500 / 日志 Error
)
```

#### 错误码集中定义

错误码用 `var()` 块集中定义，每个 gcode 的 detail 参数携带 ErrorType：

```go
var (
    // 领域错误（1 开头）→ Domain → 422
    CodeUsernameDuplicated = gcode.New(10101, "用户名已存在", ErrorTypeDomain)
    CodeOrderStatusInvalid = gcode.New(10201, "订单状态不允许此操作", ErrorTypeDomain)

    // 应用错误（2 开头）→ Application → 200
    CodeUserNotFound = gcode.New(20101, "用户不存在", ErrorTypeApplication)
    CodeNoPermission = gcode.New(20102, "无权访问", ErrorTypeApplication)

    // 基础设施错误（5000x）→ Infrastructure → 500
    CodeDBConnectFailed = gcode.New(50001, "数据库连接失败", ErrorTypeInfrastructure)
    CodeRedisTimeout    = gcode.New(50002, "缓存超时", ErrorTypeInfrastructure)

    // 通用 / 兜底
    CodeValidationFailed = gcode.New(400,   "参数校验失败", ErrorTypeDomain)
    CodeUncatched        = gcode.New(99999, "系统繁忙",     ErrorTypeInfrastructure)
)
```

编号规则（领域 1+模块2位+序号2位、应用 2+模块+序号、通用 400/401/403/404、兜底 99999）见 **shw-error-handling** 第 3 节。

#### 抛错

```go
// 业务错误用 gerror.NewCode 抛出，统一响应中间件捕获处理
return gerror.NewCode(code.CodeUserNotFound, "用户不存在")
return gerror.NewCode(code.CodeUsernameDuplicated)
```

#### 统一响应中间件

中间件捕获 error → `gerror.Code(err)` 取 gcode → `code.Detail().(ErrorType)` 反推类型 → 查表映射 HTTP 状态码 → 输出四字段响应 `{ traceId, code, message, data }`：

```go
var errorTypeHTTPStatus = map[ErrorType]int{
    ErrorTypeDomain:         422,
    ErrorTypeApplication:    200,
    ErrorTypeInfrastructure: 500,
}
```

详细写法（中间件完整代码、兜底逻辑、成功响应）见 **shw-goframe-conventions** 第 4 节。

---

## 部分实现组件

### 后台任务（Worker 周期循环）

设计范式（Table-First、SKIP LOCKED 并发 claim、attempt 级幂等、Executor 不决策重试、4 种执行模式、Process 四级骨架）见 **shw-task**。

> ⚠️ **当前状态**：gf-lib 仅有进程内周期 Worker，**未实现** Table-First 任务管理。Table-First 相关功能（双表、状态机、attempt 幂等、RetryScan）以 shw-task 设计规范为准，待迁移。新设计后台任务一律按 shw-task 完整规范设计，不要因 Go 侧只有 Worker 就凑合。

#### 已实现：Worker 周期循环

```go
// TODO: 确认实际 API 签名，以下基于 shw-task 设计契约推断
wm := worker.NewManager()

w := worker.NewPeriodicWorker("scan-expired-orders", 5*time.Minute,
    func(ctx context.Context) error {
        // 周期执行的业务逻辑（调用 UseCase，不在 Worker 里写业务规则）
        return orderUseCase.CloseExpiredOrders(ctx)
    },
    worker.WithRedisLock(),     // 多实例部署时单实例互斥
)

wm.Register(w)
wm.Start()  // 信号驱动优雅退出（SIGINT/SIGTERM → 取消 → 等待退出）
```

已实现的能力：

| 能力 | 说明 |
|------|------|
| WorkerManager | 管理多个 Worker 的生命周期（注册 + 启动 + 优雅退出） |
| PeriodicWorker | 进程内 goroutine 周期循环（间隔触发） |
| WithRedisLock | 多实例部署时单实例互斥（抢到锁的实例才跑） |
| 信号驱动退出 | SIGINT/SIGTERM → 取消 context → 等待在途任务退出 |
| 双层 panic recover | Manager 级 + 单次执行级，一次 panic 不杀整个进程 |

这对应 shw-task 的 Process 四级骨架中的周期循环能力（第 2/4 级 + 第 3 级锁），但只是骨架的一小部分。

#### 缺失的（待迁移，以 shw-task 为准）

| 缺失项 | shw-task 对应章节 |
|--------|-----------------|
| task / task_attempt 双表 | 第二章 数据模型 |
| 状态机 + 合法流转校验 | 第三章 状态机 |
| 4 种执行模式（单实例/多实例 SKIP LOCKED/队列消费/父子拆分） | 第四章 |
| Table-First（消息只带 task_id，回查 DB） | 第一章 |
| Executor 不决策重试 + 独立 RetryScan | 第五章原则 1 + 第八章 |
| attempt 级幂等（抢占事务 + 回写校验） | 第五章原则 2 |
| Process 四级骨架完整（开关级/循环上限/内存上限/抖动） | 第七章 |

迁移 Go Worker 到 Table-First 时，以 shw-task 第一至九章为目标，不要把 Worker 当替代方案凑合。

---

## 待迁移组件

以下组件在 gf-lib 中尚未实现。设计或使用时一律以对应设计规范 skill 为准。

| 组件 | 设计规范 skill | 核心设计 |
|------|--------------|---------|
| 权限系统 | shw-rbac | 8 张表 + 权限点代码化（enum 非 DB 表）+ 5 档数据范围 + 多角色合并 |
| 编码生成 | shw-seqnum | Redis INCR + DB 恢复（**必须带 RedisLock**）+ N 进制短码压缩 |
| 验证码 | shw-verify-code | Redis 四键协同（码 + 频率 + 失败计数 + 锁定）+ 验证消费分离 |
| AES 加密 | shw-crypto | AES-256-GCM + nonce[12]+tag[16]+ciphertext 布局 + PBKDF2 派生 |
| 附件管理 | shw-attachment | 前端直传 OSS + uploads/attachments 双表 + md5 归档去重 |
| 短信通知 | shw-sms | Scene 枚举驱动 + Provider 接口可替换 + 日志驱动先行 |
| 快递物流 | shw-express | Manager+Provider 胖接口 + 追踪/下单两域 + 回调验签内置 |
| 企业微信 | shw-wecom | 两层设计 Foundation/Provider + Token 缓存去重 + 回调五步流水线 |
| 行政区划 | shw-region | 只采集不存储 + 9 位 adcode + path 路径枚举子树查询 |
| 分布式锁 | shw-redis-lock | SET NX EX + Lua owner 比对释放 + ForceRelease 运维逃生 |

迁移某个组件到 gf-lib 时：
1. 读对应设计规范 skill（理解设计契约和接口签名）
2. 读 shw-design-conventions（理解跨语言通用范式）
3. 在 gf-lib 中实现 Go 版本（按 Go 习惯落地接口）
4. 更新本 skill 的组件状态表（❌ → ✅）+ 补充使用方法

---

## 扩展新组件

gf-lib 新增组件时，遵循 **shw-design-conventions** 的 10 条通用范式。核心步骤：

1. **定义接口契约**：参考对应设计规范 skill 的伪代码接口
2. **实现 Provider / Service**：一个接口一个实现，config 驱动实例化
3. **多供应商场景**：Manager 按 config 动态实例化 + 进程内缓存（不硬编码 if-else）
4. **值对象 readonly**：Go 用 struct + 不导出 setter（构造函数一次性赋值）
5. **事件驱动**：Go 无事件总线时用回调函数 / 装饰器注入
6. **后台进程**：用环境变量 `PROC_{MODULE}_{NAME}` 控制开关
7. **Redis 操作**：key 带组件前缀、TTL 必须设置、关键写失败告警
8. **更新本 skill**：组件状态表 + 使用方法

---

## 何时调用本 skill

**调用：**

- 在 GoFrame 项目里使用 gf-lib 组件时（会话、错误处理、Worker 等）
- 查某个组件怎么 import、怎么初始化、怎么调
- 排查组件使用问题（配置错误、调用方式不对）
- 查 gf-lib 已实现哪些组件、哪些还在迁移中
- 新增或迁移组件到 gf-lib 时

**不调用：**

- 查设计思路、表结构、算法 → 各 `shw-*` 设计规范 skill
- 查 GoFrame 通用编码约定（DDD 分层、手工 DI、Controller、命名） → shw-goframe-conventions
- 查跨语言通用设计范式（Manager+Provider、模板方法等） → shw-design-conventions

---

## 底线

**设计规范 skill 讲"怎么设计"，本 skill 讲"Go 里怎么用"，goframe-conventions 讲"GoFrame 项目怎么写"。三层各司其职，不重叠。**

gf-lib 当前只实现了会话和错误处理（完整）、Worker 周期循环（部分）。其余组件在迁移中，设计一律以对应设计规范 skill 为准，不要因 Go 侧尚未实现就擅自简化。

每个组件迁移完成后，更新本 skill 的状态表并补充使用方法。
