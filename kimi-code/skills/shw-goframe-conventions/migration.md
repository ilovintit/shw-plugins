
# PHP → Go 迁移陷阱清单

## 概述

本 skill 收录 PHP 开发者写 Go 时最容易踩的 10 个坑。每条给出 PHP 习惯 vs Go 正确写法对照，迁移或 Code Review Go 代码时逐条核对。

**核心原则**：Go 不是"换了语法的 PHP"。类型系统、错误处理、值/引用语义都不同，照搬 PHP 直觉会写出能编译但行为错误的代码。
### 2. 多返回值 vs PHP 单返回值

PHP 函数返回一个值（或数组、对象）。Go 函数习惯返回 `(result, error)`，把正常结果和错误并列返回。

```php
// PHP：返回一个值
function find(int $id): ?User {
    return $user;       // 失败返回 null
}
```

```go
// Go：多返回值，业务结果与 error 并列
func Find(id int) (*User, error) {
    return user, nil    // 成功：result + nil
}
```
### 4. error-first 约定

PHP 用 `try-catch` 异常机制。Go **没有 try-catch**，约定每个可能失败的函数返回 `error`，调用方必须用 `if err != nil` 逐个检查。PHP 开发者最容易**忽略 error 返回值**。

```php
// PHP：异常机制
$result = doSomething();   // 异常会自动抛出，不捕获就向上冒泡
```

```go
// Go：error-first，必须主动检查
result, err := doSomething()
if err != nil {
    return err             // 忽略 err 是最常见的 bug
}
// 反模式：r, _ := doSomething() —— 用 _ 丢弃 error 前要想清楚
```
### 6. try-catch → if err != nil

PHP 的 `try { } catch (Exception $e) { }` → Go 的 `if err != nil { return err }`。Go 的错误处理更冗长，但每一步错误都显式可见，不会被静默吞掉。

```php
// PHP
try {
    $a = step1();
    $b = step2($a);
} catch (Exception $e) {
    log_error($e->getMessage());
    throw $e;
}
```

```go
// Go：每一层调用都要显式检查
a, err := step1()
if err != nil {
    return fmt.Errorf("step1: %w", err)
}
b, err := step2(a)
if err != nil {
    return fmt.Errorf("step2: %w", err)
}
```
### 8. decimal 精度：业务金额用 string

PHP 用 `float` 或 `bcmath`（`bcadd`/`bcmul` 等字符串运算）。Go 的 `float64` 同样有精度问题（`0.1 + 0.2 != 0.3`），公司约定**业务金额一律用 string（decimal string）**，配合 decimal 库或 bcmath 风格函数运算，禁止用 `float64` 直接算钱。

```php
// PHP
$total = bcadd('0.1', '0.2', 2);    // '0.30'，字符串运算
$price = 0.1 + 0.2;                  // float，有精度风险（不推荐用于金额）
```

```go
// Go：金额用 string（decimal string），不要用 float64 算钱
// float64：0.1 + 0.2 = 0.30000000000000004
// 业务金额约定：
//   1. 存储/传输用 string（decimal string）
//   2. 运算用 decimal 库或公司封装的 bcmath 风格函数
//   3. 禁止 total := 0.1 + 0.2 这种直接 float 运算做金额
```
### 10. 关联数组 → struct / map（禁止滥用 interface{}）

PHP 的关联数组万能，既当对象又当字典。Go 必须区分：**字段固定用 `struct`**，**动态键才用 `map[string]T`**。禁止滥用 `map[string]interface{}`——它丢失类型安全，把编译期能查出的错误拖到运行时。

```php
// PHP：关联数组万能
$user = ['id' => 1, 'name' => 'Tom'];   // 既当对象又当字典
```

```go
// Go：字段固定用 struct（首选）
type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}
// 动态键才用 map[string]T
m := map[string]string{"k": "v"}

// 反模式（禁止）：
// data := map[string]interface{}{"id": 1, "name": "Tom"}
// ——丢失类型安全，字段拼写错、类型错都要到运行时才暴露
```
