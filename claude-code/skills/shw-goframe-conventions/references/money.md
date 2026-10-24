# 6. 金额精度落地：decimal string

金额精度规范归属**本 skill 此节**——decimal string 类型选择、禁止浮点、精确运算的完整规范都在本节定义，不引用外部 skill。

### 落地决策：decimal string

业务领域实体的金额字段用 `string`（decimal string），**禁止** `float64`。生成的 entity 可能是 `float64`，但业务层特意避免浮点，用手写领域实体的 string 表达金额。

```go
// domain/entity/entity.go（领域实体，string）
type Order struct {
    TotalAmount string  // decimal string，如 "199.99"
}
```

### 精确运算

用 bcmath 风格函数：`bcAdd` / `bcMul` / `bcDiv` / `bcSub`，不直接用 `+` `-` `*` `/`。

### Good / Bad

| Good | Bad |
|------|-----|
| `TotalAmount string`（decimal string） | `TotalAmount float64` |
| 金额运算用 `bcAdd/bcMul/bcDiv/bcSub` | 金额用 `+` `-` `*` `/` 直接算 |
| 比较金额先转 decimal 再比 | 金额直接 `==` 比较 |

---
