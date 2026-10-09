# 1. 项目分层落地（设计规范：shw-ddd）

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
└── module.go              # 模块路由注册 + 手工依赖注入（装配处，见 dependency-injection.md）
```

跨模块公共代码（对应 shw-ddd 的 Shared 层）放 `internal/shared/`，同样保持四层：业务码归 `shared/domain/`，应用公共契约归 `shared/application/`，上下文/中间件实现归 `shared/infrastructure/`，请求链装配归 `shared/interfaces/`；不在 shared 根平铺技术包。

### 各层落地职责（对应 shw-ddd 的层定义）

| 层 | Go 落地 | 不做 |
|----|------|------|
| `domain/` | 纯业务：手写实体、仓储接口、领域服务 | 不依赖框架 DB 层 |
| `application/` | UseCase 编排领域对象（结构体，非接口） | 不写业务规则 |
| `interfaces/` | Controller 极薄（见 [Controller 规范](controllers.md)） | 不含业务逻辑、不做权限、不做数据范围 |
| `infrastructure/` | 仓储接口的 DB 实现，做数据格式转换 | 不做业务判断 |
| `module.go` | 模块入口：集中做路由注册和依赖注入 | — |

### Good / Bad

| Good | Bad |
|------|-----|
| 按模块四层组织 `internal/module/{module}/` | 用官方默认的 `controller/` `service/` `dao/` 平铺 |
| 领域实体手写在 `domain/entity/` | 业务直接用生成的 `model/entity.User` |
| 仓储接口在 `domain/repository/`，实现在 `infrastructure/` | 把接口和实现放一起 |

---
