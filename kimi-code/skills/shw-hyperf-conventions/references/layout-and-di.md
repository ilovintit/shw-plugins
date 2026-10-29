# 1. 项目分层装配（架构规范：shw-ddd）

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

Hyperf 在协程服务中使用 DI 容器装配对象依赖，不能假设每次请求都重建全部对象；请求状态不得泄漏到长寿命共享对象。两种注入方式：

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
