---
name: shw-session
description: 会话管理与 token 认证的设计范式（语言无关）。在设计或实现登录会话、token 认证、多角色会话隔离、踢下线、滑动过期时触发。覆盖 Redis Hash + Set 双结构存会话（key={role}:session:{uuid} 存字段 + key={role}:session:user:{id} 存索引用于踢下线）、UUID 作为 token（无 JWT）、每次 Validate 刷新 last_active_at 并重置 TTL 的滑动过期、同一套 SessionService 通过 Role/TTL/IDField 三参数实例化适配多角色、Bearer token 中间件取 token 调 Validate 注入 context。用户提到会话管理、登录态、token 认证、session、踢下线、多端登录、滑动过期、Bearer 时自动触发。跨语言通用，代码用伪代码表达。
---

# 会话管理设计范式

## 概述

本 skill 是会话管理与 token 认证的**设计范式**，语言无关。所有算法与结构用伪代码描述，换语言照搬同一套思路即可落地。

**核心原则**：会话不是"发个 token 就完事"，而是"双结构存储 + 滑动续命 + 角色参数化"的完整体系。只发 token、不维护活跃度 = 要么用户被误踢下线，要么僵尸会话永驻 Redis。

**适用判断**：设计或实现任何基于 token 的服务端会话（登录态维持、多角色多端会话、管理员后台 / C 端用户统一登录体系）时。**不适用**：无状态 JWT（自包含、服务端不存）、OAuth 第三方授权码流程（那是认证协议，不是会话管理）、纯前端 localStorage 存 token。

---

## 铁律

```
会话存 Redis Hash + Set 双结构（Hash 存字段，Set 存用户会话索引）
token 是 UUID，不是 JWT（服务端可控、可销毁、不泄露载荷）
每次 Validate 都刷新 last_active_at + 重置 TTL（活跃用户永不过期）
滑动 TTL 之外必须有绝对生命周期上限（login_at 起算，如 7 天，超限强制重登）
同一套 SessionService 通过 Role/TTL/IDField 三参数适配所有角色
中间件取 Bearer token → 调 Validate → 注入用户信息到 context
```

凭"直接用 JWT 省得存 Redis"、"一张表/一个 key 存所有会话字段"、"会话固定过期、到期重登就行"的直觉做事——全部是在给未来埋雷。

---

## 1. Redis 双结构存会话

会话用 Redis 的 **Hash + Set** 两种结构分工存储，**不要合并成一种**。这是整个范式的地基。

### Hash 存会话字段（会话本体）

key = `{role}:session:{uuid}`，存储单条会话的完整字段：

| 字段 | 说明 |
|------|------|
| `uuid` | 会话唯一标识（即 token 本身） |
| `id` / `admin_id` | 用户 ID（字段名随角色，见第 3 节多角色参数化的 IDField） |
| `name` | 用户昵称 |
| `username` | 用户名 |
| `role` | 角色值（业务角色，区分于 key 前缀的 role 标识） |
| `is_super_admin` | 是否超管。**派生缓存字段，非权威**：权威判定是 `role` 字段（=2 即超管），本字段写入时从 role 派生，仅供中间件层短路用；两者不一致时以 role 为准 |
| `login_at` | 登录时间（创建会话时写入，不再变）。**绝对生命周期的判定基准**：`now - login_at` 超过绝对上限（如 7 天）即强制过期重新登录 |
| `last_active_at` | 最后活跃时间（每次 Validate 刷新） |

这条 Hash 是**会话的本体**——Validate 时全量 HGetAll 读出，中间件据此注入 context。

### Set 存用户会话索引（踢下线的基础设施）

key = `{role}:session:user:{userID}`，值是该用户的所有会话 UUID 集合：

```
{role}:session:user:1001  →  { "uuid-A", "uuid-B", "uuid-C" }
                            （用户 1001 有 3 个活跃会话：手机/电脑/平板）
```

这条 Set 存在的唯一目的：**支撑 DestroyByUserID（踢下线）**。要销毁某用户的全部会话时，先 SMembers 拿到所有 UUID，逐个 Del 掉 Hash，再 Del 掉 Set 本身。

### 为什么必须双结构（不可合并）

| 单结构（只有 Hash 或只有 Set）的坑 | 双结构如何避免 |
|----------------------------------|---------------|
| 只有 Hash：销毁用户所有会话要 SCAN 全库扫前缀 | Set 直接 SMembers 拿到 UUID 列表，O(1) 定位 |
| 只有 Set：Set 只能存 UUID，存不了会话字段（name/role 等） | Hash 存字段，Set 存索引，各司其职 |
| 合成一个"用户→会话详情"大 Hash：一个用户的会话挤在一个大 key 里 | 每条会话独立 Hash，单条过期/销毁不影响其他 |

**铁律**：Hash 管单条会话的字段，Set 管某用户的会话清单。两条 key 通过 UUID 互相索引。

---

## 2. 双限制过期：滑动续命 + 绝对上限

**核心机制（双限制）**：每次 Validate 都刷新 `last_active_at` 并重置 TTL（滑动限制）；在此之外，**必须有绝对生命周期上限**（如 7 天，从 `login_at` 起算，绝对限制）。两条限制缺一不可。

```
会话创建：TTL = 24h（admin） / 72h（client），login_at = now
首次 Validate：TTL 重置回 24h / 72h
第 N 次 Validate：TTL 仍重置回 24h / 72h
……
只有用户【连续 TTL 时长不访问】才会过期          ← 滑动限制
但【从登录起累计超过绝对上限（如 7 天）】必过期  ← 绝对限制，与活跃度无关
```

**为什么滑动过期必须配绝对上限**：滑动 TTL 单独存在时，一个被盗的 token 只要被攻击者周期性带着访问一次，就会被无限续命——被持续"养"成永不过期的僵尸凭证，用户毫无感知。绝对上限封死这条路径：无论多活跃，从 `login_at` 起最多 N 天（按角色配，如 admin 7 天、client 30 天），到期强制销毁会话、重新登录认证。`login_at` 创建时写入不再变，正是绝对上限的判定基准。

### 为什么不用固定过期

| 方案 | 用户体验 / 安全 |
|------|---------|
| **固定过期（本范式不用）** | 登录后第 24 小时整准时掉线，哪怕用户刚在操作 |
| **只有滑动过期（不完整）** | 活跃用户永不下线，但被盗 token 也被周期访问"养"成永不过期 |
| **滑动 + 绝对上限（本范式）** | 活跃用户在绝对上限内永不下线；超上限必重登；被盗 token 养不成永生 |

### Validate 不是"查一下在不在"，而是"查 + 判上限 + 续"

```
function validate(sessionUUID):
    sessionKey = "{role}:session:{sessionUUID}"
    data = redis.HGetAll(sessionKey)
    if data is empty:
        return null                          // 会话不存在或已过期 → 中间件返 401

    now = currentTimestamp()
    if now - data["login_at"] > ABSOLUTE_TTL:        // ③ 绝对上限判定（login_at 起算）
        redis.Del(sessionKey)                        //    超限 → 强制过期
        return null                                  //    → 401 重新登录

    redis.HSet(sessionKey, "last_active_at", now)   // ① 刷新活跃时间
    redis.Expire(sessionKey, TTL)                    // ② 重置过期时间

    data["uuid"] = sessionUUID
    data["last_active_at"] = now
    return data
```

**三件事缺一不可**：不判绝对上限，被盗 token 能被无限续命；只刷新时间不重置 TTL，会话照样过期；只重置 TTL 不刷新时间，`last_active_at` 就是死的，无法反映真实活跃度（也失去了"最近活跃"的审计价值）。

**注意**：Set 索引 key（`{role}:session:user:{id}`）**不设 TTL**。它会随用户的会话全部销毁时被 Del。如果给 Set 设了 TTL，TTL 到了索引丢了，但 Hash 可能还没过期，DestroyByUserID 就找不到这些会话了。

---

## 3. 多角色参数化：一套代码适配所有角色

**核心机制**：同一套 SessionService 通过三个参数实例化，适配不同角色，**不硬编码任何角色**。

### 三个参数

| 参数 | 作用 | 示例 |
|------|------|------|
| **Role** | 角色标识，用于 Redis key 前缀隔离 | `admin` / `client` / `platform` 等 |
| **TTL** | 会话有效期（秒） | admin = 24h（86400）、客户端 = 72h（259200） |
| **IDField** | Hash 中存储用户 ID 的字段名 | admin 用 `admin_id`，其他角色用 `id` |

### Role 隔离 key 前缀（跨端 token 天然隔离）

不同角色的会话存在不同的 key 命名空间，**互不污染**：

```
admin:session:{uuid}          ← 管理员后台会话
admin:session:user:{adminId}

client:session:{uuid}         ← C 端会话
client:session:user:{id}
```

**关键意义**：管理员的 token 拿到 C 端中间件里 Validate 会直接查 `client:session:{uuid}`（查不到 → 401），跨端 token 天然隔离，不需要额外的角色校验逻辑。key 前缀隔离连读都不用读，直接 401。

### TTL 区分角色安全等级

```
admin（后台，安全要求高）：TTL = 24h，一天不操作就掉线
client（C 端，体验优先）：TTL = 72h，三天不操作才掉线
```

后台账号短 TTL 降低盗用风险；C 端长 TTL 提升用户体验。同一套代码，参数不同，策略不同。

### IDField 适配历史字段命名

```
admin 会话：IDField = "admin_id"   → Hash 里存 { admin_id: 1001, ... }
其他会话：IDField = "id"           → Hash 里存 { id: 1001, ... }
```

**为什么需要这个参数**：不同角色的 Hash 字段名可能因历史表结构而异（admins 表主键叫 `admin_id`，users 表主键叫 `id`）。Destroy 时要从 Hash 反查用户 ID 来清理 Set 索引，必须知道 ID 存在哪个字段里。参数化让组件不绑死任何字段名。

### 参数注入：两种落地形态

"Role/TTL/IDField 三参数"在不同语言里有不同的注入语法落地，**这只是语言习惯不同，设计范式完全一致**：

| 风格 | 适用语言特征 | 机制 |
|------|------------|------|
| **模板方法模式** | 面向对象语言（PHP / Java 等） | 抽象基类 + 抽象方法 `getRole()` / `getTtl()`，子类继承实现 |
| **构造函数注入** | 无继承/偏好组合的语言（Go 等） | `New(role, ttl, idField)` 工厂函数，返回配置好的实例 |

```
// 形态 A：抽象基类 + 子类继承（模板方法模式）
abstract class AbstractSessionService:
    abstract getRole() -> string        // 子类返回 "admin"
    abstract getTtl() -> int            // 子类返回 86400
    getUserIdField() -> string: return "id"   // 默认 id，子类可覆盖为 admin_id

class AdminSessionService extends AbstractSessionService:
    getRole(): return "admin"
    getTtl():  return 86400
    getUserIdField(): return "admin_id"

// 形态 B：构造函数注入 + 项目侧工厂
struct SessionService: { Role, TTL, IDField }
function New(role, ttl, idField) -> *SessionService:
    return &SessionService{ Role: role, TTL: ttl, IDField: idField }
# 项目侧工厂
function NewAdminSession() -> *SessionService:
    return New("admin", 86400, "admin_id")
```

**换语言不换范式**：参数（Role/TTL/IDField）是固定的三件套，只是注入方式（继承 vs 构造）随语言习惯走。

---

## 4. UUID 会话标识：token 是 UUID，不是 JWT

**核心机制**：登录成功后用 UUID 生成 token，token 直接就是 Redis 里那条会话 Hash 的 key 后缀。**不用 JWT**。

### 为什么不用 JWT

| 方案 | 优点 | 缺点 |
|------|------|------|
| **JWT（无状态）** | 服务端不存，天然分布式 | 无法主动销毁（签出去就只能等过期）；载荷明文（或需加密）；刷新/续期复杂 |
| **UUID + Redis（本范式）** | 服务端可控，随时踢下线；零载荷泄露；滑动过期天然支持 | 依赖 Redis；多一次 Validate 的 Redis 查询 |

**会话管理的核心需求是"可控"**：管理员要把某用户踢下线、用户改密码后全部端掉旧会话、安全事件后批量销毁——这些 JWT 做不到（或只能靠黑名单绕弯），UUID + Redis 直接 DestroyByUserID 一步到位。

### token 即 UUID

```
登录成功 → uuid = UUIDv4() → 存入 Redis → 返回给客户端
客户端每次请求带 Authorization: Bearer {uuid}
服务端 Validate → HGetAll("{role}:session:{uuid}") → 拿到会话数据
```

token 不携带任何信息（不像 JWT 把用户 ID/角色塞载荷里），只是一个随机字符串，真正的用户信息全在 Redis 的 Hash 里。token 泄露了，服务端 Del 掉对应 Hash 就立即失效（JWT 做不到）。

---

## 5. Bearer token 认证协议

**核心机制**：客户端通过 HTTP 头 `Authorization: Bearer {token}` 传递 token，认证中间件统一解析。

### 中间件三步走

```
请求进来（带 Authorization 头）
  │
  ▼
┌─────────────────────────────────────────┐
│ 第 1 步：取 token                         │
│ header = request.headers["Authorization"]│
│ token = TrimPrefix(header, "Bearer ")    │
│ 无 header / token 为空 → 401              │
└─────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────┐
│ 第 2 步：Validate                         │
│ data = sessionService.Validate(token)    │
│ data == null（会话不存在/过期）→ 401       │
│ （Validate 内部已刷新 last_active_at+TTL）│
└─────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────┐
│ 第 3 步：注入 context                     │
│ context["user"] = {                       │
│   idField: data[idField],                │
│   name:     data["name"],                │
│   username: data["username"],            │
│   role:     data["role"],                │
│   isSuperAdmin: data["is_super_admin"],  │
│ }                                          │
│ → 放行到业务 handler                       │
└─────────────────────────────────────────┘
```

### 中间件也是参数化的

中间件不硬编码角色，**接收 SessionService 实例作为参数**，项目侧包装成具体角色的中间件：

```
// 框架提供通用中间件
function Auth(request, sessionService, useDataRole):
    token = parseBearer(request)
    data  = sessionService.Validate(token)
    injectUserToContext(request, data)

// 项目侧包装（绑定具体角色）
function AdminAuth(request):
    Auth(request, adminSessionService, true)    // 用 admin 会话服务
function ClientAuth(request):
    Auth(request, clientSessionService, true)   // 用 client 会话服务
```

**路由层挂哪个中间件，就用哪套会话服务**——管理员路由挂 AdminAuth，C 端路由挂 ClientAuth，天然隔离。

### useDataRole 参数

注入 context 时，`role` 字段有两个来源可选：
- `useDataRole = true`：用 Hash 里的 `role` 字段值（业务角色，如 1=普通/2=超管）
- `useDataRole = false`：用 SessionService 的 `Role` 标识（key 前缀，如 "admin"）

根据下游权限系统需要哪种 role 来切换。

---

## 6. 四个核心操作的完整流程

### Create（登录创建会话）

```
function create(userID, extraData):
    1. sessionUUID    = UUIDv4()                             // 生成 token
    2. now            = currentTime()
    3. sessionKey     = "{role}:session:{sessionUUID}"
    4. userSessionsKey = "{role}:session:user:{userID}"

    5. fields = extraData + {
           login_at:       now,
           last_active_at: now
       }
    6. redis.HMSet(sessionKey, fields)                       // 写会话 Hash
    7. redis.Expire(sessionKey, TTL)                         // 设过期时间
    8. redis.SAdd(userSessionsKey, sessionUUID)              // 加入用户会话索引 Set
       // 注意：userSessionsKey 不设 TTL（见第 2 节说明）

    9. return { uuid: sessionUUID, ...fields }               // 返回 token + 会话数据
```

### Validate（校验 + 续期）

见第 2 节伪代码。查不到返 null → 中间件 401；查到则刷新 `last_active_at` + 重置 TTL 后返会话数据。

### Destroy（销毁单条会话，如主动登出）

```
function destroy(sessionUUID):
    1. sessionKey = "{role}:session:{sessionUUID}"
    2. userID = redis.HGet(sessionKey, IDField)              // 先读出用户 ID
    3. if userID != null:
           redis.SRem("{role}:session:user:{userID}", sessionUUID)  // 从索引 Set 移除
    4. redis.Del(sessionKey)                                 // 删会话 Hash
```

**关键顺序**：先从 Hash 读出用户 ID（用来清理 Set 索引），再删 Hash。顺序反了（先删 Hash）就读不到用户 ID，Set 里会残留孤儿 UUID。

### DestroyByUserID（踢下线，销毁用户所有会话）

```
function destroyByUserID(userID):
    1. userSessionsKey = "{role}:session:user:{userID}"
    2. uuids = redis.SMembers(userSessionsKey)               // 拿到所有会话 UUID
    3. for uuid in uuids:
           redis.Del("{role}:session:{uuid}")                // 逐个删会话 Hash
    4. redis.Del(userSessionsKey)                            // 删索引 Set
```

这就是 Set 双结构的价值：**不 SCAN、不遍历、一次 SMembers 定位**。改密码后全部端掉旧会话、安全事件后封禁用户、管理员强制踢人下线——都是这一个操作。

---

## 7. 通用场景举例

| 场景 | Role | TTL | IDField | 设计要点 |
|------|------|-----|---------|---------|
| 管理员后台 | `admin` | 24h (86400) | `admin_id` | 短 TTL 降低盗用风险；单角色单端，会话数少 |
| C 端用户 | `client` | 72h (259200) | `id` | 长 TTL 提升体验；多端登录时 Set 存多条会话 |
| 平台运营 | `platform` | 8h (28800) | `admin_id` | 极短 TTL（高权限账号），配合滑动过期保证工作时段不掉线 |

---

## Good / Bad

| Good | Bad |
|------|-----|
| Redis Hash + Set 双结构存会话 | 只用一个结构（Hash 存不了索引，Set 存不了字段） |
| token 是 UUID，服务端可控 | 用 JWT，签出去就无法主动销毁 |
| 每次 Validate 刷新 last_active_at + 重置 TTL | 固定过期，用户操作到一半被踢 |
| 滑动 TTL + login_at 起算的绝对上限双限制 | 只有滑动过期，被盗 token 被周期访问"养"成永不过期 |
| Role/TTL/IDField 三参数实例化适配多角色 | 每个角色抄一份 SessionService 代码 |
| 不同角色 key 前缀隔离，跨端 token 天然失效 | 所有角色共用一个 key 前缀，靠字段判断角色 |
| 中间件取 Bearer token 调 Validate 注入 context | 业务 handler 自己解析 token、自己查 Redis |
| Destroy 先读 IDField 再删 Hash | 先删 Hash 导致 Set 索引残留孤儿 UUID |
| DestroyByUserID 用 Set 的 SMembers 定位 | SCAN 全库扫前缀找某用户的会话 |
| Set 索引不设 TTL（随会话销毁而 Del） | 给 Set 设 TTL 导致索引与 Hash 不同步 |

---

## 红旗 - 停下重新评估

- 准备用 JWT 做会话（无法主动销毁、载荷明文、刷新复杂）
- 只用一个 Redis 结构存会话（要么存不了字段，要么存不了索引）
- 会话固定过期，不刷新活跃时间（用户体验差，活跃用户被误踢）
- 只有滑动过期没有绝对上限（被盗 token 被周期访问"养"成永不过期）
- 每个角色复制一份几乎相同的 SessionService 代码（应该参数化）
- 所有角色共用一个 key 前缀，靠 Hash 字段区分角色（跨端 token 不隔离）
- 业务 handler 里自己解析 token、自己查 Redis（应该中间件统一处理）
- Destroy 时先删 Hash 再读用户 ID（顺序错了，Set 索引留孤儿）
- DestroyByUserID 用 SCAN 扫前缀（应该用 Set 的 SMembers O(1) 定位）
- 给用户会话索引 Set 设 TTL（索引与 Hash 生命周期不同步）

---

## 防止合理化

| 借口 | 现实 |
|--------|---------|
| "JWT 省得存 Redis，无状态多优雅" | 省了存储，丢了可控性——踢下线、改密失效全做不到，优雅是表象 |
| "一个 Hash 存所有字段，加个 user_id 字段就行" | 那怎么按用户销毁所有会话？SCAN 全库？Set 索引就是干这个的 |
| "固定过期简单，到期重登就完事" | 用户填了一半表单被踢，重登后数据全丢——滑动过期才符合直觉 |
| "角色少的时候复制代码更快" | 现在少不代表以后少；参数化是一次性的成本，复制是每次的债 |
| "跨端校验加个角色字段判断就行" | 字段判断要先把会话读出来，key 前缀隔离连读都不用读，直接 401 |
| "中间件太重，handler 里取 token 也行" | 每个 handler 取一次、查一次 Redis、注入一次——重复且容易漏 |
| "Destroy 顺序无所谓，反正都要删" | 先删 Hash 读不到用户 ID，Set 索引永远清不掉，慢慢堆积 |
| "Set 加个 TTL 更安全，自动清理" | Set 过期了但 Hash 还在，DestroyByUserID 彻底失效 |

---

## 何时触发

**以下场景必须按本范式设计：**

- 新项目需要基于 token 的登录会话管理
- 设计多角色（后台 + C 端）的统一登录体系
- 实现踢下线、改密失效、多端会话管理等能力
- 从一种语言迁移会话系统到另一种语言
- 排查"用户被误踢下线"、"僵尸会话堆积"、"跨端 token 串用"等问题
- 评估是否该用 JWT vs 服务端会话（对照本范式判断）

**不触发：**

- 只读现有会话代码、查资料（没在设计/实现）
- OAuth 第三方授权流程（那是认证协议，不是会话管理）
- 纯无状态 API（不需要登录态，每次请求自带完整凭证）
- 前端 localStorage 存 token 的逻辑（那是前端存储，不是服务端会话设计）

---

## 底线

**双结构存会话，UUID 当 token，滑动续命，参数化多角色。**

Hash 存字段（`{role}:session:{uuid}`）、Set 存索引（`{role}:session:user:{id}`），缺一个则要么存不下、要么查不到。UUID 不带载荷、服务端全控，要踢就踢。每次 Validate 刷新活跃 + 重置 TTL（滑动），再叠加从 login_at 起算的绝对上限（如 7 天，超限强制重登）——活跃用户在上限内永不过期，被盗 token 养不成永生。一套 SessionService 配 Role/TTL/IDField 三参数适配所有角色，不复制代码（参数注入方式随语言习惯走：面向对象语言用模板方法，组合偏好语言用构造函数注入）。

省了 Redis 结构、用了 JWT、忘了滑动过期——线上出"用户莫名掉线"、"僵尸会话占满内存"、"改密后旧 token 还能用"的时候，就是这次偷的懒在还债。

这是不可协商的。
