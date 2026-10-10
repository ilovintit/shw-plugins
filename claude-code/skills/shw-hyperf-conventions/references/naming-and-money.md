# 4. PHP 命名约定

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
