
# PHP → Go 迁移陷阱清单

## 概述

本文件收录 PHP 开发者写 Go 时最容易踩的 9 个坑。每条给出 PHP 习惯 vs Go 正确写法对照，迁移或 Code Review Go 代码时逐条核对。

**核心原则**：Go 不是"换了语法的 PHP"。类型系统、错误处理、值/引用语义都不同，照搬 PHP 直觉会写出能编译但行为错误的代码。
### 1. 多返回值 vs PHP 单返回值

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
### 2. error-first 约定

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
### 3. try-catch → if err != nil

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
### 4. decimal 精度：业务金额用 string

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
### 5. 关联数组 → struct / map（禁止滥用 interface{}）

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

### 6. nil 与零值：不是所有类型都有 nil

PHP 里"没有值"统一是 `null`。Go 的 `nil` 只适用于指针、slice、map、interface 等引用类型；`int` / `string` / `bool` / struct **没有 nil**，只有零值（`0` / `""` / `false` / 字段全零的 struct）。

```php
// PHP：未赋值或显式置空都是 null
$name = null;
if ($name === null) { /* ... */ }
```

```go
// Go：基础类型用零值表达"空"，指针才有 nil
var name string          // 零值 ""，不是 nil
var p *string            // 指针才能是 nil
if p == nil { /* ... */ }

// 注意：int 零值 0 与业务上的 0 无法区分，
// 需要"未设置"语义时用指针（*int）或显式 ok 标志
```

### 7. 指针 vs 值传递：切片 / map 是引用语义

PHP 对象默认按引用传递，标量按值拷贝。Go **一切传参都是值拷贝**，但 slice / map 底层是引用结构——函数内修改 map、修改 slice 元素对调用方可见；slice `append` 超出容量会换底层数组，结果要回传。需要函数修改调用方变量本身时，传指针。

```php
// PHP：对象即引用
function rename(User $u): void { $u->name = 'x'; }   // 调用方可见
```

```go
// Go：值拷贝为默认，引用语义仅 slice / map / channel
func Rename(u *User) { u.Name = "x" }                 // 要改调用方的 struct，传指针
func Fill(m map[string]string) { m["k"] = "v" }       // map 直接改，调用方可见
```

### 8. 无继承：用组合 + 接口

PHP 用 `extends` / `implements` 构建类层次。Go **没有继承**：复用靠组合（struct 嵌入，字段与方法提升），多态靠接口（方法集隐式满足，无需 `implements` 声明）。"想继承"时先想组合 + 小接口，不要用嵌入硬模拟继承树。

```php
// PHP：继承层次
class Base { public function ping(): void {} }
class Child extends Base {}
```

```go
// Go：组合 + 隐式接口
type Base struct{}

func (Base) Ping() {}

type Child struct {
    Base // 嵌入是组合，不是继承
}

type Pinger interface { Ping() } // Child 隐式满足 Pinger，无需声明
```

### 9. array_map / array_filter → for range 循环

PHP 习惯用 `array_map` / `array_filter` / `array_reduce` 做集合变换。Go 没有对应的内置高阶函数，标准写法是 **`for range` 显式循环 + `append`** 构造新切片——啰嗦但直观，不要为省几行引工具库。

```php
// PHP：高阶函数链
$names = array_map(fn($u) => $u->name, $users);
$active = array_filter($users, fn($u) => $u->active);
```

```go
// Go：for range 显式循环
names := make([]string, 0, len(users))
for _, u := range users {
    names = append(names, u.Name)
}

active := make([]*User, 0)
for _, u := range users {
    if u.Active {
        active = append(active, u)
    }
}
```
