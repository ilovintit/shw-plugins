---
name: shw-goframe-conventions
description: 公司设计规范（DDD 四层架构、错误处理体系、RBAC 权限、后台任务、会话管理等，定义在各 shw-* 设计规范 skill）在 Go/GoFrame（GoFrame v2）项目里的落地实现指南。在各 shw-* 设计规范 skill 确定了架构/流程后，把这些规范翻译成具体 Go/GoFrame 代码时触发：项目分层落地、手工依赖注入、gerror+gcode 错误处理落地、Controller 极薄实现、DAO/Entity 用法、decimal string 金额精度、Go 命名约定。最近 go.mod 含 github.com/gogf/gf/v2 时适用。
---

# Go/GoFrame 设计规范落地实现指南

## 概述

本 skill 是**公司设计规范在 Go/GoFrame（GoFrame v2）项目里的落地实现指南**。

设计规范本身——跨语言的架构（DDD 四层）、错误分类体系、RBAC 权限模型、后台任务流程、会话机制等——定义在各 shw-* 设计规范 skill（shw-ddd / shw-error-handling / shw-rbac / shw-task / shw-session / shw-design-conventions）。本 skill **只写一件事：这些规范在 Go/GoFrame 里用什么语法、什么组件、什么目录结构去落地实现**，不重复规范的架构推导与流程描述。

**三条贯穿全文的实现决策**（本 skill 的核心立场）：

1. **手工依赖注入**（Go 社区标准，构造函数注入 + 模块自治装配；不引入 DI 容器，不用 GoFrame service 全局注册）
2. **gerror + gcode detail 反推错误类型**（用 GoFrame 官方机制，detail 携带 ErrorType，中间件类型断言反推 HTTP 状态码；不自建异常体系，不靠码值范围判断）
3. **Controller 极薄**（只取操作人 → 调 UseCase → 组装 Res；参数校验 / 权限 / 数据范围都不在 Controller）

**适用判断**：最近 `go.mod` 含 `github.com/gogf/gf/v2`，且架构 / 权限 / 错误等设计已由对应 shw-* 规范 skill 确定，需要在 Go 代码里落地时按本 skill 走。

**与官方 goframe skill 的分工**：本 skill 管"公司规范怎么用 GoFrame 落地"，GoFrame 框架通用知识（DO 对象基础用法、gvalid 规则语法、软删除自动维护、中间件基础、gerror 通用 API、gf gen dao 配置）参见官方 goframe skill，不展开。

---

## 1. 项目分层落地（设计规范：shw-ddd）

DDD 四层架构的层职责、依赖方向、Module 与 Shared 的划分原则等**架构规范**定义在 **shw-ddd**（其分层理念跨语言通用）。本节只写这些规范在 Go/GoFrame 里的**目录组织与装配落地**。

### Go 目录结构

四层（domain / application / interfaces / infrastructure）按业务模块切分，全部置于 `internal/module/{module}/`，不用 GoFrame 默认的 controller/service/dao 平铺：

```
internal/module/user/
├── domain/
│   ├── entity/            # 领域实体 + 业务规则方法 + 常量（手写，非生成）
│   │   └── entity.go      # type User struct
│   ├── repository/        # 仓储接口（interface 定义）
│   │   └── repository.go  # type UserRepository interface
│   └── service/           # 领域服务（跨实体复杂逻辑，可选，仅复杂模块有）
├── application/           # UseCase（应用服务，编排领域对象，结构体非接口）
│   └── usecase.go         # type UserUseCase struct
├── interfaces/            # Controller（HTTP，薄）
│   └── controller.go      # type UserController struct
├── infrastructure/        # 仓储接口的 DB 实现
│   └── repo_impl.go       # type UserRepositoryImpl struct
└── module.go              # 模块路由注册 + 手工依赖注入（装配处，见第 2 节）
```

跨模块公共代码（对应 shw-ddd 的 Shared 层）放 `internal/shared/`，如 `shared/code/` 错误码、`shared/errtype/` 错误类型、`shared/contextutil/` 上下文工具。

### 各层落地职责（对应 shw-ddd 的层定义）

| 层 | Go 落地 | 不做 |
|----|------|------|
| `domain/` | 纯业务：手写实体、仓储接口、领域服务 | 不依赖框架 DB 层 |
| `application/` | UseCase 编排领域对象（结构体，非接口） | 不写业务规则 |
| `interfaces/` | Controller 极薄（见第 3 节） | 不含业务逻辑、不做权限、不做数据范围 |
| `infrastructure/` | 仓储接口的 DB 实现，做数据格式转换 | 不做业务判断 |
| `module.go` | 模块入口：集中做路由注册和依赖注入 | — |

### Good / Bad

| Good | Bad |
|------|-----|
| 按模块四层组织 `internal/module/{module}/` | 用官方默认的 `controller/` `service/` `dao/` 平铺 |
| 领域实体手写在 `domain/entity/` | 业务直接用生成的 `model/entity.User` |
| 仓储接口在 `domain/repository/`，实现在 `infrastructure/` | 把接口和实现放一起 |

---

## 2. 依赖注入落地：手工 DI（设计规范：shw-ddd）

依赖倒置的架构原则（domain 定义接口、infrastructure 实现、application 依赖接口）参见 **shw-ddd**。本节写 Go/GoFrame 里**怎么装配**——答案就是手工依赖注入。

### 落地决策：手工 DI

依赖在 `module.go` 一处手工构造 + 注入：先 new 实现，再把实现作为构造函数参数注入到 UseCase，最后注入到 Controller。UseCase 构造函数参数声明为接口类型，由 `module.go` 传入具体实现，依赖倒置靠手工装配实现。

```go
// internal/module/user/module.go
func init() {
    // 手工构造：先 new 实现，再注入到 UseCase，最后到 Controller
    userRepo := infrastructure.NewUserRepositoryImpl()
    userUC := application.NewUserUseCase(userRepo)
    userController := interfaces.NewUserController(userUC)
    // 路由注册 ...
}

// internal/module/user/application/usecase.go
func NewUserUseCase(userRepo repository.UserRepository) *UserUseCase {
    return &UserUseCase{userRepo: userRepo}
}
```

### 为什么 Go 不做 DI 容器 / 不用 GoFrame service 全局注册

| 理由 | 说明 |
|------|------|
| 编译型语言 | Go 没有 PHP 每次请求重新初始化的开销，DI 容器解决"重复构造性能问题"的前提不成立 |
| 单例成本低 | 运行时单例用 `sync.Once` 或包级变量即可，无需容器托管 |
| 显式优于隐式 | Go 社区文化强调依赖关系肉眼可见，容器 / 反射装配违背这一原则 |
| 工具已停滞 | `uber/fx`、`google/wire`（已归档）等容器方案不是社区主流推荐 |

GoFrame 官方的 `service.SetXxx()` + `interface + init()` 全局注册本质是 **Service Locator**（运行时全局查找），不是 DI，且依赖关系隐式散落各包 `init()`，**不用**。

### Good / Bad

| Good | Bad |
|------|-----|
| `module.go` 手工 new 实现 + 注入到 UseCase | 用 `service.SetUser()` + `init()` 全局注册 |
| UseCase 字段是接口类型 | UseCase 直接依赖 `*UserRepositoryImpl` 具体类型 |
| 依赖在 `module.go` 一目了然 | 依赖靠隐式 `init()` 散落各包 |
| 单例用 `sync.Once` / 包级变量 | 引入 `uber/fx` / `google/wire` 容器 |

---

## 3. Controller 落地：极薄 + 规范路由（设计规范：shw-ddd + shw-rbac）

Controller 的职责边界、参数校验分层、数据范围归属等**规范**定义在 **shw-ddd**；权限检查的三层分层、数据范围档位、权限点定义等**规范**定义在 **shw-rbac**。本节写这些规范在 Go/GoFrame Controller 层的**落地写法**。

### 落地决策：Controller 极薄

Controller 只做三件事：

```
取操作者身份（从 context）→ 调 UseCase → 组装 Res 返回
```

参数校验、权限判断、数据范围**都不在 Controller**：

| 职责 | 落在哪 | Go/GoFrame 怎么实现 |
|------|--------|------|
| 参数校验 | 路由层（gvalid） | Req 结构体的 `v:` tag 自动校验，Controller 被调用时参数已合法 |
| 权限判断（Authorization） | 中间件 | 认证 + 权限点检查，Controller 不做（shw-rbac 的三层分层） |
| 数据范围（Data Scope） | UseCase | 每个 UseCase 方法按入口定义自己的数据范围（shw-rbac 的数据范围档位） |
| 业务编排 | UseCase | Controller 不含业务逻辑 |

### 规范路由：Req/Res + g.Meta tag

用 GoFrame 规范路由，Req/Res 结构体定义在 `api/{module}/v1/`：

```go
// api/user/v1/user.go
type CreateUserReq struct {
    g.Meta   `path:"/users" method:"post" tags:"用户"`
    Username string `v:"required|length:3,20#请输入用户名|用户名长度3-20"`
    Email    string `v:"required|email#请输入邮箱|邮箱格式不正确"`
}

type CreateUserRes struct {
    Id       int64  `json:"id"`
    Username string `json:"username"`
}
```

gvalid 在路由层自动校验，Controller 被调用时 `req` 已合法，**无需手写 `if` 校验**。

### Controller 固定写法（三件事）

```go
func (c *UserController) GetUser(
    ctx context.Context,
    req *userapi.GetUserReq,
) (res *userapi.GetUserRes, err error) {
    // 1. 取操作者身份（从 context，不查库；底层由 shw-session 的中间件注入）
    operatorID := contextutil.OperatorID(ctx)
    // 2. 调 UseCase（数据范围由 UseCase 方法签名决定）
    user, err := c.userUC.GetForCustomer(ctx, operatorID, req.Id)
    if err != nil {
        return nil, err
    }
    // 3. 组装 Res 返回
    return &userapi.GetUserRes{
        Id:       user.Id,
        Username: user.Username,
    }, nil
}
```

### 数据范围在 UseCase（不在 Controller）

shw-rbac 的数据范围规范落地方式：按调用入口定义不同 UseCase 方法，每个方法内部校验数据范围。Controller 保持极薄，数据范围规则集中在 UseCase 易测试、易复用。

```go
// application/usecase.go
func (uc *UserUseCase) GetForAdmin(ctx context.Context, userID int64) (*entity.User, error) {
    // 管理员可查任意用户，无数据范围限制
    return uc.userRepo.FindByID(ctx, userID)
}

func (uc *UserUseCase) GetForCustomer(ctx context.Context, operatorID, userID int64) (*entity.User, error) {
    // 普通用户只能查自己
    if operatorID != userID {
        return nil, gerror.NewCode(code.CodeUserNotFound) // 不泄露存在性
    }
    return uc.userRepo.FindByID(ctx, userID)
}
```

### 权限检查落地（中间件 + Controller 显式 check）

shw-rbac 定义权限检查三层分层。Go/GoFrame 落地：路由级权限点由中间件统一检查；个别需要行级 / 字段级细控的，在 Controller 或 UseCase 里显式调 `rbac.Check(ctx, perm)`。**不要**在 Controller 里手写角色判断。

### Good / Bad

| Good | Bad |
|------|-----|
| Controller 只取操作人 + 调 UseCase + 组装 Res | Controller 里写业务逻辑、查库 |
| 数据范围在 UseCase（`GetForAdmin`/`GetForCustomer`） | 数据范围检查塞进 Controller |
| 校验靠 Req 的 `v:` tag | Controller 里 `if` 手写校验 |
| 权限点在中间件检查 | Controller 里判断角色权限 |

---

## 4. 错误处理落地：gerror + gcode detail 反推（设计规范：shw-error-handling）

统一响应四字段（traceId / code / message / data）、错误三分类（Domain / Application / Infrastructure → HTTP 422 / 200 / 500）、错误码编号规则、日志分级等**设计范式**定义在 **shw-error-handling**（该 skill 已覆盖 Go 标准方案）。本节聚焦这些范式在 Go/GoFrame 项目里的**落地写法与代码组织**。

### 落地决策：gerror + gcode，不自建异常体系

业务错误用 GoFrame 官方 `gerror` + `gcode`。核心落地手法：`gcode.New(code, message, detail)` 的 `detail` 字段携带 `ErrorType`，中间件用 `code.Detail()` 类型断言精确反推错误类型并映射 HTTP 状态码，**不用错误码数值范围判断**。

```go
// internal/shared/errtype/errtype.go —— ErrorType（对应 shw-error-handling 的三分类）
type ErrorType string

const (
    ErrorTypeDomain         ErrorType = "domain"         // 业务规则违反 → 422
    ErrorTypeApplication    ErrorType = "application"    // 资源不存在等业务流程 → 200
    ErrorTypeInfrastructure ErrorType = "infrastructure" // DB/Redis 故障 → 500
)

// 错误类型 → HTTP 状态码映射
var errorTypeHTTPStatus = map[ErrorType]int{
    ErrorTypeDomain:         422,
    ErrorTypeApplication:    200,
    ErrorTypeInfrastructure: 500,
}
```

### 抛错写法

```go
import "github.com/gogf/gf/v2/errors/gerror"

// 业务规则违反（领域错误）
return nil, gerror.NewCode(code.CodeUsernameDuplicated)

// 资源不存在（应用错误）
return nil, gerror.NewCode(code.CodeUserNotFound)

// 基础设施故障
return nil, gerror.NewCode(code.CodeDBConnectFailed)
```

### 中间件：从 detail 反推类型，装配统一响应

```go
// 统一响应中间件 —— 落地 shw-error-handling 的四字段响应
func Response(r *ghttp.Request) {
    r.Middleware.Next()
    if err := r.GetCtxError(); err != nil {
        gc := gerror.Code(err)
        errType, ok := gc.Detail().(errtype.ErrorType)
        if !ok {
            errType = errtype.ErrorTypeApplication // 兜底
        }
        httpStatus := errorTypeHTTPStatus[errType] // 422 / 200 / 500
        r.Response.WriteStatusExit(httpStatus, g.Map{
            "traceId": gtrace.TraceID(r.Context()),
            "code":    gc.Code(),
            "message": gc.Message(),
            "data":    g.Map{},
        })
    }
}
```

关键：HTTP 状态码由 `detail` 反推，而不是用 code 数值范围（如 `if code >= 10000 && code < 20000`）硬判断。数值范围判断脆弱（新增码段易错），detail 类型断言精确且自描述。

### 错误码集中定义：var() 块

错误码集中在一个文件，用 Go 的 `var()` 块统一定义（Go 的"枚举类"），放 `internal/shared/code/codes.go`。编号规则（层前缀 + 模块前缀 + 序号）的设计参见 **shw-error-handling**。

```go
// internal/shared/code/codes.go
package code

import "github.com/gogf/gf/v2/errors/gcode"

var (
    // 领域层（业务规则违反）—— 1 + 模块前缀(2位) + 序号(2位)
    CodeUsernameDuplicated = gcode.New(10101, "用户名已存在", errtype.ErrorTypeDomain)
    CodeOrderStatusInvalid = gcode.New(10201, "订单状态非法", errtype.ErrorTypeDomain)

    // 应用层（业务流程）—— 2 + 模块前缀(2位) + 序号(2位)
    CodeUserNotFound  = gcode.New(20101, "用户不存在", errtype.ErrorTypeApplication)
    CodeOrderNotFound = gcode.New(20201, "订单不存在", errtype.ErrorTypeApplication)

    // 基础设施层 —— 5 + 序号
    CodeDBConnectFailed = gcode.New(50001, "数据库连接失败", errtype.ErrorTypeInfrastructure)
    CodeRedisTimeout    = gcode.New(50002, "缓存超时", errtype.ErrorTypeInfrastructure)
)
```

### Good / Bad

| Good | Bad |
|------|-----|
| `gerror.NewCode(code.CodeUserNotFound)` | 自建独立异常体系（手写 error 类型和构造函数） |
| 错误类型靠 `code.Detail()` 类型断言 | 靠 code 数值范围判断类型 |
| 错误码集中在 `shared/code/codes.go` 的 `var()` 块 | 各模块自己定义零散错误码 |
| 错误消息用中文 | 英文错误消息 |
| 业务错误 `return err` | 业务错误一律 panic |

---

## 5. DAO / Entity 落地：生成的 DB 映射 vs 手写领域实体（设计规范：shw-ddd）

领域实体与数据表的分离原则、Repository 模式等**架构规范**定义在 **shw-ddd**。本节写这些规范在 Go/GoFrame 里用 `gf gen dao` 生成机制 + 手写领域实体的**落地写法**。

### 生成机制

DAO 和 Entity 由 `gf gen dao` 生成（DO NOT EDIT），配置在 `config.yaml` 的 `gfcli.gen.dao`，`jsonCase: "CamelLower"`。生成的三层 model：

```
internal/dao/internal/    # 生成的 DAO 内部结构，含 XxxColumns 列名常量
internal/dao/             # 可扩展的 DAO 入口
internal/model/entity/    # 生成的表结构 entity（纯 DB 映射）
internal/model/do/        # DataObject
```

### 关键落地：业务层不用生成的 entity，用 domain/entity 手写领域实体

业务层用 `domain/entity/` 里**手写**的领域实体（带冗余 JOIN 字段和业务规则方法），与生成的 `model/entity.User` 字段不同。生成的 entity 仅作 DB 映射和 DAO 内部使用，不直接进业务层。

### 写操作数据结构

写操作用 `gdb.Map`（**非** `g.Map`）；批量用 `[]gdb.Map`；WhereIn 用 `g.Slice{...}`。

```go
data := gdb.Map{
    "username": user.Username,
    "status":   user.Status,
}
dao.Users.Ctx(ctx).Data(data).Insert()
```

### 链式查询

```go
dao.Users.Ctx(ctx).
    LeftJoin("orders", "orders.user_id = users.id").
    Fields(userJoinFields).
    Where("users.id", id).
    One()
```

### Good / Bad

| Good | Bad |
|------|-----|
| 业务用 `domain/entity.User`（手写领域实体） | 业务直接用 `model/entity.User` |
| 写操作用 `gdb.Map` | 写操作用 `g.Map` |
| WhereIn 用 `g.Slice{...}` | WhereIn 用裸 `[]interface{}` |

DO 对象基础用法（`do.User{...}`）、软删除自动维护等通用知识参见官方 goframe skill。

---

## 6. 金额精度落地：decimal string

金额精度规范归属**本 skill 此节**——decimal string 类型选择、禁止浮点、精确运算的完整规范都在本节定义，不引用外部 skill。

### 落地决策：decimal string

业务领域实体的金额字段用 `string`（decimal string），**禁止** `float64`。生成的 entity 可能是 `float64`，但业务层特意避免浮点，用手写领域实体的 string 表达金额。

```go
// domain/entity/entity.go（领域实体，string）
type Order struct {
    TotalAmount string  // decimal string，如 "199.99"
}
```

### 精确运算

用 bcmath 风格函数：`bcAdd` / `bcMul` / `bcDiv` / `bcSub`，不直接用 `+` `-` `*` `/`。

### Good / Bad

| Good | Bad |
|------|-----|
| `TotalAmount string`（decimal string） | `TotalAmount float64` |
| 金额运算用 `bcAdd/bcMul/bcDiv/bcSub` | 金额用 `+` `-` `*` `/` 直接算 |
| 比较金额先转 decimal 再比 | 金额直接 `==` 比较 |

---

## 7. Go 命名约定

Go 语言特定的命名约定（设计规范层面的命名见各 shw-* skill，本节是 Go 语法层的落地）。

### 包名

全小写单词，多为**架构层名**（entity / repository / service / application / controller / infrastructure），而非模块名。模块名体现在目录路径上。

```go
package entity         // 路径 internal/module/user/domain/entity
package repository     // 路径 internal/module/user/domain/repository
package application    // 路径 internal/module/user/application
```

### 文件名

全小写 + 下划线；层内通用文件用单数名词。

- `user_order.go`（业务文件，下划线）
- `usecase.go` / `controller.go` / `entity.go`（层内通用文件，单数名词）

### 类型 / 函数

PascalCase；构造函数统一 `NewXxx` 前缀（`NewUserUseCase`、`NewUserRepositoryImpl`）。

### 接口命名

**无 I- 前缀**，实现名 `XxxImpl`。

| 接口 | 实现 |
|------|------|
| `UserRepository` | `UserRepositoryImpl` |

### JSON 字段

统一 lowerCamelCase（`userId` / `createdAt`），生成配置 `jsonCase: "CamelLower"`。

### 常量风格

| 类型 | 风格 | 示例 |
|------|------|------|
| 错误码变量 | PascalCase + Code 前缀 | `CodeUserNotFound` |
| 业务常量 | PascalCase 无前缀 | `StatusDraft` |
| 类型字符串 | 全小写 | `ErrorTypeDomain = "domain"` |

### Good / Bad

| Good | Bad |
|------|-----|
| `UserRepository` + `UserRepositoryImpl` | `IUserRepository`（I- 前缀） |
| 包名 `entity`（路径体现 user 模块） | 包名 `userentity` |
| `json:"userId"` | `json:"user_id"` |

---

## 8. 其他落地约定

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

落地 shw-error-handling 的四字段响应，由第 4 节的统一响应中间件装配：

```json
{ "traceId": "...", "code": 0, "message": "...", "data": { ... } }
```

成功 `code=0`。

### 会话落地（设计规范：shw-session）

登录态、token 认证、操作者身份存取的**设计范式**（Redis Hash + Set 双结构、UUID token、滑动过期、多角色实例化、Bearer 中间件注入 context）定义在 **shw-session**。Go/GoFrame 落地要点：

**构造函数注入（多角色参数化）**：Go 用构造函数注入 Role/TTL/IDField 三参数，与 PHP 的模板方法模式等价（见 shw-session 第 3 节"参数注入两种落地形态"），在 `module.go` 手工装配：

```go
// module.go 手工装配会话服务（非 DI 容器，非全局注册）
adminSession := session.New("admin", 86400, "admin_id")  // 后台 24h
clientSession := session.New("client", 259200, "id")      // C 端 72h

// 中间件按角色绑定各自的 SessionService
adminMiddleware := middleware.Auth(adminSession)
clientMiddleware := middleware.Auth(clientSession)
```

**Bearer 中间件**：从请求头取 `Authorization: Bearer {token}` → 调 `SessionService.Validate(token)` → 把操作者身份注入 `context`（Validate 内部刷新 last_active_at + 重置 TTL）。

**取操作人**：Controller / UseCase 统一用 `contextutil.OperatorID(ctx)` 取操作人，不查库（会话数据已在中间件注入 context）。

### 后台任务落地（设计规范：shw-task）

异步 / 定时 / 父子拆分任务的**设计范式**（DB 为唯一真相源、SKIP LOCKED 并发 claim、attempt 级幂等、Go Worker 周期任务框架）定义在 **shw-task**。Go/GoFrame 落地：耗时任务不在 Controller 同步处理，提交到后台任务系统或 Go Worker 周期任务框架异步执行。

### 组件级通用范式（设计规范：shw-design-conventions）

公司组件库的 10 条跨语言通用设计范式（Manager + Provider、接口契约 + 项目端实现、readonly 值对象、模板方法、事件驱动等）定义在 **shw-design-conventions**。在 Go 里实现或迁移这些组件时，按该 skill 的范式落地 Go 版本。

### 时间字段

- 领域实体用 `*time.Time`
- 生成 entity 用 `*gtime.Time`
- Record 转换：`record["x"].GTime().Time`

### 注释与提示

中文注释 + 中文 doc（`summary` / `dc` / 错误消息）。

---

## 何时调用本 skill

- 架构 / 权限 / 错误等设计已由对应 shw-* 设计规范 skill 确定，需要在 Go/GoFrame 代码里**落地实现**时
- 新建模块、新建文件时判断该放哪层、怎么装配
- 涉及依赖注入、错误处理写法、Controller 职责、金额精度、DAO 查询写法时
- 判断是否该引入 DI 容器、是否该自建异常体系时（答案都是：不要）
- 与官方 goframe skill 配合：规范怎么落地查本 skill，框架通用知识查官方 skill

---

## 环境搭建与 skill 安装

涉及 GoFrame 官方 skill 安装、与公司规范的分工边界、安装失败降级方案时，读 @setup.md

---

## PHP → Go 迁移陷阱

PHP 开发者写 Go 时逐条核对的迁移陷阱清单（nil/error-first/指针/map/decimal 等），读 @migration.md
