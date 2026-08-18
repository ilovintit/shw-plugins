---
name: shw-design-conventions
description: 公司组件库的跨组件通用设计范式。在设计/实现新组件、迁移组件到新语言、Review 组件代码时自动触发。定义 10 条贯穿所有组件的设计约定：Manager+Provider 模式、接口契约+项目端实现、readonly 值对象、模板方法、事件驱动、环境变量开关、Redis 状态中枢、状态机+幂等、跨语言兼容、组件库与业务解耦。
---

# 组件库通用设计范式

## 概述

公司组件库的**同一套设计范式**可以有多种语言实现。无论用什么语言/框架，组件库都遵守同一套设计约定——换语言不改设计思路，只改语言表达。

本 skill 定义**贯穿所有组件的 10 条通用设计约定**。各组件的特定设计范式参见对应的 `shw-*` skill。

**核心原则**：组件库的设计范式是跨语言资产，它不随语言/框架更替而废弃。每条范式都是踩坑后的沉淀，遵守它们 = 少走弯路。

---

## 10 条通用设计范式

### 1. Manager + Provider/Adapter 模式

**约定**：需要一个统一入口管理多个实现时，用 Manager 按 config 动态实例化 + 进程内缓存。

```
Manager 模式（适用于多供应商/多驱动场景）：
  - Manager 按 config 的 providers 列表动态实例化
  - 进程内只创建一次（按 name 缓存）
  - 扩展新实现：实现接口 + config 追加一项，不改 Manager
  - 调用方通过 Manager 获取，不直接 new 具体实现
```

| Good | Bad |
|------|-----|
| Manager 按 name 缓存实例 | 每次调用都 new |
| 扩展只加 config 项 | 扩展要改 Manager 代码 |
| 调用方传 name 获取 | 调用方直接 new 具体 Provider |

**应用实例**：ExpressManager（快递多供应商）、SmsManager（短信多供应商）、RegionManager（地区多数据源）、StorageManager（存储多驱动）。

### 2. 接口契约 + 项目端实现（Hollywood 原则）

**约定**：lib 定义 interface，项目端实现具体业务，lib 反向调用项目端实现。

```
lib 层：
  - 定义 interface（Repository / Hook / Provider 等）
  - 调用 interface 方法（不知道具体实现）

项目层：
  - 实现 lib 定义的 interface
  - 注入到 lib 的 Manager/Service

方向：lib → 调用 → 项目端实现（不可反向）
```

| Good | Bad |
|------|-----|
| lib 定义 Hook 接口，项目端实现 | lib 里写死业务逻辑 |
| lib 定义 Repository 接口，项目端实现 | lib 直接依赖项目的 DB 表 |

**应用实例**：Attachment 的 BusinessHook 接口（lib 反向调用项目端做改名/引用检查/公私判断）。

### 3. readonly 值对象

**约定**：所有 DTO/值对象一律不可变。

```
值对象特征：
  - 构造时一次性赋值，之后不可修改
  - "修改" = 创建新对象，不就地改字段
  - 提供 fromArray() / toArray() 或 fromApiResponse() 双向转换
  - 嵌套值对象递归序列化
  - 不暴露 setter，仅暴露只读访问器
```

| Good | Bad |
|------|-----|
| 构造时赋值，之后只读 | 可变对象 + setter 方法 |
| fromApiResponse() 工厂转换 | 手动逐字段赋值 |
| 修改 = 新建对象 | 就地修改字段 |

### 4. 模板方法模式

**约定**：通用流程封装在外壳/基类，可变部分延迟到具体实现/回调。

```
通用流程（封装在外壳）：
  procedure execute(context):
      try:
          validate(context)            // 通用：前置校验
          result = doCore(context)     // 可变：延迟到具体实现
          dispatchEvent(AFTER, result) // 通用：事件分发
          return result
      catch (e):
          handleError(e)
          dispatchEvent(FAILED, e)

可变部分（由具体实现提供）：
  doCore(context) → Result   // 各供应商/各场景独立实现
```

**设计意图**：通用流程（异常捕获、事件分发、日志、校验）只写一次，可变部分（具体供应商 API 调用、具体业务动作）各实现独立。扩展新实现只需提供 `doCore`，无需重写通用流程。

### 5. 事件驱动

**约定**：在生命周期点派发事件，业务侧监听，不硬编码回调。

```
生命周期点 → 派发事件 → 业务监听器

事件特征：
  - 不可变（readonly）值对象
  - 携带上下文（触发对象 + 相关数据）
  - 未识别事件派发 UnknownEvent 兜底，不丢弃
```

| Good | Bad |
|------|-----|
| 生命周期点派发事件 | 在业务流程里直接调监听器 |
| 事件 readonly + 只读访问 | 事件对象可变 |
| 未知事件走 UnknownEvent 兜底 | 未知事件被静默丢弃 |

**应用实例**：发送成功/失败、验证码生成、任务状态流转等生命周期点都派发事件，业务侧按需监听扩展。

### 6. 环境变量控制开关

**约定**：后台进程/可选功能用环境变量控制，默认全关。

```
格式：PROC_{MODULE}_{NAME}=true

约定：
  - 默认全关（false / 未设置 = 关）
  - API 容器：全关（不跑后台进程）
  - Worker 容器：按需开（只跑该容器需要的进程）
  - 部署分离：API 容器和 Worker 容器用不同环境变量配置
```

| Good | Bad |
|------|-----|
| 默认关 + 显式开 | 默认开 + 显式关 |
| API 容器全关 | API 容器也跑后台进程 |
| Worker 容器按需开 | 所有进程全开 |

**应用实例**：`PROC_TASK_RETRY_SCAN_PROCESS=true`、`PROC_ATTACHMENT_ARCHIVE_PROCESS=true`、`PROC_ATTACHMENT_UPLOAD_CLEANUP_PROCESS=true`。

### 7. Redis 作为状态中枢

**约定**：锁/计数器/会话/缓存/频率限制全用 Redis 原子操作。

```
Redis 原子操作清单（跨组件通用）：
  - SET NX EX：频率限制（验证码）、分布式锁获取
  - INCR + 首次 EXPIRE：计数器（验证码失败计数、序列号）
  - Lua 脚本：原子复合操作（锁释放的 owner 比对 + del）
  - Hash：复杂数据（会话字段集合）
  - Set：索引集合（用户多端会话 ID 集合）
  - SET XX EX：仅存在时设置（锁续期）

约定：
  - key 命名带组件前缀（redis-lock: / seq_num: / vc: / {role}:session:）
  - TTL 必须设置（除计数器首次设 TTL 外，不设 TTL = 永久占用 = 资源泄漏）
  - 关键写操作失败必须告警（如防爆破 lock key 写失败）
```

### 8. 状态机 + 幂等

**约定**：有生命周期的实体都有明确状态机和幂等控制。

```
状态机约定：
  - 状态用 enum/常量定义，不用魔法字符串
  - 合法流转矩阵（canTransitionTo）——非法流转拒绝
  - 终态标识（isTerminal）——终态不可回退

幂等约定：
  - 事务内锁行 + 校验状态（抢占）
  - 回写时校验当前状态（防慢执行者覆盖）
  - 每次执行 = 唯一 attempt 记录（attempt 级幂等）
  - lib 保证不并发重复执行；重试的串行重复由业务 handler 自己幂等
```

**应用实例**：

| 组件 | 状态流转 |
|------|---------|
| Task | pending → running → succeeded/failed → pending(重试)/dead |
| Attachment | 1待上传 → 2已上传 → 3已归档 → 删除 |
| VerifyCode | 生成 → 验证中 → 已消费/已过期 |

### 9. 跨语言兼容

**约定**：当组件有多种语言实现时，数据/协议必须互通。

```
必须互通的场景：
  - AES 加密密文格式：base64(nonce[12]+tag[16]+ciphertext) 布局逐字对齐
  - Redis key 命名：验证码四键（vc:rl: / vc:fail: / vc:lock:）、锁前缀（redis-lock:）逐字相同
  - Redis 数据结构：会话 Hash+Set 结构、Lua 脚本逐字相同
  - 统一响应格式：{traceId, code, message, data} 四字段

铁律：任何一端改了数据格式/key 命名/加密布局，另一端必须同步。
历史数据迁移时，多套系统必须能互相读写对方的数据。
```

| Good | Bad |
|------|-----|
| 多端密文字节布局逐字对齐 | 各端用各自的格式，互无法解密 |
| 多端 Redis key 逐字相同 | 各端 key 命名不一致 |
| 改格式时多端同步 | 只改一端，另一端数据读不出 |

### 10. 组件库与业务解耦

**约定**：lib 只放"脱离具体项目也能用"的通用能力，不放业务逻辑。

```
可以放 lib 的：
  ✅ 通用基础设施（响应格式、异常体系、会话、锁、加密、序列号、验证码）
  ✅ 通用业务组件设计范式（附件管理、任务管理、权限系统、地区库、快递、短信、企微）
  ✅ 接口定义（让项目端实现）

不可以放 lib 的：
  ❌ 具体项目的业务错误码（各项目自己定义）
  ❌ 具体项目的业务实体/控制器（各项目自己写）
  ❌ 硬编码的业务角色名（用参数化，项目端注入具体角色）
  ❌ 项目特定的数据库表结构（lib 只定义 interface，表结构由项目端决定）
```

| Good | Bad |
|------|-----|
| lib 定义 Repository interface | lib 硬编码项目的表名 |
| lib 的 session 组件用 Role 参数化 | lib 硬编码 "admin"/"tenant" 角色名 |

---

## 组件清单与 skill 索引

本 skill 是通用范式汇总。各组件的特定设计范式在独立 skill 中：

| 组件 | skill | 核心设计价值 |
|------|-------|-------------|
| 权限系统 | shw-rbac | RBAC + 5 档数据范围 + 多角色合并 |
| 后台任务 | shw-task | Table-First + SKIP LOCKED + attempt 幂等 |
| 附件管理 | shw-attachment | 直传 + 双表索引 + md5 去重 + 6 阶段 |
| 行政区划 | shw-region | 只采集不存储 + 多源 Adapter + path 路径枚举 |
| 快递物流 | shw-express | Manager+Provider 胖接口 + 追踪/下单两域 |
| 企业微信 | shw-wecom | 两层设计 + Token 缓存去重 + 事件分发 |
| 异常+响应 | shw-error-handling | 三分类 + 四字段 + 标准错误方案 |
| 会话管理 | shw-session | Hash+Set 双结构 + 滑动过期 + 多角色参数化 |
| 编码生成 | shw-seqnum | Redis INCR + DB 恢复 + N 进制 |
| 分布式锁 | shw-redis-lock | owner + Lua 原子释放 |
| 验证码 | shw-otp | 四键协同 + 频率限制 + 防爆破 |
| AES 加密 | shw-crypto | 跨语言密文互通 + PBKDF2 派生 |
| 短信通知 | shw-sms | Scene 枚举 + Provider 接口 + 日志驱动 |

---

## 何时调用本 skill

- 设计/实现新组件加入组件库时（检查是否遵守 10 条通用范式）
- 迁移组件到新语言时（检查跨语言兼容性）
- Review 组件库代码时（用 10 条范式做检查清单）
- 评估一个功能该放 lib 还是放项目时（用范式 10 判断）

---

## 底线

**组件库的设计范式是跨语言的资产——它不随语言/框架更替而废弃。** 每条范式都是踩坑后的沉淀，遵守它们 = 少走弯路。换语言时，搬范式不搬语法。
