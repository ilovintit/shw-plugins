---
name: shw-wecom
description: 企业微信全集成的两层架构设计范式（语言无关，伪代码描述）。在设计或实现企业微信对接（通讯录同步、自建应用、应用消息推送、OAuth 网页授权、PC 扫码登录、JS-SDK 签名、回调事件处理）时触发。覆盖两层设计（Foundation 依赖 Provider，Provider 纯底层不依赖框架）、统一入口 WecomProvider（contact→通讯录应用 / app→自建应用）、callable 工厂懒构造（首次调用才实例化，避免循环依赖）、Token/Ticket Redis 缓存 TTL 7000s（7200-200）+ 并发去重（RedisLock+double-check+自旋）、OAuth state 30s 一次性防伪（取后即删防 CSRF）、回调 handleCallback 五步流水线（验签解密→XML解析→resolveEvent→readonly事件→分发）、UnknownEvent 兜底不丢弃、多应用共享基础设施。用户提到企业微信、企微、WeCom、access_token 缓存、jsapi_ticket、OAuth 静默授权、扫码登录、回调验签、通讯录同步、自建应用时自动触发。
---

# 企业微信集成设计范式

## 概述

本 skill 是企业微信全链路集成的**设计范式**，语言无关（伪代码描述），可照搬到任意后端栈。

**核心原则**：企业微信集成不是"一把梭调 API"，而是"两层架构 + 工厂懒构造 + Token 并发去重 + state 防伪 + 回调事件分发"的完整体系。只调 API 不管 token 并发 = 高并发时被企微限流封 IP；只做授权不存 state = 被构造回跳 CSRF 打穿。

**适用判断**：设计或实现企业微信平台对接时——通讯录同步、自建应用、消息推送、网页授权、扫码登录、JS-SDK、回调事件，任一场景都适用。纯公众号 / 小程序（非企业微信）不适用。

---

## 铁律

```
Foundation 层依赖 Provider 层，不可反向依赖
Provider 层是纯底层，不依赖任何业务框架（可独立测试 / 复用）
所有入口通过统一 WecomProvider 获取，不直接 new 应用类
Token / Ticket 缓存 TTL 7000s（原始 7200s 提前 200s 过期）
Token / Ticket 并发去重：分布式锁 + double-check + 自旋
OAuth state 一次性消费（30s TTL，取后即删，防 CSRF）
回调 handleCallback 固定五步流水线，事件分发未识别派发 UnknownEvent 兜底，绝不丢弃
回调验签解密依赖每个应用独立的 token + aes_key
```

凭"直接 new 一个 Client 调 API 省事"、"token 过期就重新获取呗，并发怎么了"、"state 随便传个固定值"的直觉做事——全部是在高并发或被攻击时塌方的导火索。

---

## 1. 两层设计：Foundation 依赖 Provider

企业微信集成拆**两层**，依赖方向单向，不可反转。

```
              ┌─────────────────────────────────────────────┐
              │           消费方（Controller / Service）       │
              │        注入统一 WecomProvider，调用业务方法     │
              └──────────────────┬──────────────────────────┘
                                 │ 依赖注入
              ┌──────────────────▼──────────────────────────┐
              │         Foundation 层（业务编排）              │
              │  统一入口 WecomProvider → 应用类（Contact/Agent）│
              │  OAuth / JsApi / QrLogin 编排 Manager         │
              │  Token / Ticket / State 缓存管理器（共享单例）  │
              │  回调事件类（readonly 事件对象）                │
              └──────────────────┬──────────────────────────┘
                                 │ 调用
              ┌──────────────────▼──────────────────────────┐
              │         Provider 层（纯底层，不依赖框架）        │
              │  凭证值对象 / HTTP 客户端 / URL 构建器           │
              │  消息值对象 / 回调加解密 / 异常分层             │
              └─────────────────────────────────────────────┘
```

### Provider 层：纯底层，不依赖框架

Provider 层是**纯底层组件**，不依赖任何业务框架，可独立测试、可被任何上层复用：

| 组件 | 职责 | 说明 |
|------|------|------|
| 凭证值对象 | 封装 corpId + secret + 可选 agentId | 不可变，作为下游组件统一入参 |
| HTTP 客户端 | 封装企微服务端 API 调用 | 模板方法统一处理 token 注入 + 过期重试 |
| URL 构建器 | 纯静态拼接 OAuth / 扫码登录 / 前端回跳 URL | 无状态 |
| 消息值对象 | 9+ 种消息类型的抽象基类 + 子类 | `getType()` + `toArray()` 序列化 |
| 回调加解密 | 验签 + AES-CBC 解密回调（AES 用 OpenSSL 不用废弃的 mcrypt） | 43 位 EncodingAESKey 补 `=` base64_decode 得 32 字节 key |
| 异常分层 | 业务异常（errcode != 0）与基础设施异常（HTTP/JSON 失败）分离 | 便于上层差异化处理 |

**Provider 层的 Token 管理只定义接口，不实现缓存**：缓存策略（Redis、锁）由 Foundation 层实现并注入。这样 Provider 层保持纯净，不耦合具体缓存基础设施。

### Foundation 层：业务编排 + 缓存基础设施

Foundation 层依赖业务框架（配置 / Redis / 依赖注入容器 / 事件分发器），负责：

- **组装**：读配置，构造凭证，注入共享的缓存管理器
- **编排**：串联 state 存储 + URL 拼接 + API 调用，提供一站式方法
- **缓存**：实现 Token / Ticket 的 Redis 缓存 + 并发去重
- **分发**：回调验签解密后构造事件对象，派发给事件分发器

**铁律：Foundation 层依赖 Provider 层，不可反向依赖。** Provider 层若回头依赖 Foundation 的缓存实现，依赖关系打结，无法独立测试，也无法被其他上层复用。

> 各语言落地形态不同：事件分发器、依赖注入容器在某些语言没有现成对等物时，可自建轻量实现或用显式构造注入；Provider 层保持纯 HTTP 客户端即可。

---

## 2. 统一入口 WecomProvider：contact / app + 工厂懒构造

### 入口 Provider

所有企微能力通过**唯一入口** WecomProvider 获取，不直接 new 应用类：

```
class WecomProvider:
    contact()              → 通讯录同步应用（懒构造 + 缓存）
    app(name?)             → 自建应用（懒构造 + 缓存，name 默认取 default_app 配置）
```

`contact()` 和 `app()` 首次调用时才构造实例，后续返回缓存。构造应用时内部完成：

1. 读取配置，构造凭证值对象（corpId + secret + 可选 agentId）
2. 用凭证 + 共享 Token 管理器构造 HTTP 客户端
3. 注入事件分发器
4. 传入该应用独立的回调 token + aes_key
5. 对自建应用，额外注入 OAuth / JsApi / QrLogin 的工厂回调

**为什么必须走统一入口**：应用类的构造参数多（凭证、客户端、事件分发器、回调密钥、工厂回调），且自建应用需要工厂回调才能正常工作——散落各处直接 new 必然漏配置、必然各写各的、必然出错。

### 工厂懒构造（callable 工厂，避免循环依赖）

自建应用的三个编排 Manager（OAuth / JsApi / QrLogin）通过 **callable 工厂懒构造**——传入的是一个工厂回调（callable / 闭包 / 函数值），首次调用才实例化，后续返回缓存：

```
WecomProvider 在组装自建应用时：
  app.setOauthFactory(() => new OauthManager(client, stateStore, credential, redirectUri))
  app.setJsApiFactory(() => new JsApiHelper(ticketManager, credential))
  app.setQrLoginFactory(() => new QrLoginManager(credential, stateStore, redirectUri))

首次调用 app.getOauth() 时才执行工厂回调实例化，后续返回缓存。
```

**为什么用 callable 工厂懒构造而不是构造时直接 new**：

| 直接 new 的问题 | callable 工厂懒构造如何避免 |
|----------------|---------------------------|
| TicketManager 依赖 TokenManager，构造顺序耦合 | 工厂闭包延迟捕获，组装时顺序自由 |
| 即使用不到 OAuth 也提前实例化所有 Manager | 按需实例化，省开销 |
| 循环依赖风险（Manager 间相互引用） | 闭包隔离，无循环——工厂首次调用才实例化，彼时依赖已就绪 |

> callable / 闭包在不同语言里对应不同形态：函数值 + 字段 nil 检查 / sync.Once 等都能实现懒缓存，语义一致。

### 多应用支持

配置文件用 `apps` 数组挂多个自建应用，按 name 获取：

```
wecom:
  corp_id: ww1234...
  cache_prefix: wecom
  contact: { secret, token, aes_key }        # 通讯录同步应用（独立配置）
  default_app: main
  apps:
    main: { agent_id, secret, token, aes_key, oauth_redirect_uri, qr_login_redirect_uri }
    hr:   { agent_id, secret, token, aes_key, oauth_redirect_uri, qr_login_redirect_uri }
```

`provider.app('hr')` 按名称获取 HR 应用。**所有应用共享同一套 Redis 缓存基础设施**（Token 管理器、Ticket 管理器、StateStore 均为共享单例），通过凭证的 corpId + md5(secret) 区分缓存 Key，互不干扰。

**通讯录同步应用与自建应用的本质区别**：

| 维度 | 通讯录同步应用（Contact） | 自建应用（Agent） |
|------|--------------------------|------------------|
| agentId | **无**（为 null） | 有 |
| 职责 | 成员 / 部门增删改查 | 消息推送、OAuth、扫码登录、JS-SDK |
| 回调事件 | change_contact（按 ChangeType 区分） | subscribe / enter_agent（按 Event 区分） |
| OAuth / 扫码 / JsApi | 不支持（没有 agentId 拼不出 URL） | 支持 |

---

## 3. WecomApp 抽象基类

应用类的抽象基类持有凭证、HTTP 客户端、事件分发器、回调密钥，提供所有应用共享的通用能力：

```
abstract class WecomApp:
    # 通用成员能力
    getUser(userid)                → 成员详情
    getUserIdByMobile(mobile)      → 手机号换 UserID
    convertToOpenId(userid)        → userid 转 openid（支付场景）

    # 回调处理（统一五步流水线，见第 8 章）
    handleCallback(msgSignature, timestamp, nonce, encryptedXml):
        1. 验签解密：用回调密钥（token + aes_key）校验签名 + AES-CBC 解密
        2. XML 解析：解析明文 XML → 关联数组（标签名 → 文本值）
        3. resolveEvent：子类映射到具体事件类（提取 Event / ChangeType）
        4. readonly 事件：构造不可变事件对象（构造后不可修改）
        5. 分发：事件分发器派发

    # 子类实现：事件类型 → 具体事件类的映射
    abstract resolveEvent(eventType, changeType, raw) → WecomCallbackEvent
```

**模板方法模式**：`handleCallback()` 是固定的五步流水线，只有第 3 步"映射到哪个事件类"由子类决定。通讯录应用按 ChangeType 映射通讯录事件，自建应用按 Event 映射应用事件。详细流水线见第 8 章。

> 无类继承的语言用 interface + 嵌入结构体 / 组合实现"抽象基类 + 模板方法"语义，模板方法由基础结构体提供，子类型只需实现 resolveEvent。

---

## 4. Token / Ticket 缓存与并发去重（核心精巧设计）

这是整套集成里**最容易被忽视、出事最狠**的部分。access_token 和 jsapi_ticket 都是企微颁发、有效期 7200s、有调用频率限制的全局凭证。高并发下若不缓存去重，瞬间打爆企微 token 接口，触发限流甚至封 IP。

### 缓存 TTL 提前过期

```
企微原始有效期：7200s
本范式缓存 TTL：7000s（提前 200s 过期）
```

**为什么提前 200s**：避免缓存恰好到期的那一瞬间，大量请求同时发现缓存失效同时去刷新。提前过期让缓存在到期前就被主动刷新，平滑过渡。

### 并发去重三段式（RedisLock + double-check + 自旋）

多个请求同时发现 token 缓存失效时，**只允许第一个去刷新，其余等待**：

```
function getToken(credential):
    # 第 1 段：缓存命中直接返回
    cached = redis.get(cacheKey)
    if cached 存在:
        return cached

    # 第 2 段：加分布式锁 + double-check
    lock = RedisLock.create("{prefix}:token_lock:{corpId}", 10s)
    if lock.get():                          # 抢到锁
        try:
            cached = redis.get(cacheKey)    # double-check：可能别的协程刚刷新完
            if cached 存在:
                return cached
            token = fetchFromWecom(credential)   # 只有抢到锁的协程真正调企微
            redis.setex(cacheKey, 7000, token)
            return token
        finally:
            lock.release()

    # 第 3 段：未抢到锁——自旋等待（重试 5 次，每次间隔 200ms）
    for i in 0..5:
        sleep(200ms)
        cached = redis.get(cacheKey)
        if cached 存在:
            return cached

    throw InfrastructureException("获取 token 超时（锁竞争未刷新）")
```

**三段缺一不可**：

| 段 | 缺失的后果 |
|----|-----------|
| 缓存命中检查（第 1 段） | 每次都走锁，性能崩塌 |
| 加锁 + double-check（第 2 段） | 多协程同时刷新触发限流；double-check 防止锁内重复刷新 |
| 自旋等待（第 3 段） | 未抢到锁的协程直接报错，用户看到错误；自旋让它们等抢锁的协程刷完 |

### 缓存 Key 设计

```
Token Key:  {prefix}:token:{corpId}:{md5(secret)}
Ticket Key: {prefix}:ticket:{corpId}:{md5(secret)}
Lock Key:   {prefix}:token_lock:{corpId}   /   {prefix}:ticket_lock:{corpId}
```

Key 用 corpId + md5(secret)：同一企业不同应用 secret 不同，Key 天然隔离；md5(secret) 避免明文 secret 出现在 Key 里。

### forceRefresh：强制刷新

提供 `forceRefresh()`：先删缓存再重新获取，**仅在遇到企微 token 失效错误码（42001 / 40014）时调用**。正常流程走缓存，不主动刷新。

### Token 管理器与 Ticket 管理器同构

jsapi_ticket 的缓存去重逻辑与 access_token **完全一致**（同样的三段式）。唯一区别：get_jsapi_ticket 接口本身需要 access_token 鉴权，因此 Ticket 管理器内部依赖 Token 管理器。两者共享同一套并发去重骨架，不各写一套。

---

## 5. HTTP 客户端：Token 过期自动重试

HTTP 客户端用模板方法统一处理 token 注入与过期重试：

```
function request(path, query, body):
    # 1. 从 token 管理器获取（带缓存的）token
    token = tokenManager.getToken(credential)
    query['access_token'] = token

    # 2. 发请求
    result = http(path, query, body)

    # 3. 命中 token 过期错误码（42001 / 40014）→ 强制刷新 + 重试一次
    if result.errcode in [42001, 40014]:
        token = tokenManager.forceRefresh(credential)
        query['access_token'] = token
        result = http(path, query, body)

    # 4. 检查最终结果，errcode != 0 抛业务异常
    if result.errcode != 0:
        throw WecomException(result.errmsg, result.errcode)

    return result
```

**只重试一次**：token 过期是偶发，刷新后必有效；若刷新后还失败，说明是其他业务错误，不再无脑重试。

**获取 token 本身不走模板**：`gettoken` 接口调用时还没有 token，直接裸调，不走 `request()` 模板。这是唯一绕过模板的接口。

---

## 6. OAuth 网页授权与 state 一次性防伪

OAuth 是企微内 H5 静默授权拿用户身份的核心流程，state 防伪是安全命脉。

### 完整三步流程

```
步骤 1：生成授权链接（后端）
  buildAuthorizeUrl(returnUrl, scope='snsapi_base'):
      state = stateStore.create(returnUrl)    # 存 state → returnUrl 到 Redis（30s TTL）
      return 拼 OAuth URL（含 state）

步骤 2：企微回跳到配置的 redirect_uri（后端）
  buildFrontendRedirectUrl(state, code):
      returnUrl = stateStore.consume(state)   # 消费 state（取后即删）
      if returnUrl == null:
          return null                          # state 无效/过期/被重复消费 → 防 CSRF
      return 拼 returnUrl + code 的前端回跳 URL

步骤 3：前端拿 code 调后端换身份（后端）
  getUserinfoByCode(code)           → userid / user_ticket
  getUserDetailByTicket(ticket)     → 手机号、真实姓名等敏感信息（需 snsapi_privateinfo scope）
```

### state 防伪：30s TTL + 一次性消费（取后即删）

```
state 存储 Redis Key: {prefix}:oauth:state:{32位随机id}
TTL: 30 秒
消费策略: 取后立即删除（一次性，DEL 原子操作）
```

**为什么必须一次性消费**：

| 攻击 / 问题 | 一次性消费如何防御 |
|-------------|-------------------|
| CSRF：攻击者构造一个带合法 state 的回跳 URL 诱导用户点击 | state 取后即删，攻击者无法复用同一个 state |
| 重放：同一个 state 被多次提交 | 第二次消费返回 null，拒绝处理 |
| state 泄露后的窗口期 | 30s TTL 兜底，泄露了也很快失效 |

**state 还顺便承载 returnUrl**：授权完成后的前端回跳地址随 state 存入 Redis，回跳时取出拼接 code。这样前端授权前只需告诉后端"授权完回哪个页面"，不用前端自己管 state 的生命周期。

**state 无效返回 null，不抛异常**：上层判断 null 后返回 400 / 引导重新授权。不抛异常是因为这不是程序错误，是正常的防伪拦截。

> 消费的"取后即删"必须原子：用 `GETDEL`（Redis 6.2+）或 Lua 脚本保证原子，避免并发下双消费窗口。

---

## 7. PC 扫码登录

支持两种模式，均复用 OAuth 的 state 防伪机制：

| 模式 | 方法 | 说明 |
|------|------|------|
| 跳转模式 | `buildRedirectUrl(returnUrl)` | 生成完整 URL，直接引导用户跳转扫码 |
| 嵌入式 | `buildEmbedParams(returnUrl)` | 返回参数（appid / agentid / redirect_uri / state / href）供前端 JS SDK 渲染内嵌二维码 |

两种模式内部都调 `stateStore.create(returnUrl)` 存 state。回跳处理复用 OAuth 的 `buildFrontendRedirectUrl()`（消费 state 防 CSRF），后续 code 换身份也复用 OAuth 链路。

**redirect_uri 独立配置**：扫码登录的 `qr_login_redirect_uri` 可与 OAuth 的 `oauth_redirect_uri` 不同，为空时 fallback 到同应用的 `oauth_redirect_uri`。两者均需在企微后台「应用 → 网页授权及 JS-SDK」配置为可信域名。

---

## 8. 回调事件分发：handleCallback 五步流水线

企微通过回调推送事件（通讯录变更、应用关注等），处理流水线**固定五步**，事件未识别派发兜底事件**绝不丢弃**。

### 五步流水线

```
handleCallback(msgSignature, timestamp, nonce, encryptedXml):
    1. 验签解密
       用回调密钥（token + aes_key）校验签名，AES-CBC 解密
       失败 → 抛异常（配置错误或伪造请求）

    2. XML 解析
       解析明文 XML → 关联数组（标签名 → 文本值）

    3. resolveEvent
       提取 Event（EventType）+ ChangeType（部分事件无）
       子类 resolveEvent() 映射到具体事件类

    4. readonly 事件
       构造不可变事件对象（readonly，构造后不可修改）

    5. 分发
       事件分发器派发该事件对象给监听器
```

### readonly 事件对象

事件类是不可变值对象，构造后不可修改，通过只读属性访问：

```
readonly class WecomCallbackEvent:
    corpId: string           # 企业 corp_id
    agentId: int|null        # 应用 ID（通讯录回调为 null）
    eventType: string        # Event 字段（如 change_contact / subscribe）
    changeType: string|null  # ChangeType 字段（如 create_user / update_party）
    raw: array               # 完整解密后的 XML 数据（键为 XML 标签名）
```

**raw 是完整解密数据**：监听器从 raw 里取具体业务字段（如 `raw['UserID']`、`raw['NewUserID']`、`raw['Department']`），字段名遵循企微回调文档。

### 事件清单（10+ 类型）

| 事件类 | 触发条件 | Event | ChangeType | 来源应用 |
|--------|----------|-------|------------|---------|
| 通讯录成员新增 | change_contact | change_contact | create_user | Contact |
| 通讯录成员变更 | change_contact | change_contact | update_user | Contact |
| 通讯录成员删除 | change_contact | change_contact | delete_user | Contact |
| 通讯录部门新增 | change_contact | change_contact | create_party | Contact |
| 通讯录部门变更 | change_contact | change_contact | update_party | Contact |
| 通讯录部门删除 | change_contact | change_contact | delete_party | Contact |
| 用户关注应用 | subscribe | subscribe | — | Agent |
| 用户进入应用会话 | enter_agent | enter_agent | — | Agent |
| **未识别事件（兜底）** | 任意 | 任意 | 任意 | 两个 App 均可 |

### UnknownEvent 兜底：绝不丢弃

**铁律：未识别的事件类型派发兜底事件（UnknownEvent），绝不丢弃。**

```
resolveEvent(eventType, changeType, raw):
    match (eventType, changeType):
        已知组合 → 对应具体事件类
        default  → UnknownEvent(corpId, agentId, eventType, changeType, raw)   # 兜底
```

**为什么必须兜底**：企微会新增事件类型。如果遇到新事件直接丢弃，你永远不知道丢了什么——可能是重要的通讯录变更、可能是新的业务事件。派发 UnknownEvent 让业务方注册一个兜底监听器做日志记录 / 告警，及时发现并适配新事件。

### 回调必须返回 success

回调处理完必须返回 `success` 或空字符串，**否则企微会重试**（重试又触发一次事件分发，副作用翻倍）。这是企微的协议要求，不是建议。

### 验签依赖每个应用独立的回调密钥

通讯录同步应用和每个自建应用都有**独立的** token + aes_key（企微后台「接收消息」配置）。`handleCallback()` 用构造时传入的密钥验签。配置错误 → 验签失败抛异常。同一企业共享 corpId，但回调密钥各应用独立。

---

## 9. JS-SDK 签名

前端调企微 JS-SDK 前，需要后端用 jsapi_ticket 生成 `wx.config` 签名：

```
function buildJsApiConfig(url):
    ticket = ticketManager.getTicket(credential)    # 带缓存 + 并发去重（第 4 章三段式）
    nonceStr = 随机 16 字符
    timestamp = 当前时间戳
    signature = SHA1("jsapi_ticket={ticket}&noncestr={nonceStr}&timestamp={ts}&url={url}")
    return { corpId, timestamp, nonceStr, signature }
```

**签名算法细节**：参数顺序固定（jsapi_ticket → noncestr → timestamp → url），`noncestr` 全小写，url 是当前页面 URL **不含 `#` 及后面部分**。算法错一个字符签名就失败。

**ticket 缓存与 token 同构**：jsapi_ticket 同样有效期 7200s、同样有调用频率限制，用同样的三段式并发去重缓存（第 4 章）。

---

## 10. 异常分层

异常分两层，便于上层差异化处理（重试策略、告警策略不同）：

| 异常 | 含义 | 典型场景 | 处理建议 |
|------|------|---------|---------|
| 业务异常 | 企微 API 返回的业务错误 | errcode=40029 无效 code、errcode=60011 无权限 | 携带 errcode，上层按错误码处理 |
| 基础设施异常 | 请求本身没成功 | HTTP 非 200、响应体非 JSON、锁竞争超时 | 触发告警，可能是网络故障 / 配置错误 |

**业务异常携带原始 errcode**：上层可 `catch 业务异常` 统一捕获两类，也可分别 catch 做差异化处理。基础设施异常是业务异常的子类，统一捕获不会漏。

**网络级异常（连接超时、DNS 失败）不在客户端层捕获**，直接上浮给调用方——客户端层只负责 HTTP 状态码和响应体的解析，网络层的故障由上层统一兜底。

---

## 通用场景速查

| 场景 | 入口 | 关键点 |
|------|------|--------|
| 发送应用消息 | `provider.app().sendMessage(userIds, Message子类)` | 消息用值对象（Text/Markdown/Image 等 9+ 种），不传裸数组 |
| OAuth 静默授权 | `app.getOauth().buildAuthorizeUrl(returnUrl)` | state 自动存 Redis，scope 默认 snsapi_base |
| OAuth 回跳处理 | `app.getOauth().buildFrontendRedirectUrl(state, code)` | 消费 state，无效返回 null（防 CSRF） |
| code 换身份 | `app.getOauth().getUserinfoByCode(code)` | 拿 userid；需敏感信息再用 ticket 调 getUserDetailByTicket |
| 扫码登录（跳转） | `app.getQrLogin().buildRedirectUrl(returnUrl)` | 复用 state 防伪 |
| 扫码登录（嵌入式） | `app.getQrLogin().buildEmbedParams(returnUrl)` | 返回参数供前端 JS SDK 渲染二维码 |
| JS-SDK 签名 | `app.getJsApi().buildJsApiConfig(url)` | url 不含 `#` 后面部分，参数顺序固定 |
| 通讯录成员增删改查 | `provider.contact().createUser/updateUser/deleteUser/getDepartment` | 通讯录应用无 agentId |
| 通讯录变更回调 | `provider.contact().handleCallback(...)` | 五步流水线，返回 success，监听 Contact 系列事件 |
| 应用事件回调 | `provider.app().handleCallback(...)` | 五步流水线，返回 success，监听 subscribe / enter_agent |
| 兜底未知事件 | 监听 UnknownEvent | 记录日志 / 告警，适配新事件类型 |

---

## Good / Bad 速查

| Good | Bad |
|------|-----|
| Foundation 依赖 Provider，单向不可反转 | Provider 反向依赖 Foundation 缓存实现 |
| Provider 层纯底层，不依赖任何框架 | Provider 耦合 Redis / DI 容器（无法独立测试） |
| 所有入口走统一 WecomProvider，不直接 new 应用类 | 各处散落 new Client / new App，配置各写各的 |
| Manager 用 callable 工厂懒构造 | 构造时一次性 new 所有 Manager（循环依赖 / 提前开销） |
| Token / Ticket 缓存 TTL 7000s（提前 200s 过期） | 直接用企微原始 7200s（边界瞬间并发刷新） |
| 并发去重三段式（缓存检查 + 锁 + 自旋） | 缓存失效就直接刷新（高并发打爆企微接口） |
| state 30s TTL + 一次性消费（取后即删） | state 用固定值 / 不存 Redis / 不删（CSRF + 重放） |
| state 无效返回 null，上层判断处理 | state 无效抛异常（防伪拦截不是程序错误） |
| 回调 handleCallback 固定五步流水线 | 回调处理各写各的、顺序随意 |
| 未识别事件派发 UnknownEvent 兜底 | 未识别事件直接丢弃（永远不知道丢了什么） |
| 回调返回 success（否则企微重试） | 返回业务 JSON / 不返回（触发重试，副作用翻倍） |
| 事件对象 readonly 不可变 | 事件对象可变，监听器乱改字段 |
| 验签依赖每个应用独立的 token + aes_key | 所有应用共用一套回调密钥（企微不支持） |
| 多应用共享 Redis 缓存基础设施（按凭证区分 Key） | 每个应用各起一套缓存管理器（浪费 + 不一致） |
| Token / Ticket 管理器同构复用骨架 | 两者各写一套不同的去重逻辑 |
| 异常分层：业务异常 vs 基础设施异常 | 一锅端用一个异常类（无法差异化处理） |
| 加解密用 OpenSSL（mcrypt 已废弃） | 用废弃的 mcrypt 扩展 |

---

## 红旗 - 停下重新评估

- 准备直接 new 一个 HTTP 客户端调企微 API（绕过统一 WecomProvider，漏配置、漏缓存）
- 准备让 Provider 层依赖 Foundation 的缓存实现（依赖反转，无法独立测试）
- 准备构造时直接 new 所有 Manager 而不用 callable 工厂（循环依赖 / 提前开销）
- 准备把 token 缓存 TTL 设成原始的 7200s（边界瞬间并发刷新风暴）
- 准备缓存失效就直接刷新 token，不加锁（高并发打爆企微接口触发限流）
- 准备用固定值做 OAuth state 或不存 Redis（CSRF 防御形同虚设）
- 准备让 state 可重复消费（不取后即删，重放攻击窗口）
- 准备省掉回调五步流水线的某一步（流水线固定，缺一步行为不一致）
- 准备把未识别的回调事件丢弃（永远不知道企微推了什么新事件）
- 准备回调返回业务 JSON 而不是 success（企微重试，副作用翻倍）
- 准备所有应用共用一套回调密钥（企微不支持，每个应用独立配置）
- 准备让 Token 管理器和 Ticket 管理器各写一套不同的去重逻辑（应该同构复用骨架）

---

## 防止合理化

| 借口 | 现实 |
|--------|---------|
| "直接 new Client 调 API 省事，走 Provider 太绕" | 绕一次，省下的是配置散落、缓存缺失、密钥漏传的一堆坑 |
| "token 过期重新获取呗，并发能怎样" | 高并发瞬间 N 个请求同时刷新，企微接口限流封 IP，全站瘫 |
| "缓存 TTL 用 7200s 跟企微对齐多直观" | 到期瞬间所有请求同时失效同时刷新，这就是雪崩的起点 |
| "加锁 double-check 多余，锁内直接刷新" | 没有 double-check，锁内可能别人刚刷完你又刷一次 |
| "state 随便传个固定值，又不是公开服务" | CSRF 不挑服务公不公开，构造一个回跳 URL 诱导点击就打穿 |
| "state 存了不删也行，30s 反正过期" | 不删 = 可重放，30s 内够攻击者打多次 |
| "未知事件丢了就丢了，反正处理不了" | 企微推新事件你永远不知道，直到业务投诉"怎么没同步" |
| "回调返回啥都行，企微不挑" | 企微要求 success，不返回就重试，你的副作用执行 N 遍 |
| "一个应用一套缓存管理器，隔离干净" | 多应用共享 corpId，各起一套缓存 = 各刷各的 token = 触发限流 |

---

## 何时调用本 skill

**以下场景必须按本范式设计：**

- 新项目需要对接企业微信（通讯录、自建应用、消息推送任一）
- 实现企微 OAuth 网页授权、PC 扫码登录、JS-SDK 签名
- 实现企微回调事件处理（通讯录变更、应用事件）
- 设计 access_token / jsapi_ticket 的缓存与并发去重
- 跨模块 / 跨业务做统一的企业微信集成库
- 排查企微接口被限流、token 频繁失效、回调重试、CSRF 漏洞等问题
- 评估现有企微集成的设计是否合理（对照本范式查漏）

**不触发：**

- 只读现有企微代码、查资料（没在设计 / 实现）
- 对接的是微信公众号 / 微信小程序（不是企业微信，能力模型不同）
- 单次脚本调一下企微 API（不是系统化的集成）

---

## 底线

**企业微信集成不是"调 API"，是"分层 + 缓存 + 防伪 + 分发"的完整体系。**

两层设计：Foundation 依赖 Provider，Provider 纯底层不依赖框架，单向不可反转。
统一入口：WecomProvider——contact() 出通讯录应用，app() 出自建应用。
工厂懒构造：callable 工厂首次调用才实例化，避免循环依赖。
Token 并发去重：三段式（缓存检查 + 锁 + 自旋），TTL 提前 200s 过期（7000s）。
state 一次性防伪：30s TTL，取后即删，无效返回 null。
回调五步流水线：验签解密 → XML 解析 → resolveEvent → readonly 事件 → 分发；未识别派发 UnknownEvent，回调返回 success。

省了分层、漏了去重、丢了 state、弃了兜底——高并发或被攻击时，就是这次偷的懒在还债。

这是不可协商的。
