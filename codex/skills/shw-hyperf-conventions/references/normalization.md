# 5. 命名归一化层

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
    \App\Shared\Infrastructure\Middleware\SnakeCaseQueryMiddleware::class,
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
