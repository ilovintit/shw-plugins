# 7. Go 命名约定

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
| 类型字符串 | 全小写 | `StatusActive = "active"` |

### Good / Bad

| Good | Bad |
|------|-----|
| `UserRepository` + `UserRepositoryImpl` | `IUserRepository`（I- 前缀） |
| 包名 `entity`（路径体现 user 模块） | 包名 `userentity` |
| `json:"userId"` | `json:"user_id"` |

---
