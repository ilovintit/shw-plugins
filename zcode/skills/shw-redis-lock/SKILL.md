---
name: shw-redis-lock
description: 在设计或实现 Redis 分布式锁时触发。SET NX EX 原子获取、Lua 脚本原子释放（owner UUID 比对后才 del，防 A 超时释放 B 的锁）、Lua 脚本原子续期（GET 比对 owner 后 EXPIRE，不重写 value，仅续自己的锁）、Create/Get 分离（构造≠获取）、redis-lock: 命名空间隔离、ForceRelease 运维逃生口（绕过 owner）。Lua 释放/续期脚本逐字固定，owner 逻辑跨实现零差异。用户提到分布式锁、Redis 锁、SETNX、Lua 释放、锁续期、锁超时、owner 防误删、ForceRelease 时自动触发。
---

# Redis 分布式锁设计范式

## 概述

本 skill 是 Redis 分布式锁的**设计规范**，语言无关。这是一份语义规范——只要照搬同一份 Lua 脚本、同一个 key 前缀、同一套 owner UUID 比对逻辑，任何语言都能实现出语义完全一致的锁。

**核心原则**：分布式锁不是"SETNX 一把梭"。它是"原子获取 + 原子释放（owner 比对）+ 原子续期 + 逃生口"的完整体系。只会加锁不会安全释放 = 互斥随时失效。

**适用判断**：设计或实现基于 Redis 的分布式互斥（单实例 Worker、防重复执行、资源串行化、限流）时。跨进程 / 跨实例需要"同一时刻只有一个执行者"的场景都适用。

---

## 1. 锁的生命周期与 key 约定

### key 前缀：命名空间隔离

所有锁 key 统一加前缀 `redis-lock:`，与业务缓存物理隔离：

```
锁 key = "redis-lock:" + 业务标识
例：redis-lock:order-sync-123
```

加前缀的目的：
- 与普通缓存 key 隔离，运维 `SCAN redis-lock:*` 可独立巡检所有锁
- 避免业务 key 与锁 key 撞名导致误删锁
- 方便批量清理（排查某模块锁时只扫该前缀）

### 锁的四要素

| 要素 | 取值 | 作用 |
|------|------|------|
| key | `redis-lock:{biz}` | 锁的标识 |
| value（owner） | UUID | 持有者身份凭证，释放 / 续期时比对 |
| TTL（EX seconds） | 业务预估执行时长 | 防持锁者宕机导致锁永不释放 |
| 操作 | acquire / release / extend / forceRelease | 生命周期四个动作 |

**owner 是 UUID**：每次获取锁生成一个全局唯一 owner，写入 key 的 value。这个 owner 是"这是我的锁"的唯一凭证，后续释放、续期都要带上它比对。owner **每次获取新生成**，禁止复用固定值或业务 ID。

---

## 2. 原子获取：SET NX EX

### 获取命令（伪代码）

```
SET redis-lock:{biz} {owner} NX EX {seconds}
```

- `NX`：仅当 key 不存在时设置（已被持有则返回 nil / false）
- `EX {seconds}`：同时设置过期时间
- `{owner}`：新生成的 UUID

返回 false / nil = 锁已被他人持有，获取失败；返回 OK = 获取成功。

### 为什么 NX 和 EX 必须一条命令

```
错误做法（两步，禁止）：
   SETNX key owner        ← 加锁成功
   EXPIRE key seconds     ← 设过期
   问题：两条命令之间进程崩溃 → 锁没过期时间 → 永不释放 → 死锁

正确做法（一条命令）：
   SET key owner NX EX seconds
   ← 加锁 + 过期原子完成，要么都成，要么都不成
```

**铁律**：获取锁的"设值"和"设过期"必须原子。`SET ... NX EX` 一条命令搞定，禁止 SETNX + EXPIRE 两步。

---

## 3. 原子释放：Lua 脚本 + owner 比对（防误删）

这是分布式锁**最关键**的安全点。

### 释放脚本（逐字固定）

```
if redis.call("get",KEYS[1])==ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end
```

- `KEYS[1]` = 锁 key
- `ARGV[1]` = 当前持有者的 owner（UUID）
- 逻辑：GET 出当前 value，与传入 owner 比对，**相等才 DEL，不等返回 0**（不动）

**这份 Lua 脚本是规范约定，逐字固定**。换语言实现时原样搬，一个字符都不改。

### 为什么释放必须用 Lua（不能用 GET + DEL 两步）

释放锁本质是"GET → 判断是不是我的 → 是就 DEL"三步。如果拆成多条独立命令：

```
错误做法（有竞态窗口，禁止）：
   GET key → 得到 value
   （间隙！）此时 key 可能已超时过期，被 B 重新获取
   判断 value == 我的 owner → 是
   DEL key  → 删掉了 B 的锁！
```

GET 和 DEL 之间有时间窗口，其他命令可能插入。Lua 脚本在 Redis 服务端**原子执行**，中间不会被其他命令打断，彻底消除这个竞态。

### owner 比对防误删：经典场景（A 超时释放 B 的锁）

```
时间线：
  t0   A 获取锁（owner=A，TTL=10s）
  t1   A 业务执行缓慢，超过 10s
  t10  锁自动过期（A 还在跑，但锁已释放）
  t11  B 获取锁成功（owner=B）
  t12  A 终于执行完，要释放锁

  若 A 不比对 owner 直接 DEL → 删掉 B 的锁
  → C 又能获取锁 → A、B、C 三个执行者同时"持锁"，互斥彻底失效

  Lua 脚本比对 owner：
  A 传入 owner=A，但 key 当前 value=B，不等 → 返回 0，不删
  → B 的锁安全，A 的"幽灵释放"被挡住
```

**铁律**：释放锁必须比对 owner，只删自己的锁。不比对的释放 = 互斥随时被打破。

---

## 4. 续期：Lua 脚本原子续期（仅续自己的锁）

### 为什么需要续期

业务执行时间不可精确预估。TTL 设短了 → 任务没跑完锁就过期，别人趁虚而入；TTL 设长了 → 持锁者真宕机时锁要等很久才释放。续期解决这个矛盾：**TTL 设保守短值，长任务执行期间周期性续期**。

### 续期脚本（逐字固定）

续期和释放一样必须用 Lua 脚本原子执行——GET 比对 owner 通过后只 `EXPIRE` 改 TTL，**绝不重写 value**：

```
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("EXPIRE", KEYS[1], ARGV[2])
else
    return 0
end
```

- `KEYS[1]` = 锁 key
- `ARGV[1]` = 当前持有者的 owner（UUID）
- `ARGV[2]` = 新 TTL（seconds）
- 逻辑：GET 出当前 value，与传入 owner 比对，**相等才 EXPIRE 续命，不等返回 0**（不动）
- 返回 1 = 续期成功；返回 0 = 锁已不属于我

**这份 Lua 脚本和释放脚本一样是规范约定，逐字固定**。换语言实现时原样搬，一个字符都不改。

### 为什么续期不能用 GET + SET XX EX 两步

```
错误做法（有竞态窗口，禁止）：
   1. GET key → 当前 value
   2. 比对 value == 我的 owner → 是
   （间隙！）此时 key 可能已超时过期，被 B 重新获取（owner=B）
   3. SET key owner XX EX {新seconds} → key 存在，SET 成功
   → value 被改写成 A 的 owner！
```

危害远不止"TTL 拖乱"：`SET XX EX` 是**写 value** 的命令，一旦在 GET 与 SET 的间隙里锁易了主，它会**把别人的 owner 覆盖成自己的**——此后 owner 体系整个错乱：B 还以为锁是自己的（实际 owner 已被偷换），B 的续期 / 释放全部失效；A 的释放反而会比对"成功"、删掉 B 的锁。互斥彻底失效。

Lua 脚本原子执行"GET 比对 + `EXPIRE`"：比对和续命之间没有间隙；且 `EXPIRE` **只改 TTL、不碰 value**——即使锁已易主，也只是安全地返回 0，不会覆盖任何人的 owner。

### owner 比对防误续（与释放同理）

```
误续场景：
  A 持锁超时 → B 重获（owner=B）
  A 的续期器用 Lua 比对 owner：传入 owner=A，当前 value=B，不等 → 返回 0，不续
  → A 的续期器自我退出，B 的锁毫发无损
```

**续期失败（返回 0）即放弃锁**：续期时发现 owner 已不是自己，说明锁已超时易主。此时持锁者必须**立即停止业务执行**（它已不再持锁，继续跑就是越权），不能假装无事发生继续干活。

---

## 5. Create / Get 分离（构造≠获取）

### 构造锁对象 ≠ 获取锁

```
Create(key)：构造一个锁对象（绑定 key、生成 owner、设好 TTL）
   ↓ 此时还没占住 Redis key，只是准备好了"持锁凭证"
   ↓ 轻量本地操作，不碰 Redis，无网络往返

Get(key)：真正去 Redis 抢占
   ↓ SET NX EX，成功才占住 key，失败返回 false
   ↓ 网络往返，可重复调用（重试）
```

两步分离，支持三种使用模式：

```
模式 1：一次性获取（拿不到就失败）
   lock = Create(key)
   ok = lock.Get()
   if not ok: return "忙，请稍后"

模式 2：尝试获取 + 失败重试（带退避）
   lock = Create(key)
   while not lock.Get():
       sleep(退避间隔 + 抖动)
       （重试到上限或成功）

模式 3：抢占 + 自动续期 + 安全释放
   lock = Create(key)
   if lock.Get():
       启动续期协程 / 定时器
       do business()
       lock.Release()   ← Lua owner 比对释放
       停止续期协程 / 定时器
```

**为什么分离**：如果构造即获取，就没法表达"我想先准备好，按条件决定何时抢"和"抢不到就重试"。Create 是轻量本地操作，Get 才是网络往返，分开后重试循环只重复 Get，不重复构造。

---

## 6. 锁对象的抽象

锁的核心语义（Get / Release / Extend / ForceRelease）跨语言一致，只是组织方式随语言习惯走：

| 语言特征 | 组织方式 |
|---------|---------|
| 面向对象语言 | 抽象基类 + 子类继承复用 Get / Release / Extend / ForceRelease |
| 组合偏好语言 | 结构体 + 方法集，构造函数创建实例 |

```
锁对象持有：
  - key    : string   = "redis-lock:" + 业务标识
  - owner  : string   = 新生成的 UUID（Get 成功时绑定）
  - ttl    : int      = 过期秒数（EX seconds）
  - redis  : Redis客户端

方法（跨语言语义一致）：
  Create(key, ttl)   构造：设 key / ttl，不碰 Redis
  Get()              获取：SET NX EX，成功绑定 owner
  Release()          释放：执行 Lua 释放脚本（owner 比对）
  Extend(newTtl)     续期：执行 Lua 续期脚本（owner 比对 + EXPIRE，不重写 value）
  ForceRelease()     强制释放：直接 DEL，不比对 owner
```

**跨语言要点**：换语言时，Lua 脚本和 key 约定原样搬，只调整"锁"这个概念在目标语言里怎么表达（类继承 vs 结构体方法）。锁的语义、安全逻辑、防误删 / 防误续机制零差异。

---

## 7. ForceRelease：运维逃生口（绕过 owner）

### 忽略 owner 强制删除

```
ForceRelease(key)：直接 DEL redis-lock:{biz}，不比对 owner
```

正常流程**绝不**用 ForceRelease——它绕过 owner 比对，可能删掉别人正在持有的锁。它的唯一用途是**运维逃生**：

```
适用场景（人工应急）：
  - 持锁进程崩溃且 owner 丢失，锁卡死不释放（TTL 兜底失效时）
  - 持锁者陷入死循环，TTL 被续期器一直续，锁永远不释放
  - 应急排查需要强行让出资源

禁止场景：
  - 业务代码里"释放失败就 ForceRelease" → 这是掩盖 bug，不是修复
  - 自动化流程里当正常释放用 → 绕过 owner 比对 = 互斥失效
```

**铁律**：ForceRelease 是人工应急工具，不是业务 API。业务释放一律走 Lua owner 比对。

---

## Good / Bad 速查

| Good | Bad |
|------|-----|
| 获取用 `SET NX EX` 一条命令 | SETNX + EXPIRE 两步（中间崩溃死锁） |
| 释放用 Lua 脚本 + owner 比对 | GET + DEL 两步，或直接 DEL 不比对 |
| owner 用 UUID，每次获取新生成 | 用固定值或业务 ID 当 owner（多实例撞车） |
| 续期用 Lua 脚本（比对 owner 后只 EXPIRE，不重写 value） | GET + SET XX EX 两步续期，或 SET XX EX 直接续（可能覆盖他人 owner） |
| key 加 `redis-lock:` 前缀隔离 | 裸 key，与业务缓存混用 |
| Create / Get 分离，支持重试 | 构造即获取，无法表达重试 |
| ForceRelease 只用于运维应急 | 业务代码失败就用 ForceRelease 兜底 |
| 续期失败立即停止业务（锁已易主） | 续期失败假装没事继续跑（越权执行） |

---

## 常见错误（禁止）

- **SETNX + EXPIRE 两步加锁** → 中间崩溃锁无 TTL，死锁。用 `SET NX EX` 一条命令。
- **释放不比对 owner 直接 DEL** → 超时易主后误删别人的锁，互斥失效。用 Lua owner 比对。
- **释放用 GET + DEL 两条命令** → 中间有竞态窗口。必须 Lua 脚本原子执行。
- **owner 用固定值 / 业务 ID** → 多实例持相同 owner，互相能释放对方的锁。owner 必须每次获取新生成 UUID。
- **续期用 GET + SET XX EX 两步（或单用 SET XX EX）** → 间隙里锁易主后 SET 会覆盖他人 owner，owner 体系错乱、互斥失效。用 Lua 脚本原子续期：比对 owner 后只 `EXPIRE`，不重写 value。
- **续期失败仍继续业务** → 锁已超时易主，你已无权持有。续期失败必须停业务。
- **业务代码用 ForceRelease 当正常释放** → 绕过 owner 比对，互斥形同虚设。ForceRelease 只能运维应急。
- **key 不加前缀** → 与业务缓存撞名误删锁。统一 `redis-lock:` 前缀。
- **构造即获取，无法重试** → 丢失"尝试 + 退避重试"能力。Create / Get 分离。

---

## 何时调用本 skill

**以下场景加载本 skill：**

- 设计或实现基于 Redis 的分布式锁
- 涉及锁获取、释放、续期、强制释放的生命周期设计
- 单实例 Worker 互斥、防重复执行、资源串行化、限流等需要分布式互斥
- 排查锁互斥失效、锁超时误删、续期失效、死锁等问题
- 跨语言实现对齐分布式锁语义

**不触发：**

- 单进程内的互斥（用语言原生锁 / Mutex 即可，不需要 Redis）
- 数据库行锁 / 乐观锁（不是 Redis 分布式锁范畴）
- 只读代码、了解现有锁实现（没在动手设计 / 实现）

---

## 底线

**分布式锁的安全感全在释放和续期的 owner 比对上。**

获取用 `SET NX EX` 一条命令，释放用 Lua 脚本比对 owner（`if redis.call("get",KEYS[1])==ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`），续期同样用 Lua 脚本（`if redis.call("GET",KEYS[1])==ARGV[1] then return redis.call("EXPIRE",KEYS[1],ARGV[2]) else return 0 end`，只改 TTL 不重写 value）——这三道 owner 校验是互斥不破的根基。绕过任何一道，锁就是摆设：超时易主、误删误续、多执行者并发。

ForceRelease 是给运维的灭火器，不是给业务的工具。Lua 脚本和 `redis-lock:` 前缀是规范约定，逐字固定，换语言原样搬。

省了 owner 比对、用了 SETNX 两步、续期不校验——线上互斥失效的时候，就是这次偷的懒在还债。

这是不可协商的。
