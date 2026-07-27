---
name: shw-ddd
description: PHP+Hyperf 项目的 DDD 四层架构规范。涉及后端目录划分、新建文件放哪层、跨层依赖方向、命名约定时调用。定义 Module 与 Shared 的完整层级结构。用户提到 DDD、四层架构、目录结构、某文件该放哪层时自动触发。
---

# DDD 四层架构规范（PHP+Hyperf）

## 概述

本 skill 是后端 DDD 四层架构的**单一权威定义**。所有后端文件必须按此规范归位，跨层依赖必须遵循此规范的方向约束。

**核心原则**：架构分层是强约束，不是建议。放错层 = 技术债。

---

## 依赖方向（不可违反）

```
Interface ──→ Application ──→ Domain ←─── Infrastructure
   (入口)        (编排)        (核心)        (实现)
                                   ↑
                          Infrastructure 实现 Domain 的 Repository 接口
                          （依赖倒置：Domain 定义契约，Infrastructure 实现）
```

**铁律**：
- Domain 层**不依赖**任何外层（不 import Infrastructure、不 import Application、不依赖 Eloquent Model）
- Infrastructure **依赖** Domain（实现 Domain 定义的 Repository 接口）
- Application 编排 Domain（调用 Domain Service / Repository 接口）
- Interface 只调用 Application（不直接碰 Domain 或 DB）
- 所有箭头指向 Domain，Domain 是最内层

---

## Module 层级结构

每个业务模块是一个独立、完整的四层结构。模块路径：`src/api/app/Module/{Module}/`

```
src/api/app/Module/{Module}/
│
├── Interface/                      # 外部交互层（系统入口）
│   ├── {End}/                      # 按端分组（Platform/Client/Tenant 等）
│   │   ├── Http/                   #   Controller（只做参数提取 + 调用 UseCase）
│   │   └── Command/                #   该端的 CLI 命令（Hyperf Command）
│   ├── Process/                    # 常驻进程（队列消费者、定时任务、WebSocket 等）
│   └── Exception/                  # 接口层异常（如参数校验异常的 handler）
│
├── Application/                    # 应用服务层（业务编排，不含业务规则）
│   ├── ReqDTO/                     # 请求 DTO（入参结构体）
│   ├── ResDTO/                     # 响应 DTO（出参结构体）
│   ├── UseCase/                    # 用例（编排 Domain Service / Repository 完成一个业务操作）
│   ├── Listener/                   # 事件监听器（监听 Domain Event，做副作用）
│   └── Exception/                  # 应用层异常（如"用户不存在"、"权限不足"）
│
├── Domain/                         # 领域层（核心业务规则，纯业务，不依赖任何框架/DB）
│   ├── Entity/                     # 聚合根 + 实体（含业务行为方法）
│   ├── ValueObject/                # 值对象（无唯一标识，不可变，如 Money、Address）
│   ├── Service/                    # 领域服务（跨实体的业务逻辑，不属于单个 Entity）
│   ├── Repository/                 # Repository 接口（契约，只定义，不实现）
│   ├── Contract/                   # 其他领域契约/接口（如外部系统的防腐层接口）
│   ├── Event/                      # 领域事件（如 UserRegistered、OrderCompleted）
│   ├── CodeRule/                   # 编码规则（业务编码生成逻辑，如订单号生成规则）
│   └── Exception/                  # 领域异常（如"库存不足"、"状态不允许此操作"）
│
└── Infrastructure/                 # 基础设施层（技术实现细节）
    ├── Model/                      # Eloquent Model（DB 表映射，不进 Domain）
    ├── Implement/                  # Repository 接口的实现（查 DB，转 Entity）
    └── Exception/                  # 基础设施异常（如 DB 连接失败、第三方 API 超时）
```

### 每层子目录职责详解

#### Interface 层 — "系统入口"

| 子目录 | 放什么 | 不放什么 |
|--------|--------|---------|
| `{End}/Http/` | Controller（接收 HTTP 请求、参数提取、调用 UseCase、返回响应） | ❌ 业务逻辑、❌ 直接查 DB |
| `{End}/Command/` | Hyperf Command（CLI 命令，如数据修复、批处理） | ❌ 业务逻辑（调 UseCase） |
| `Process/` | 常驻进程（消费 MQ、定时任务、长连接） | ❌ 业务逻辑（调 UseCase） |
| `Exception/` | 接口层异常 handler | — |

**`{End}` 按端分组原则**：同一模块服务多个端时，每端一个子目录（如 `Platform/`、`Client/`、`Tenant/`）。Controller 放在各自端的 `Http/` 下，不混放。

#### Application 层 — "业务编排"

| 子目录 | 放什么 | 不放什么 |
|--------|--------|---------|
| `ReqDTO/` | 请求参数结构体（从 Controller 传入 UseCase） | ❌ 业务校验规则（放 Domain） |
| `ResDTO/` | 响应数据结构体（UseCase 返回给 Controller） | ❌ 直接映射 DB（用 Entity 转） |
| `UseCase/` | 用例类（编排多个 Domain Service / Repository 完成一个业务操作） | ❌ 业务规则（放 Domain Service） |
| `Listener/` | 事件监听器（监听 Domain Event，执行副作用如发通知） | ❌ 业务规则（只编排） |
| `Exception/` | 应用层异常（业务流程中的异常，如"资源不存在"、"操作无权限"） | ❌ 技术异常（放 Infrastructure） |

**UseCase 的职责边界**：UseCase 编排流程（"先查、再校验、再改、再发事件"），但**业务规则由 Domain Service / Entity 承载**。UseCase 调用它们，不自己写规则。

#### Domain 层 — "核心业务规则"

| 子目录 | 放什么 | 不放什么 |
|--------|--------|---------|
| `Entity/` | 聚合根 + 实体（有唯一标识，含业务行为方法） | ❌ Eloquent Model、❌ DB 查询 |
| `ValueObject/` | 值对象（无标识，不可变，如金额、地址、状态码） | ❌ 可变状态 |
| `Service/` | 领域服务（跨实体业务逻辑，不属于单个 Entity） | ❌ DB 访问（通过 Repository 接口） |
| `Repository/` | Repository **接口**（契约，定义 findByXxx / save 等方法） | ❌ 实现细节（放 Infrastructure/Implement） |
| `Contract/` | 其他领域契约/接口（防腐层接口、外部系统接口） | ❌ 实现（放 Infrastructure） |
| `Event/` | 领域事件（业务意义上发生的事，如 UserRegistered） | ❌ 事件监听器（放 Application/Listener） |
| `CodeRule/` | 编码生成规则（如订单号、合同号的生成逻辑） | ❌ 与 DB 交互 |
| `Exception/` | 领域异常（业务规则被违反，如 InsufficientStockException） | ❌ 技术异常 |

**Domain 层的铁律**：这一层**不依赖** Hyperf、不依赖 Eloquent、不依赖任何基础设施。它是纯 PHP 业务代码，可以被任何框架复用。Repository 只定义接口，实现交给 Infrastructure。

#### Infrastructure 层 — "技术实现"

| 子目录 | 放什么 | 不放什么 |
|--------|--------|---------|
| `Model/` | Eloquent Model（DB 表映射，定义字段、cast、关系） | ❌ 业务逻辑 |
| `Implement/` | Repository 接口的实现（查 DB Model，转换为 Domain Entity） | ❌ 业务规则（只做数据转换） |
| `Exception/` | 基础设施异常（DB 连接失败、第三方 API 超时、网络错误） | ❌ 业务异常 |

**Implement 的职责**：实现 Domain 层定义的 Repository 接口。从 DB 查出 Model，转成 Domain Entity 返回。这里做数据格式转换（DB row ↔ Entity），不做业务判断。

---

## Shared 层级结构

Shared 放**跨模块共享**的代码，同样遵循四层结构。路径：`src/api/app/Shared/`

```
src/api/app/Shared/
│
├── Interface/                      # 全局入口（跨模块共享）
│   ├── Http/                       # 全局 Controller（如 HealthController）
│   ├── Middleware/                 # 全局中间件（AdminAuthMiddleware、PermissionMiddleware 等）
│   └── Command/                    # 全局 CLI 命令（SeedCommand、RedisFlushCommand 等）
│
├── Application/                    # 跨模块共享的应用层
│   └── Enum/                       # 跨模块共享的应用枚举（如 AppErrorCode）
│
├── Domain/                         # 跨模块共享的领域层
│   ├── Enum/                       # 跨模块共享的领域枚举（如 DomainErrorCode、通用状态码）
│   └── Service/                    # 跨模块共享的领域服务（如 PasswordGenerator）
│
└── Infrastructure/                 # 跨模块共享的基础设施
    ├── Service/                    # 跨模块共享的基础设施服务（SessionService、SmsService、WeComService）
    └── Enum/                       # 基础设施枚举（如 InfraErrorCode）
```

### Shared 的使用原则

- **只有真正被多个 Module 共享的代码才放这里**。单模块使用的代码留在自己 Module 内。
- **Shared 不是垃圾桶**。如果不确定，先放 Module 内。等第二个 Module 需要时再提取。
- **Shared 里的 Middleware** 是全局认证/权限中间件（每个端一套，如 PlatformAuthMiddleware、ClientAuthMiddleware）。
- **Shared 里的 Service** 是跨模块的基础设施服务（如各端的 SessionService、短信服务、企微服务）。

---

## 命名约定

### Namespace 映射

```
src/api/app/Module/User/Domain/Entity/User.php
→ App\Module\User\Domain\Entity\User

src/api/app/Module/User/Infrastructure/Implement/UserRepository.php
→ App\Module\User\Infrastructure\Implement\UserRepository

src/api/app/Shared/Interface/Middleware/PlatformAuthMiddleware.php
→ App\Shared\Interface\Middleware\PlatformAuthMiddleware
```

命名空间约定：`App\Module\{Module}\{Layer}\{SubDir}\{ClassName}`，composer autoload PSR-4 映射 `App\` → `app/`。

### 文件命名规范

| 类型 | 后缀/格式 | 示例 |
|------|----------|------|
| Controller | `{Name}Controller` | `UserController`、`TenantAuthController` |
| Command（CLI） | `{Name}Command` | `CreateTenantCommand`、`SeedCommand` |
| UseCase | `{Action}{Entity}UseCase` | `CreateUserUseCase`、`UpdateOrderUseCase` |
| ReqDTO | `{Action}{Entity}ReqDTO` | `CreateUserReqDTO` |
| ResDTO | `{Action}{Entity}ResDTO` 或 `{Entity}ResDTO` | `UserListResDTO` |
| Repository 接口 | `{Entity}Repository`（在 Domain/Repository） | `UserRepository` |
| Repository 实现 | `{Entity}Repository`（在 Infrastructure/Implement） | `UserRepository` |
| Domain Service | `{Domain}Service` | `UserDomainService`、`PricingService` |
| Domain Event | `{Something}{Tense}` | `UserRegistered`、`OrderCompleted` |
| ValueObject | `{Name}`（无后缀） | `Money`、`Address`、`UserStatus` |
| Model | `{Entity}Model` | `UserModel`、`OrderModel` |
| 领域异常 | `{Reason}Exception` | `InsufficientStockException` |

### PHP 约定

- 每个文件第一行 `declare(strict_types=1);`
- Controller 只做参数提取 + 调用 UseCase，不直接操作 DB
- 涉及多个写操作的方法必须用 `Db::transaction()`
- 跨 Module 不直接调 Model，通过 Application 层或 Shared Service 调用

---

## 异常分层规则

每层有自己的 Exception 目录，异常**不跨层抛**：

| 层 | 异常类型 | 示例 | 谁处理 |
|----|---------|------|--------|
| Domain | 业务规则被违反 | `InsufficientStockException` | Application 捕获，转业务错误响应 |
| Application | 业务流程异常 | `UserNotFoundException`、`PermissionDeniedException` | Interface 捕获，转 HTTP 响应 |
| Infrastructure | 技术故障 | `DatabaseConnectionException` | Application 捕获或全局 handler |

**规则**：底层抛的异常由上层捕获并转换，不让技术异常泄漏到业务层，也不让业务异常泄漏到框架层。

---

## 常见错误（禁止）

- ❌ **Controller 直接查 DB** → 必须通过 UseCase → Repository
- ❌ **Domain 层 import Eloquent Model** → Domain 不依赖框架
- ❌ **Repository 接口放 Infrastructure** → 接口属于 Domain，实现属于 Infrastructure
- ❌ **跨 Module 直接调 Model** → 通过 Application 层或 Shared Service
- ❌ **业务规则写在 UseCase 里** → 业务规则属于 Domain Service / Entity
- ❌ **单模块代码放 Shared** → 先放 Module，等共享时再提取
- ❌ **异常跨层泄漏** → 每层捕获并转换为自己的异常类型

---

## 判定法：文件该放哪层？

```
问：这个类包含业务规则吗？
├─ 是 → Domain（Entity / ValueObject / Service / CodeRule）
└─ 否 → 它做什么？
   ├─ 接收 HTTP/CLI 请求 → Interface（Controller / Command）
   ├─ 编排一个业务操作 → Application（UseCase）
   ├─ 访问 DB / 外部系统 → Infrastructure（Implement / Model）
   └─ 跨模块共享 → Shared（按上述规则选层）
```
