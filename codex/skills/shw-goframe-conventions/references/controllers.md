# 3. Controller 落地：极薄 + 规范路由（架构规范：shw-ddd；权限规范：项目架构与实际依赖契约）

Controller 的职责边界、参数校验分层、数据范围归属等**架构规范**定义在 **shw-ddd**；权限检查、数据范围与权限点定义按项目架构；认证等实际依赖组件经 **shw-lib-docs** 查锁定版本文档。本节写这些规范在 Go/GoFrame Controller 层的**落地写法**。

### 落地决策：Controller 极薄

Controller 只做三件事：

```
取操作者身份（从 context）→ 调 UseCase → 组装 Res 返回
```

参数校验、权限判断、数据范围**都不在 Controller**：

| 职责 | 落在哪 | Go/GoFrame 怎么实现 |
|------|--------|------|
| 参数校验 | 路由层（gvalid） | Req 结构体的 `v:` tag 自动校验，Controller 被调用时参数已合法 |
| 权限判断（Authorization） | 中间件 | 认证 + 权限点检查，Controller 不做（语义由项目权限契约定义） |
| 数据范围（Data Scope） | UseCase | 每个 UseCase 方法按入口定义自己的数据范围（范围定义见项目权限契约） |
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
    // 1. 取操作者身份（从 context，不查库；底层由会话中间件注入，见 lib 仓库 session 文档）
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

项目数据范围契约的落地方式：按调用入口定义不同 UseCase 方法，每个方法内部校验数据范围。Controller 保持极薄，数据范围规则集中在 UseCase 易测试、易复用。

```go
// application/usecase.go
func (uc *UserUseCase) GetForAdmin(ctx context.Context, userID int64) (*entity.User, error) {
    // 管理员可查任意用户，无数据范围限制
    return uc.userRepo.FindByID(ctx, userID)
}

func (uc *UserUseCase) GetForCustomer(ctx context.Context, operatorID, userID int64) (*entity.User, error) {
    // 普通用户只能查自己
    if operatorID != userID {
        return nil, ErrUserNotFound // 项目应用错误，按锁定 lib 契约构造；不泄露存在性
    }
    return uc.userRepo.FindByID(ctx, userID)
}
```

### 权限检查落地（中间件 + UseCase）

路由级权限点在项目中间件检查；需要行级/字段级授权时，在 UseCase 调用项目权限契约并检查数据范围。Controller 只调用 UseCase，不放权限判断。gf-lib 的 Auth 负责认证与原始 session 数据注入，项目角色/权限语义由项目实现；不得假设库提供 `rbac.Check` 或根据历史 skill 自造 API。

### Good / Bad

| Good | Bad |
|------|-----|
| Controller 只取操作人 + 调 UseCase + 组装 Res | Controller 里写业务逻辑、查库 |
| 数据范围在 UseCase（`GetForAdmin`/`GetForCustomer`） | 数据范围检查塞进 Controller |
| 校验靠 Req 的 `v:` tag | Controller 里 `if` 手写校验 |
| 权限点在中间件检查 | Controller 里判断角色权限 |

---
