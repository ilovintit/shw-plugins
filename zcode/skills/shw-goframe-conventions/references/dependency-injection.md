# 2. 依赖注入落地：手工 DI（设计规范：shw-ddd）

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
