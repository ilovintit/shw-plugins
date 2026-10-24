# 2. 错误处理模式（错误三分类语义：公司 lib 仓库文档）

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
