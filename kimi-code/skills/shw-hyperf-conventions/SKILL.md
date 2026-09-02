---
name: shw-hyperf-conventions
description: 仅 PHP+Hyperf 栈。Hyperf 框架的通用编码落地约定。在 PHP+Hyperf 项目写代码、新建文件、Code Review，涉及分层装配/依赖注入/错误处理模式/Controller 职责/参数校验/PHP 命名/命名归一化时自动触发。不讲组件库用法（组件查公司 lib 仓库文档，见 shw-lib-docs），只讲"PHP/Hyperf 里怎么写"。最近 composer.json 含 hyperf/hyperf 时适用。
---

# PHP+Hyperf 编码落地约定

## 概述

本 skill 是 **PHP+Hyperf 的通用编码落地约定**——DDD 分层（架构规范见 **shw-ddd**）在 PHP/Hyperf 的目录组织、DI 容器用法、错误处理分发模式、Controller 写法、参数校验、命名约定与命名归一化。

**核心原则**：本 skill 只管"在 PHP/Hyperf 里怎么写"。公司组件库（lib）的设计规范与使用指南不在插件内——查 lib 仓库的 README 与 docs 目录（**shw-lib-docs** 指路）。

**适用判断**：最近 `composer.json` 含 `hyperf/*`，在该项目写、改、Review PHP 代码时按本约定走。

---

## 1. 项目分层装配（架构规范：shw-ddd）

DDD 四层的划分规则、依赖方向、各层职责见 **shw-ddd**，不在此重复。本节只讲 PHP/Hyperf 里如何把这四层装配起来。

### 铁律

```
按 src/api/app/Module/{Module}/{Layer}/ 组织目录
命名空间 App\Module\{Module}\{Layer}\{SubDir}\{ClassName}
每文件第一行 declare(strict_types=1);
```

### 目录结构（以 Order 模块为例）

完整层级定义见 **shw-ddd**，此处只给 PHP 落地的目录形态：

```
src/api/app/Module/Order/
├── Interface/
│   └── Platform/Http/OrderController.php          # App\Module\Order\Interface\Platform\Http\OrderController
├── Application/
│   ├── UseCase/CreateOrderUseCase.php             # App\Module\Order\Application\UseCase\CreateOrderUseCase
│   ├── ReqDTO/CreateOrderReqDTO.php
│   └── ResDTO/OrderResDTO.php
├── Domain/
│   ├── Entity/Order.php                           # 纯业务，不 import 任何 Hyperf/Eloquent
│   ├── Repository/OrderRepository.php             # 接口（契约）
│   └── Exception/InsufficientStockException.php   # 业务异常子类
└── Infrastructure/
    ├── Model/OrderModel.php                       # Eloquent Model（DB 映射）
    └── Implement/OrderRepository.php              # 实现 Domain/Repository 接口
```

命名空间约定：`App\Module\{Module}\{Layer}\{SubDir}\{ClassName}`，composer autoload PSR-4 映射 `App\` → `app/`。

### 依赖注入：Hyperf DI 容器

PHP 是解释型语言，每次请求重新初始化，DI 容器解决"构造对象依赖图"的开销问题。Hyperf 用 DI 容器做依赖装配，两种注入方式：

| 方式 | 写法 | 适用 |
|------|------|------|
| 构造函数自动注入（推荐） | 构造函数参数声明类型，容器自动解析 | 组件类、Service、Repository 实现 |
| 属性注解注入 | `#[Inject]` 标在 `protected` 属性上 | Controller、无构造函数的类 |

```php
<?php
declare(strict_types=1);

namespace App\Module\Order\Application\UseCase;

use App\Module\Order\Domain\Repository\OrderRepository;
use App\Module\Order\Application\ReqDTO\CreateOrderReqDTO;

class CreateOrderUseCase
{
    // 构造函数自动注入：容器看到 OrderRepository 接口类型，
    // 自动解析到 Infrastructure/Implement 里的实现
    public function __construct(
        protected OrderRepository $orderRepo,
    ) {
    }
}
```

Controller 用属性注解注入（Controller 由框架实例化，构造函数注入不直接生效）：

```php
use Hyperf\Di\Annotation\Inject;

class OrderController extends AbstractController
{
    #[Inject]
    protected CreateOrderUseCase $createOrderUC;
}
```

Domain 层**不注入**任何框架依赖，Repository 只定义接口，实现交 Infrastructure。依赖倒置靠 DI 容器装配：Domain 定义接口，Infrastructure 实现，容器按接口类型把实现注入给 Application。

### Good / Bad

| Good | Bad |
|------|-----|
| Domain 层零框架依赖（纯 PHP） | Domain 里 import Eloquent Model |
| Repository 接口在 Domain，实现在 Infrastructure | 接口和实现放一起 |
| UseCase 构造函数声明接口类型，容器自动注入 | UseCase 里 new 具体实现 |
| 每文件 `declare(strict_types=1);` | 省略 strict_types |

分层规则、依赖方向、文件归层判定法详见 **shw-ddd**。

---

## 2. 错误处理模式（错误三分类语义：公司 lib 仓库文档）

业务异常三分类（Domain / Application / Infrastructure → HTTP 422 / 200 / 500）、错误码编号规则、统一四字段响应格式的**设计范式**定义在公司 lib 仓库错误处理文档（**shw-lib-docs** 指路）。本节只讲 PHP/Hyperf 里实现这套范式的**分发模式**：异常基类与全局处理器由项目或公司 lib 提供，写法遵循以下约定。

### 铁律

```
业务异常继承三个异常基类之一（DomainException / ApplicationException / InfrastructureException，基类来源见 lib 仓库文档）
全局异常处理器用 match(true) instanceof 分发，按异常类型映射 HTTP
不自建独立异常体系，不手写 if-else 判断错误码范围
```

### 三类业务异常的语义与映射

| 异常基类 | 抛在哪层 | 含义 | HTTP | 日志 |
|---------|---------|------|------|------|
| `DomainException` | Domain | 业务规则违反（库存不足、状态非法） | 422 | warning |
| `ApplicationException` | Application | 业务流程正常无结果（资源不存在、无权限访问） | 200 | info |
| `InfrastructureException` | Infrastructure | 技术故障（DB 连接失败、第三方超时） | 500 | error |

业务子类继承对应基类，异常的 `$code` 即业务错误码：

```php
<?php
declare(strict_types=1);

namespace App\Module\Order\Domain\Exception;

// 领域异常：库存不足，由全局处理器映射为 HTTP 422
final class InsufficientStockException extends DomainException
{
    public function __construct()
    {
        parent::__construct('库存不足', 10301); // 1+模块前缀+序号，编号规则见 lib 仓库错误处理文档
    }
}
```

`ApplicationException` 基类额外携带 `$returnData` / `$returnHeaders`，业务可附带数据返回前端。

### 全局处理器：match(true) instanceof 分发

```php
// AppExceptionHandler::handle() —— match(true) 顺序即优先级
return match (true) {
    $throwable instanceof DomainException         => $this->handleDomainException($throwable),        // → 422
    $throwable instanceof ApplicationException    => $this->handleApplicationException($throwable),   // → 200
    $throwable instanceof InfrastructureException => $this->handleInfrastructureException($throwable),// → 500
    $throwable instanceof ValidationException    => $this->handleValidationException($throwable),    // → 422 + code 400
    default                                       => $this->handleDefaultException($throwable),      // → 500 error
};
```

关键：HTTP 状态码由**异常类型**决定（instanceof 分发），不靠错误码数值范围判断。Domain 子类全部走 422，Application 子类全部走 200，Infrastructure 子类全部走 500。新增业务异常只需继承基类，处理器零改动。

### 抛错方式

```php
// 业务规则违反（领域错误）→ 抛 DomainException 子类
throw new InsufficientStockException();

// 资源不存在（应用错误）→ 抛 ApplicationException 子类
throw new OrderNotFoundException();

// 基础设施故障 → 抛 InfrastructureException 子类
throw new DatabaseConnectionException();
```

### 统一响应输出

响应统一走 `Res` 静态门面（`Res::success()` / `Res::error()` / `Res::exception()`），格式固定四字段 `{ traceId, code, message, data }`（规范定义见 lib 仓库错误处理文档），禁止 Controller 里直接 `$this->response->json()`。成功 `code=0`，异常响应由全局处理器装配。

### Good / Bad

| Good | Bad |
|------|-----|
| 业务异常继承三个异常基类之一 | 自建独立异常体系（手写 error 类型构造） |
| 全局处理器 instanceof 分发 | 中间件里 if 判断错误码范围映射 HTTP |
| `throw new InsufficientStockException()` | `return Res::error('库存不足', 10301)` 手写错误响应 |
| 响应走 `Res::success()` / `Res::error()` | Controller 里 `$this->response->json(...)` |

错误分类语义、HTTP 映射理由、错误码编号规则详见公司 lib 仓库错误处理文档（**shw-lib-docs** 指路）。

---

## 3. Controller / 请求实现（架构规范：shw-ddd）

Controller 的职责边界、数据范围为什么放 UseCase 见 **shw-ddd**；权限点编码、数据范围档位等组件规范见公司 lib 仓库 rbac 文档（**shw-lib-docs** 指路）。本节只讲 PHP/Hyperf 里 Controller 怎么写。

### 铁律

```
Controller 继承 AbstractController（基类由项目或 lib 提供），只做三件事：取操作者 → 调 UseCase → 组装 Res
权限检查 Permission::check(PermissionCode::Xxx) 放 Controller 方法首行
参数校验继承 AbstractValidator，规则在 rules()，不在 Controller 手写 if
数据范围在 UseCase 静默过滤，不进 Controller
```

### AbstractController 基类

Controller 继承 `AbstractController`，提供操作者上下文和入参提取：

| 方法 | 作用 |
|------|------|
| `user()` | 当前认证用户数据（由 AuthMiddleware 注入到 request attribute） |
| `userId()` | 当前用户 ID（兼容多角色 ID 字段差异） |
| `input($key, $default)` | 取请求参数（body + query + json） |
| `query($key, $default)` | 取 URL 查询参数 |
| `page($default)` | 页码（默认 1） |
| `perPage($default)` | 每页条数（默认 15，带 `max(1, ...)` 下限保护） |

### Controller 范式

```php
<?php
declare(strict_types=1);

namespace App\Module\Order\Interface\Platform\Http;

use App\Module\Order\Application\UseCase\CreateOrderUseCase;
use App\Shared\Interface\Http\Permission;
use App\Shared\Domain\Enum\PermissionCode;
use Hyperf\Di\Annotation\Inject;
use Hyperf\HttpServer\Annotation\Controller;
use Hyperf\HttpServer\Annotation\PostMapping;

#[Controller(prefix: "/order")]
class OrderController extends AbstractController
{
    #[Inject]
    protected CreateOrderUseCase $createOrderUC;

    #[PostMapping(path: "")]public function create(): \Psr\Http\Message\ResponseInterface
    {
        // 1. 权限检查：方法首行，显式声明需要什么权限
        Permission::check(PermissionCode::OrderCreate);

        // 2. 参数校验（AbstractValidator 子类，见下）
        $reqDTO = new CreateOrderReqDTO($this->all());
        $reqDTO->validate();

        // 3. 调 UseCase（数据范围由 UseCase 内部静默过滤）
        $order = $this->createOrderUC->execute($this->userId(), $reqDTO);

        // 4. 组装 Res 返回
        return Res::success($order->toArray());
    }
}
```

### 参数校验：AbstractValidator

ReqDTO 继承 `AbstractValidator`（基类由项目或 lib 提供），构造函数注入 `ValidatorFactoryInterface`（DI 自动），实现三个抽象方法 + 可选两个钩子：

```php
<?php
declare(strict_types=1);

namespace App\Module\Order\Application\ReqDTO;

class CreateOrderReqDTO extends AbstractValidator
{
    // 必须实现：验证规则
    protected function rules(array $data): array
    {
        return [
            'userId'    => 'required|integer|gt:0',
            'totalAmount' => 'required|numeric|gt:0',
            'items'     => 'required|array',
        ];
    }

    // 必须实现：错误消息（中文）
    protected function messages(array $data): array
    {
        return [
            'userId.required' => '请选择用户',
            'totalAmount.gt'  => '订单金额必须大于 0',
        ];
    }

    // 必须实现：字段中文名
    protected function customAttributes(array $data): array
    {
        return [
            'totalAmount' => '订单金额',
        ];
    }

    // 可选钩子：条件规则（如 status=paid 时才校验 paidAt）
    protected function sometimes($validator): \Hyperf\Contract\ValidatorInterface
    {
        $validator->sometimes('paidAt', 'required', function ($input) {
            return ($input['status'] ?? '') === 'paid';
        });
        return $validator;
    }

    // 可选钩子：校验后逻辑
    protected function afterHook($validator): \Hyperf\Contract\ValidatorInterface
    {
        return $validator;
    }
}
```

校验失败由 `AbstractValidator` 内部抛 `ValidationException`，全局处理器映射为 HTTP 422 + 业务码 400，Controller 无需 try-catch。

### 权限检查

权限检查三层分层（认证 → 授权 → 数据范围）的设计见公司 lib 仓库 rbac 文档。PHP 落地：

| 层 | 在哪做 | 写法 |
|----|--------|------|
| 认证 | AuthMiddleware | Bearer token → SessionService 校验 → 注入 user 到 request |
| 授权 | Controller 方法首行 | `Permission::check(PermissionCode::OrderCreate)`，失败抛 403 |
| 数据范围 | UseCase | 静默过滤（不抛错，只是少返回行） |

权限点是 `enum PermissionCode`（PHP 8.1+），不是 DB 表查询。授权用显式 `Permission::check(PermissionCode::Xxx)` 一眼看出需要什么权限，不用魔法字符串。

### 数据范围：在 UseCase 静默过滤

```php
// Application/UseCase/ListOrdersUseCase.php
public function execute(int $operatorId): array
{
    // 数据范围解析：有 OrderView 权限，但能看到哪些订单由数据范围解析器决定
    $scope = $this->dataScopeResolver->resolve($operatorId, 'order');
    return $this->orderRepo->listByScope($scope);  // 静默过滤，不抛错
}
```

数据范围是横切关注点，在每个资源查询的 UseCase 里都过 Resolver，不在 Controller 判断。5 档范围、多角色合并算法、缓存策略详见 lib 仓库 rbac 文档。

### Good / Bad

| Good | Bad |
|------|-----|
| Controller 只取操作人 + 校验 + 调 UseCase + 组装 Res | Controller 里写业务逻辑、查 DB |
| 权限 `Permission::check(PermissionCode::OrderCreate)` 在方法首行 | Controller 里判断角色、用魔法字符串查权限 |
| 校验在 `AbstractValidator` 子类的 `rules()` | Controller 里 `if (empty($data['name']))` 手写 |
| 数据范围在 UseCase 静默过滤 | 数据范围塞进 Controller |
| 响应走 `Res::success()` | `$this->response->json(...)` 手写响应 |

Controller 职责边界、文件该放哪层见 **shw-ddd**；权限系统完整设计见 lib 仓库 rbac 文档。

---

## 4. PHP 命名约定

### 命名空间

`App\Module\{Module}\{Layer}\{SubDir}\{ClassName}`，PSR-4 映射 `App\` → `app/`。Shared 跨模块代码用 `App\Shared\{Layer}\...`。

### 命名风格

| 类型 | 风格 | 示例 |
|------|------|------|
| 类名 | PascalCase | `CreateOrderUseCase`、`OrderRepository` |
| 方法 / 属性 | camelCase | `createOrder()`、`$userId` |
| 常量 | 全大写下划线 | `const MAX_RETRY = 3` |
| enum case | PascalCase | `PermissionCode::OrderCreate`、`OrderStatus::Paid` |

### readonly class（PHP 8.2+）

不可变值对象用 `readonly class`，构造后属性不可变：

```php
readonly class Money
{
    public function __construct(
        public string $amount,   // decimal string，金额精度见下
        public string $currency,
    ) {}
}
```

### enum（PHP 8.1+）

权限码、状态机、场景用 `enum`，不用常量类或魔法数字：

```php
// 权限码
enum PermissionCode: string
{
    case OrderView   = 'order:view';
    case OrderCreate = 'order:create';
    case OrderUpdate = 'order:update';
}

// 状态机
enum OrderStatus: int
{
    case Pending = 0;
    case Paid    = 1;
    case Closed  = 2;
}
```

### 金额精度

业务实体金额用 `string`（decimal string，如 `"199.99"`），**禁止** `float`。运算用 bcmath 系列（`bcadd`/`bcmul`/`bcdiv`），不直接 `+` `-`。

### 文件头

每个 `.php` 文件第一行 `declare(strict_types=1);`，强制严格类型检查。

### Good / Bad

| Good | Bad |
|------|-----|
| `enum OrderStatus: int` | `const STATUS_PAID = 1` 常量类 |
| `readonly class Money` | 普通 class + 一堆 setter |
| 金额 `string`（decimal） | 金额 `float` |
| `declare(strict_types=1);` | 省略 |
| 属性 camelCase `$userId` | 属性 snake_case `$user_id` |

---

## 5. 命名归一化层

公司全栈命名约定按"传输层"分风格，PHP 业务层统一 camelCase。URL query 的 snake_case 在进入 Controller 前被中间件归一化。

### 铁律

```
URL query: snake_case
Header: x-kebab-case
Body (JSON): camelCase
PHP 业务层: camelCase
数据库字段: snake_case
Redis key: snake_case
```

### 各层风格

| 层 | 风格 | 示例 |
|----|------|------|
| URL query | snake_case | `?resource_type=1&channel_id=2` |
| Header | x-kebab-case | `x-agent-id: 5` |
| Body (JSON) | camelCase | `{"userName": "alice"}` |
| PHP 业务层 | camelCase | `$userName`、`$resourceType` |
| 数据库字段 | snake_case | `user_name`、`resource_type` |
| Redis key | snake_case | `order:session:user:5` |

### query snake_case → camelCase 归一化中间件

URL query 是 snake_case（前端 URL 拼接习惯），PHP 业务层是 camelCase，中间用全局中间件归一化：在最外层把 query 参数的 snake_case 键名转成 camelCase，使 Controller 的 `query()/input()/all()` 看到统一的 camelCase。

```php
// 注册为全局 http 中间件（config/autoload/middlewares.php）
'http' => [
    \App\Shared\Interface\Http\Middleware\SnakeCaseQueryMiddleware::class,
    // ... 其他中间件
],
```

转换规则：`foo_bar → fooBar`、`parent_id → parentId`；无下划线或已是 camelCase 不变。Body 本来就是 camelCase，不受影响。

### DB ↔ PHP 转换

数据库 snake_case 字段与 PHP camelCase 属性的转换在 `Infrastructure/Implement` 做（Repository 实现里 Model → Entity 映射），不污染 Domain 层。

### Good / Bad

| Good | Bad |
|------|-----|
| query `?resource_type=1`，Controller 看到 `$resourceType` | Controller 里手动 `$this->input('resource_type')` |
| 归一化中间件注册为全局中间件 | 每个接口手写 snake→camel 转换 |
| DB snake_case ↔ PHP camelCase 在 Repository 转换 | Domain Entity 字段用 snake_case |

---

## 何时调用本 skill

- 在 PHP+Hyperf 项目写、改、Review PHP 代码时
- 新建模块、新建文件时判断命名空间和分层归属
- 涉及依赖注入（构造函数 vs `#[Inject]`）、错误处理（继承哪个异常基类）、Controller 职责、参数校验、权限检查写法时
- 涉及命名风格转换（query snake_case → PHP camelCase）时
- **组件库问题不走本 skill**：公司组件的设计规范与使用指南查 lib 仓库文档（**shw-lib-docs** 指路）
