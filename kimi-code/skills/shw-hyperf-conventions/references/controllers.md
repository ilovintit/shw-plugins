# 3. Controller / 请求实现（架构规范：shw-ddd）

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
