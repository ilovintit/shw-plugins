---
name: shw-express
description: 快递物流的跨语言设计范式。在设计或实现快递物流追踪、快递下单、物流订阅回调、运费查询、多供应商快递聚合时触发。定义"统一快递抽象层"，覆盖物流追踪 + 快递下单两个域，屏蔽供应商差异。核心是 Manager + Provider 模式（胖接口 + config 动态实例化 + 进程内缓存）、值对象驱动（全部 readonly，fromApiResponse() 工厂转换供应商原始响应）、回调验签内置（handle*Callback 内部自动验签，业务侧不手动验签）。用户提到快递、物流、运单、track、物流订阅、快递下单、运费报价、快递鸟、快递 100、快递供应商、回调验签、ExpressManager 时自动触发。
---

# 快递物流设计范式（跨语言）

## 概述

本 skill 是快递物流基础设施的**设计范式**。下面的接口、值对象、模式用**语言无关的伪代码**描述，任何后端栈照搬同一套思路。

**核心问题**：快递物流不是一个功能，是**两个域**——物流追踪（这单货到哪了）和快递下单（帮我发一单货）。两个域经常对接同一个供应商（如快递鸟同时支持查询和下单），但业务诉求、数据结构、回调机制完全不同。把两者混在一个"快递服务"里，必然长成一坨 if-else 的面条。

**核心原则**：**统一快递抽象层 + 两域分治 + 屏蔽供应商差异**。对上层只暴露一套 Manager，对下层用 Provider 接口适配各家供应商。上层不知道接的是快递鸟还是快递 100，下层不知道上层是要查物流还是要下单。

**违反这个原则就是每接一家供应商重写一遍业务**：换一家快递公司，业务代码跟着改；加一个下单能力，追踪代码跟着动；回调验签散落在各 Controller，每处各写各的——所有这些问题的根因都是"没有统一抽象层，直接在业务里调供应商 SDK"。

## 铁律

```
上层只认 ExpressManager，绝不直接 new 供应商客户端
Provider 实现胖接口（追踪域 + 下单域），不按域拆多个接口
所有 IO 走 readonly 值对象，供应商原始响应不外泄
回调验签内置在 handle*Callback 里，业务侧不手动验签
回调返回值必须含 responseData（回传供应商的成功确认体）
扩展新供应商 = 实现接口 + config 加一项，不改 Manager
异常统一继承基础设施层异常，最终 → HTTP 500
```

凭"直接调快递鸟 SDK 省事"、"追踪和下单分两个组件吧"、"验签让业务自己写"、"原始响应直接给上层用方便"的直觉做事——全部是在给未来埋雷。

## Manager + Provider 模式

快递物流的核心架构是两层：**Manager（统一入口）+ Provider（供应商适配）**。

### ExpressManager：唯一入口

上层（UseCase / Controller）只认 ExpressManager，不认任何具体供应商。Manager 的职责极其有限：

```
ExpressManager 职责：
  1. 按 config.providers 动态实例化各 Provider（进程内缓存，不重复 new）
  2. 按 provider 名路由调用到对应 Provider 实例
  3. 不含任何业务逻辑、不解析供应商响应
```

```
config 示例：
  express:
    providers:
      kuaidi100:        # provider 名 = 路由键
        driver: Kuaidi100Provider
        app_id: xxx
        app_key: xxx
        subscribe_url: https://...
      kuaidiniao:
        driver: KuaidiniaoProvider
        ebusiness_id: xxx
        api_key: xxx
```

**动态实例化 + 进程内缓存**：Manager 启动时（或首次访问时）按 config 创建各 Provider 实例，缓存到进程内。后续调用直接复用，不重复 new、不重复建连。供应商客户端是可复用的重对象（含 HTTP 连接、密钥等），反复实例化是浪费。

```
ExpressManager（伪代码）：
  providers: map<string, ExpressProviderInterface>   // 进程内缓存

  getProvider(name) → ExpressProviderInterface:
      if name in providers: return providers[name]   // 命中缓存复用
      cfg = config("express.providers.{name}")       // 读配置
      if cfg is null: throw ExpressException("未配置 provider: " + name)
      providers[name] = make(cfg.driver, {config: cfg})  // 自治构造，DI / 工厂注入
      return providers[name]

  track(number, company?, provider?) → TrackingInfo:
      return getProvider(provider ?? defaultProvider).track(number, company)
```

**Manager 不决策**：调哪个 Provider 由上层传参指定（`manager.track('SF123', provider='kuaidiniao')`），或由默认 Provider 配置决定。Manager 只做路由，不做业务判断。

### ExpressProviderInterface：胖接口

每家供应商实现同一个**胖接口**，接口定义全部能力——**追踪域 + 下单域都在一个接口里**，不按域拆分。

```
interface ExpressProviderInterface:

    // ===== 追踪域 =====
    track(number, company?) → TrackingInfo
    subscribe(number, company, callbackUrl)
    handleTrackingCallback(payload) → TrackingCallbackEvent    // 内部含验签

    // ===== 下单域 =====
    createOrder(ShippingRequest) → ShippingOrder
    cancelOrder(orderId)
    modifyOrder(orderId, changes)
    getOrderDetail(orderId) → ShippingOrder
    queryPrice(PriceQuery) → PriceQuote[]
    handleOrderCallback(payload) → OrderCallbackEvent         // 内部含验签
```

**为什么用胖接口，不按域拆成 TrackingProvider + OrderProvider**：

| 方案 | 优点 | 缺点 |
|------|------|------|
| **胖接口（本范式）** | 一家供应商一个实现，config 一项搞定，Manager 路由简单 | 接口方法多 |
| 拆 TrackingProvider + OrderProvider | 每个接口小 | 同一家供应商要写两个类、config 配两项、Manager 要维护两套路由 |

同一家供应商（如快递鸟）通常同时提供追踪和下单。胖接口让"一家供应商 = 一个实现类 = config 一项"，映射关系清晰。拆成两个接口会导致快递鸟要写两个类、config 配两项、Manager 维护两套 provider 列表——徒增复杂度，没有收益。

某家供应商只支持追踪不支持下单？实现类里下单方法抛 `UnsupportedException` 即可，不需要为此拆接口。

### 扩展新供应商：零侵入

接入新供应商的流程是机械的、不变的：

```
1. 实现 ExpressProviderInterface（把这家供应商的 API 翻译成接口契约）
2. config.providers 追加一项（provider 名 + driver 类 + 凭证）
3. 完。Manager 不改、上层业务代码不改。
```

**关键**：Manager 用 config 驱动 + 进程内缓存，新增供应商是纯加法——不动现有代码。如果接入新供应商需要改 Manager，说明 Manager 里混进了业务逻辑，是设计出了问题。

## 追踪域

追踪域回答"这单货到哪了"。两种获取模式：**主动查询**（track）和**订阅推送**（subscribe + callback）。

### track：主动查询

```
track(number, company?) → TrackingInfo
  - number：运单号（必填）
  - company：快递公司编码（可选，供应商能自动识别则不传）
  - 返回：TrackingInfo（当前状态 + 轨迹列表）
```

适用于用户主动点"查物流"的场景。缺点是每次查询都要调供应商 API，高频场景应改用订阅。

### subscribe：订阅推送 + 回调

订阅模式下，先向供应商注册"这单货的物流变化推给我"，之后物流状态变化时供应商会主动 POST 到你的回调 URL。

```
subscribe(number, company, callbackUrl)
  - 向供应商注册订阅，告知"运单 number 的状态变化推送到 callbackUrl"
  - 注册成功后，供应商在物流状态变化时回调 handleTrackingCallback 接收的那个 URL
```

```
订阅模式数据流：
  1. 业务调 subscribe(number, company, callbackUrl) → 供应商登记订阅
  2. 物流状态变化 → 供应商 POST 回调到 callbackUrl
  3. 回调端调 manager.handleTrackingCallback(payload)
     → 内部验签 → 解析 → 返回 TrackingCallbackEvent（含最新轨迹 + responseData）
  4. 回调端把 responseData 回传给供应商（确认收到）
```

**订阅 vs 查询的选择**：

| 维度 | 主动查询 track | 订阅推送 subscribe |
|------|--------------|-------------------|
| 实时性 | 查询那一刻的快照 | 状态变化即推送，近实时 |
| 调用量 | 每次查询一次 API | 注册一次，之后被动接收 |
| 适用 | 低频、按需查询（用户主动点） | 高频、批量监控（订单列表实时刷新） |

### TrackingInfo / TrackEvent：轨迹值对象

```
TrackingInfo（一单的物流全貌）:
  number          运单号
  company         快递公司
  status          当前状态（在途/揽收/签收/异常...）
  isSigned        是否已签收
  events: [...]   轨迹时间线（TrackEvent 列表）

TrackEvent（单条轨迹节点）:
  time            时间
  context         轨迹描述（如"快件已到达【北京分拨中心】"）
  location        所在地（供应商提供则填）
```

供应商返回的轨迹格式各异（有的按时间倒序、有的字段名不同），由 Provider 实现里的 `fromApiResponse()` 统一转换成上面的结构，上层拿到的永远是规范的 TrackingInfo。

## 下单域

下单域回答"帮我发一单货"。这是一组完整的状态机操作：询价 → 下单 → 改单 → 查单 → 取消，外加状态回调。

### createOrder：下单

```
createOrder(ShippingRequest) → ShippingOrder
  - 入参 ShippingRequest：寄/收件人信息、包裹信息、快递产品类型等
  - 返回 ShippingOrder：订单号、运单号、电子面单、状态等
```

### cancelOrder / modifyOrder：取消与改单

```
cancelOrder(orderId)
  - 取消已下的订单（供应商未揽收前可取消）

modifyOrder(orderId, changes)
  - 修改订单信息（如改收件地址、改联系人，供应商支持的范围内）
```

### getOrderDetail：查单

```
getOrderDetail(orderId) → ShippingOrder
  - 查询订单当前详情（面单、状态、重量等）
```

### queryPrice：运费询价

```
queryPrice(PriceQuery) → PriceQuote[]
  - 入参 PriceQuery：寄/收地址、重量、快递产品类型等
  - 返回 PriceQuote[]：可能多家供应商/多个产品的报价列表
```

询价返回数组，因为一次查询可能命中多个可选产品（如顺丰特快、顺丰标快），业务侧据此让用户选择。

### ShippingRequest / ShippingOrder / Contact：下单值对象

```
Contact（联系人，寄/收件人共用）:
  name            姓名
  phone           电话
  address         详细地址
  province/city/district  省市区（供应商下单通常要拆分）

ShippingRequest（下单入参）:
  sender: Contact         寄件人
  receiver: Contact       收件人
  package                 包裹信息（重量、体积、物品名等）
  productType             快递产品类型（如顺丰特快/标快）
  remark                  备注

ShippingOrder（下单/查单返回）:
  orderId                 供应商订单号
  waybillNumber           运单号
  status                  订单状态
  electronicWaybill       电子面单（HTML/PDF/图片，供应商格式不同）
  ...其他供应商特有字段

PriceQuery（询价入参）:
  senderAddress           寄地址
  receiverAddress         收地址
  weight                  重量
  productType             产品类型（可选）

PriceQuote（单条报价）:
  provider                供应商
  productType             产品类型
  totalPrice              总价
  estimatedDelivery       预计送达时间（供应商提供则填）
```

## 值对象驱动

**所有跨 Provider 边界的 IO 都走不可变 readonly 值对象，绝不把供应商的原始响应直接外泄给上层。**

```
供应商 API 原始响应（各家格式不同、字段名不同、嵌套各异）
        │
        │  Provider 实现内的 fromApiResponse() 工厂方法
        ▼
统一 readonly 值对象（TrackingInfo / ShippingOrder / PriceQuote ...）
        │
        │  上层只消费这个
        ▼
业务层 / Controller
```

```
值对象工厂（伪代码）：
  TrackingInfo.fromApiResponse(raw) → TrackingInfo:
      return TrackingInfo(
          number    = raw["LogisticCode"],
          company   = raw["ShipperCode"],
          status    = mapStatus(raw["State"]),         // 供应商状态码 → 统一枚举
          isSigned  = (raw["State"] == "3"),
          events    = raw["Traces"].map(t => TrackEvent.fromApiResponse(t))
      )
```

**铁律**：

- 值对象全部 readonly（不可变），构造后只读不写
- 供应商原始响应用 `fromApiResponse(raw)` 工厂方法转换成值对象，转换逻辑封装在 Provider 实现里
- 上层永远拿不到供应商的原始 JSON/数组，只拿规范的值对象

**为什么不让原始响应外泄**：

| 做法 | 后果 |
|------|------|
| **值对象转换（本范式）** | 上层与供应商解耦，换供应商上层无感 |
| 直接返回供应商原始 JSON | 上层业务代码里写满 `data['Traces'][0]['AcceptTime']` 这种耦合，换供应商要改遍所有调用处 |

值对象是抽象层的"边界翻译点"。同一个 TrackingInfo，快递鸟和快递 100 各自的 `fromApiResponse()` 把各自的原始格式翻译成同一个结构。翻译成本在 Provider 实现里付一次，上层永久受益。

## 回调验签内置

**验签是框架的责任，不是业务的责任。** `handleTrackingCallback(payload)` 和 `handleOrderCallback(payload)` 在内部**自动验签**，验签失败抛异常（或返回错误），业务侧无需也不应手动验签。

```
回调处理流程（全在 Provider 实现内）：
  handleTrackingCallback(payload):
    1. 验签：用 config 里的密钥校验 payload 签名
       失败 → 抛异常/返回错误（不返回任何业务数据，防伪造）
    2. 解析：payload → TrackingCallbackEvent
    3. 组装 responseData：供应商要求回传的"成功确认体"
    4. 返回 TrackingCallbackEvent（含最新轨迹 + responseData）
```

```
回调 Controller（业务侧）只做三件事：
  function trackingCallback(req):
      event = expressManager.handleTrackingCallback(req.body, provider='kuaidiniao')
      //     ↑ 验签在里面自动做完了，业务不操心
      // 处理 event（更新本地物流状态、通知前端...）
      return event.responseData   // ← 把确认体回传给供应商
```

**为什么验签必须内置**：

| 散落验签（错误） | 内置验签（本范式） |
|----------------|------------------|
| 每个 Controller 各写一遍验签，漏一处就是安全漏洞 | 集中在 Provider 实现，强制走 |
| 换供应商要改所有 Controller 的验签逻辑 | 换供应商只改 Provider 实现 |
| 业务侧需要懂每家供应商的签名算法 | 业务侧完全无感 |

**responseData 回传是必需的**：供应商推送回调后，通常要求你回传一个特定格式的"成功确认体"（如 `{"result": true, "returnCode": 200}`），否则供应商会认为你没收到、重复推送。`handle*Callback` 返回的事件对象里必须含 `responseData` 字段，Controller 原样回传。

### 回调事件值对象

```
TrackingCallbackEvent（追踪回调事件）:
  number              运单号
  company             快递公司
  trackingInfo        最新 TrackingInfo（状态 + 轨迹）
  responseData        回传给供应商的成功确认体

OrderCallbackEvent（订单回调事件）:
  orderId             供应商订单号
  status              订单状态（已揽收/已签收/已取消...）
  detail              附加详情
  responseData        回传给供应商的成功确认体
```

两个回调事件都继承同一个基础结构（都含 `responseData`），具体字段按域不同。

## 异常统一

快递组件的异常分两类，但**统一继承基础设施层异常**，最终在 Controller 层统一映射为 HTTP 500（而不是 400/404 这类业务错误）。

```
InfrastructureException（基础设施层异常基类）
        ▲
        │
   ┌────┴─────────────────┐
   │                      │
ExpressException      供应商异常
（配置缺失）          （调供应商 API 失败：
   - 未配置 providers     网络超时、限流、业务拒绝等）
   - 某供应商凭证缺失
   - driver 类不存在
```

**为什么快递异常统一 → HTTP 500**：

快递对接失败（配置错、供应商宕机、网络超时）属于**基础设施故障**，不是用户请求错误。返回 500 让上游的重试/熔断机制介入；如果返回 4xx，监控系统会误判为业务异常、用户会以为是自己的输入有问题。

| 异常类型 | 含义 | 映射 |
|---------|------|------|
| ExpressException（配置缺失） | providers 没配、凭证缺失、driver 类找不到 | HTTP 500（基础设施未就绪） |
| 供应商异常（API 失败） | 网络超时、限流、供应商业务拒绝 | HTTP 500（依赖故障） |

**业务可识别的错误不应走这套异常**：如"运单号不存在"，供应商若返回明确语义，Provider 实现可转换成领域层可识别的结果（如返回空的 TrackingInfo 标记 isSigned=false），而非抛 500。区分"该重试的故障"和"该展示给用户的业务结果"。

## 通用场景举例

| 场景 | 用到的域 / 方法 | 设计要点 |
|------|---------------|---------|
| 用户点"查看物流" | 追踪域 track | 单次查询，返回 TrackingInfo 含轨迹；低频场景够用 |
| 订单列表实时刷新物流 | 追踪域 subscribe + 回调 | 高频场景改订阅，避免每次刷列表都调供应商 |
| 用户填地址后看运费 | 下单域 queryPrice | 返回 PriceQuote[]，多家/多产品供选 |
| 用户提交寄件 | 下单域 createOrder | ShippingRequest 入参，返回含电子面单的 ShippingOrder |
| 寄件后改地址 | 下单域 modifyOrder | 揽收前可改；供应商不支持则抛 UnsupportedException |
| 快递已揽收通知 | 下单回调 handleOrderCallback | 验签内置，回调更新订单状态 + 回传 responseData |

## Good / Bad

| Good | Bad |
|------|-----|
| 上层只调 ExpressManager，不直接 new 供应商客户端 | 业务里直接 `new KuaidiniaoClient()` |
| Provider 实现胖接口（追踪 + 下单一个类） | 拆成 TrackingProvider + OrderProvider 两个接口 |
| config 驱动 + 进程内缓存，加供应商零改 Manager | 加供应商要改 Manager 的 if-else 分支 |
| 所有 IO 走 readonly 值对象 | 直接返回供应商原始 JSON 给上层 |
| fromApiResponse() 在 Provider 内翻译 | 上层业务代码里写满供应商原始字段名 |
| 回调验签内置在 handle*Callback | 每个 Controller 各写一遍验签 |
| 回调返回值含 responseData 回传供应商 | 忘了回传，供应商疯狂重复推送 |
| 异常统一继承基础设施层异常 → HTTP 500 | 供应商超时返回 400，监控误判 |
| 扩展新供应商 = 实现接口 + config 加一项 | 扩展新供应商要改一堆现有代码 |

## 红旗 - 停下重新评估

- 准备在业务层直接 new 供应商 SDK 客户端（绕过 Manager + Provider）
- 准备把追踪和下单拆成两个组件 / 两个接口（违背胖接口）
- 准备把供应商原始响应直接透传给上层（没做值对象转换）
- 回调 Controller 里准备手写验签逻辑（验签应内置）
- handle*Callback 返回值里没有 responseData（会导致供应商重复推送）
- 加一家新供应商需要改 Manager 或现有 Provider（应为纯加法）
- 供应商 API 超时准备返回 4xx（应统一 500，基础设施故障）
- 一个 Provider 实现里混进了业务逻辑（Provider 只做适配）

## 防止合理化

| 借口 | 现实 |
|--------|---------|
| "直接调快递鸟 SDK 省事，Manager+Provider 太重" | 接第二家供应商时就知道重不重了，那时改成本翻十倍 |
| "追踪和下单分两个组件清晰" | 同一家供应商两个域同时支持，分两个要维护两套 config、两套路由 |
| "原始响应给上层用，上层想取啥取啥" | 上层写死供应商字段名，换供应商全要改，耦合炸裂 |
| "验签让业务自己写，灵活" | 灵活 = 漏一处就是安全漏洞；集中验签才安全 |
| "回传 responseData 不重要，供应商不推就算了" | 不回传 = 供应商判定你没收到 = 疯狂重推，浪费回调配额 |
| "加供应商改几行 Manager 代码而已" | 几行会变成几十行，每家供应商一个 if 分支，Manager 越长越烂 |
| "供应商超时返回 400，前端能重试" | 4xx 是业务错误语义，监控/熔断按 5xx 配的，返回 400 漏告警 |

## 何时触发

**以下场景必须按本范式设计：**

- 新项目需要快递物流追踪、快递下单功能
- 对接多家快递供应商（快递鸟、快递 100、顺丰直连等），需要统一抽象
- 设计物流订阅推送、下单状态回调的回调机制
- 跨模块做统一的快递基础设施库
- 排查回调重复推送、验签漏洞、换供应商要改一堆代码等问题

**不触发：**

- 只读现有快递代码、查资料（没在设计/实现）
- 单次脚本查个运单（不是系统化的快递基础设施）
- 纯前端的物流轨迹展示（不涉及后端供应商对接架构）

## 底线

**上层只认 Manager，供应商只实现胖接口，所有 IO 走值对象，验签内置在回调里。**

Manager + Provider 屏蔽供应商差异，换供应商上层无感；胖接口让一家供应商一个实现类，config 一项搞定；值对象把供应商原始响应挡在边界内，fromApiResponse() 付一次翻译成本永久受益；验签集中在 handle*Callback，漏不掉；回调回传 responseData，不挨供应商重复推送。

这五条是快递抽象层的地基，任何一条让步都会在接入第二家供应商、第一次回调重推风暴、第一次验签漏洞时塌方。

这是不可协商的。
