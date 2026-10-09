# 5. DAO / Entity 落地：生成的 DB 映射 vs 手写领域实体（设计规范：shw-ddd）

领域实体与数据表的分离原则、Repository 模式等**架构规范**定义在 **shw-ddd**。本节写这些规范在 Go/GoFrame 里用 `gf gen dao` 生成机制 + 手写领域实体的**落地写法**。

### 生成机制

DAO 和 Entity 由 `gf gen dao` 生成（DO NOT EDIT），配置在 `config.yaml` 的 `gfcli.gen.dao`，`jsonCase: "CamelLower"`。生成的三层 model：

```
internal/dao/internal/    # 生成的 DAO 内部结构，含 XxxColumns 列名常量
internal/dao/             # 可扩展的 DAO 入口
internal/model/entity/    # 生成的表结构 entity（纯 DB 映射）
internal/model/do/        # DataObject
```

### 关键落地：业务层不用生成的 entity，用 domain/entity 手写领域实体

业务层用 `domain/entity/` 里**手写**的领域实体（带冗余 JOIN 字段和业务规则方法），与生成的 `model/entity.User` 字段不同。生成的 entity 仅作 DB 映射和 DAO 内部使用，不直接进业务层。

### 写操作数据结构

写操作用 `gdb.Map`（**非** `g.Map`）；批量用 `[]gdb.Map`；WhereIn 用 `g.Slice{...}`。

```go
data := gdb.Map{
    "username": user.Username,
    "status":   user.Status,
}
dao.Users.Ctx(ctx).Data(data).Insert()
```

### 链式查询

```go
dao.Users.Ctx(ctx).
    LeftJoin("orders", "orders.user_id = users.id").
    Fields(userJoinFields).
    Where("users.id", id).
    One()
```

### Good / Bad

| Good | Bad |
|------|-----|
| 业务用 `domain/entity.User`（手写领域实体） | 业务直接用 `model/entity.User` |
| 写操作用 `gdb.Map` | 写操作用 `g.Map` |
| WhereIn 用 `g.Slice{...}` | WhereIn 用裸 `[]interface{}` |

`gf gen dao` 必须连上一个 schema 已到位的真实库才能跑。本机没有匹配当前分支的库时，按 `shw-ephemeral-db` 起一次性数据库容器（起容器 → 跑全量迁移 → 生成 → 无条件销毁），禁止连 dev/test 共享库生成。

DO 对象基础用法（`do.User{...}`）、软删除自动维护等通用知识参见官方 goframe skill。

---
