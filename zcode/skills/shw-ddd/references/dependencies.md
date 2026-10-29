# 依赖方向（不可违反）

```
Interfaces ──→ Application ──→ Domain ←─── Infrastructure
   (入口)         (编排)        (核心)        (实现)
                                   ↑
                          Infrastructure 实现 Domain 的 Repository 接口
                          （依赖倒置：Domain 定义契约，Infrastructure 实现）
```

**铁律**：
- Domain 层**不依赖**任何外层（不引用 Infrastructure、不引用 Application、不依赖 ORM 模型）
- Infrastructure **依赖** Domain（实现 Domain 定义的 Repository 接口）
- Application 编排 Domain（调用 Domain Service / Repository 接口）
- Interfaces 只调用 Application（不直接碰 Domain 或 DB）
- 所有箭头指向 Domain，Domain 是最内层

```
没有新鲜的依赖倒置，不声称分层正确
```

若 Domain 里出现了对框架、DB、外部服务的直接引用，分层已经被破坏，无论目录摆得多整齐。

---
