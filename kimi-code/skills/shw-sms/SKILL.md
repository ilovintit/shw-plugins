---
name: shw-sms
description: 短信发送/通知服务的跨语言设计范式。在设计或实现短信发送、验证码下发、通知短信、对接短信供应商（阿里云/腾讯云）等功能时触发。定义"Scene 场景枚举驱动 + Provider 接口可替换 + 模板方法模式封装 + 日志驱动先行"的整体架构、Message 值对象、SmsManagerInterface（Contract 抽象）契约、AbstractSmsManager 模板方法（封装异常捕获 + 事件分发，子类实现 doSend + getProviderName）、SmsManager 多供应商实例缓存、事件驱动（SmsSentEvent/SmsFailedEvent）、失败即抛异常的统一处理。不绑定特定框架，代码用伪代码描述。
---

# 短信发送设计范式

## 概述

短信系统的本质问题不是"怎么把短信发出去"，而是"怎么让调用方与短信供应商彻底解耦，换供应商时调用方零改动"。

**核心原则**：Scene 场景枚举驱动 + Provider 接口可替换 + 模板方法封装 + 日志驱动先行。调用方只关心"给谁、发什么场景、带什么参数"，绝不关心"用哪个供应商、哪个模板 ID、什么签名"。供应商细节全部封装在 Provider 实现里，靠环境变量切换。

**违反这个原则就是把供应商绑死在业务代码里**：验证码下发接口里写死了阿里云模板 Code，测试环境每次跑用例都真发短信扣真钱，换腾讯云时满项目搜 `SMS_xxx` 改个遍。所有这些问题的根因都是"调用方知道得太多"。

## 铁律

```
调用方传 Scene 不传模板 ID，Scene 决定模板
Provider 接口可替换（Contract 抽象），换供应商调用方零改动
日志驱动先行，开发/测试环境不真发短信
失败抛异常 / 返回错误，统一错误码，调用方必须处理
批量发送走消息队列逐条消费，接口层不做批量抽象
```

凭"调用方直接传模板 Code 省事"、"测试环境也连真实供应商跑通就行"、"加个 batchSend 方法批量发更方便"的直觉做事——全部是在给未来埋雷。

## Scene 场景枚举驱动

短信不是"发一段文字"，而是"按场景触发一次通知"。**场景是枚举，不是字符串魔法值，更不是模板 ID**。

```
enum Scene:
    LOGIN_CODE          = "login_code"          // 登录验证码
    RESET_PASSWORD_CODE = "reset_password_code" // 重置密码验证码
    NOTIFY              = "notify"              // 通知短信
    GENERIC             = "generic"             // 通用兜底
```

**Scene 到模板的映射在 Provider 实现内部完成**，调用方永远碰不到模板 Code：

```
调用方：sms.send(Message{phone, scene: LOGIN_CODE, params: {code: "1234"}})
                   ↓
Provider 内部：templateMap[LOGIN_CODE] → "SMS_1234567"（阿里云模板 Code）
                   ↓
调用阿里云 API：PhoneNumbers=phone, SignName=签名, TemplateCode=SMS_1234567
```

### 为什么不直接传模板 ID

| 方案 | 问题 |
|------|------|
| 调用方传模板 ID | 模板 ID 是供应商概念，换供应商时调用方全得改；模板 ID 漂进业务代码成技术债 |
| 调用方传 Scene | Scene 是业务语义，与供应商无关；模板映射封装在 Provider，换供应商只改配置 |

**Scene 是业务语言，模板 Code 是供应商语言，两者绝不可在调用方混用。**

### 新增场景

加一个新场景 = 枚举加一项 + 供应商配置加一条映射（`templates.notify = "SMS_..."`），调用方立刻可用，无需改任何接口。枚举与配置的关系类似 RBAC 的"权限点代码化"：枚举随代码走，配置做映射。

## Message 值对象

短信消息是一个**只读值对象**（readonly / immutable），携带发送所需的全部业务语义，不含任何供应商细节。

| 字段 | 类型 | 说明 |
|------|------|------|
| `Phone` | string | 手机号 |
| `Scene` | 场景枚举 | 决定走哪个模板（见上文） |
| `Params` | map | 模板参数（如 `{code: "1234"}`），填充模板占位符 |
| `SignName` | string（可空） | 签名覆盖，空则用 Provider 默认签名 |

**三个设计要点**：

1. **只读**：Message 构造后不可变，防止在传递过程中被篡改。
2. **Scene 而非 TemplateCode**：见上文铁律，绝不在 Message 里塞模板 ID。
3. **SignName 可空**：绝大多数场景用默认签名，只有特殊业务（如多品牌）才覆盖。`null` / 空字符串 = 用默认，不是"没签名"。

```
// 正确：用场景枚举 + 模板参数
Message{phone: "13800138000", scene: LOGIN_CODE, params: {code: "1234"}}

// 错误：塞模板 ID 进业务消息
Message{phone: "13800138000", templateCode: "SMS_1234567", params: {...}}
```

## Provider 接口与 Contract 抽象

短信发送能力抽象成一个 Contract（契约接口），所有供应商都实现它。**换供应商 = 换接口实现，调用方代码一行不改**。

### Contract 契约定义

```
// Contract 抽象：短信发送能力契约
interface SmsManagerInterface / Provider:
    send(Message) → Result            // 发送单条短信（核心契约）
    queryResult(messageId) → Result   // 查询发送结果（可选，供应商支持才实现）
```

这个 Contract 定义"发送短信"这一能力的最小契约，与具体供应商、具体框架解耦。业务侧依赖这个 Contract，不依赖任何具体 Provider。Contract 的价值在于：业务代码、事件系统、多供应商管理全部建立在这个抽象之上，任何供应商只要实现这个 Contract 就能接入。

### Provider 的职责边界

**一个 Provider 对接一个供应商**。Provider 内部完成三件事：

1. **Scene → 模板解析**：查 `templateMap[scene]` 得到供应商模板 Code。
2. **签名确定**：Message.SignName 非空用它，空则用 Provider 配置的默认签名。
3. **调用供应商 API**：用各供应商 SDK 发送，拿到回执。

这三件事全是供应商细节，不出 Provider 的边界。调用方对此一无所知。

## 模板方法模式：横切收敛

用模板方法模式把横切逻辑（异常捕获、事件分发、错误转换）收敛在抽象基类的 `send()` 里，子类只实现纯粹的发送逻辑。

### 抽象基类：AbstractSmsManager（模板方法）

```
abstract class AbstractSmsManager implements SmsManagerInterface:
    // 模板方法：固化的发送流程，子类不覆盖
    send(Message) → Result:
        try:
            result = doSend(Message)          // 调子类实现
            event(new SmsSentEvent(Message, result))   // 分发成功事件
            return result
        catch (e):
            result = Result{success: false, errorMessage: e.message}
            event(new SmsFailedEvent(Message, e))      // 分发失败事件
            throw new SmsException(SMS_SERVICE_ERROR, e)  // 统一异常向上抛

    // 子类必须实现：纯发送逻辑（不含异常处理、不含事件分发）
    abstract doSend(Message) → Result

    // 子类必须实现：标识自己是哪个供应商（写入 Result.provider 供审计）
    abstract getProviderName() → string
```

**模板方法的价值**：`send()` 这套"doSend → 成功事件 / 失败事件 → 异常"的流程只写一次，写在抽象基类。新增阿里云供应商 = 加一个子类，只写 `doSend()` 和 `getProviderName()`，横切逻辑零重复。

**子类规则铁律：实现 `doSend()`，绝不覆盖 `send()`。** 覆盖 `send()` 会绕过异常捕获和事件分发，破坏横切封装。

> 无类继承的语言用接口 + 委托 / 装饰器 / 嵌入结构体等价实现"模板方法"：把横切逻辑放在中间层（如装饰器包一层 Provider），具体 Provider 只写纯发送。横切逻辑仍收敛在一处，不散落到各 Provider。

### 子类：具体供应商实现

```
class AliYunSmsService extends AbstractSmsManager:
    templateMap = {LOGIN_CODE: "SMS_111", RESET_PASSWORD_CODE: "SMS_222", ...}
    config: {accessKeyId, accessKeySecret, signName}

    doSend(Message) → Result:
        templateCode = templateMap[Message.scene]   // Scene → 模板
        signName = Message.signName ?? config.signName
        resp = AliYunClient.sendSms(
            phone: Message.phone,
            signName: signName,
            templateCode: templateCode,
            templateParam: Message.params
        )
        return Result{success: true, messageId: resp.bizId}

    getProviderName() → "aliyun"
```

## 日志驱动先行

**开发/测试环境永远不真发短信。** 日志驱动（LogProvider / LogSmsService）是默认实现，不发真实短信、不花真钱、不依赖任何外部服务，只把消息记到日志里。

```
LogProvider.Send(Message) → Result:
    code = params["code"] ?? "******"
    log.info("[SMS LOG] phone=%s scene=%s code=%s", phone, scene, code)
    return Result{success: true, provider: "log"}   // 始终返回成功
```

**日志驱动不是 mock，是真实的 Provider 实现**：它和阿里云驱动实现同一个 Contract、走同一套 `send(Message)` 流程、返回同一格式的 Result。区别只在内部——一个写日志，一个调 API。所以从日志驱动切到真实驱动，调用方零改动。

### 环境变量切换

靠配置/环境变量决定用哪个 Provider，**不在代码里 if/else**：

```
sms.default = SMS_DEFAULT_PROVIDER ?? "log"     # 开发默认 log
sms.providers.log.driver = LogSmsService
sms.providers.aliyun.driver = AliYunSmsService
   ...

# 生产环境
SMS_DEFAULT_PROVIDER=aliyun   # 切真实供应商，代码不改一行
```

**切换是运维动作，不是开发动作。** 本地开发用 `log`，生产用 `aliyun`，压测环境可能又换一个——全靠环境变量，代码始终一致。

### 日志驱动的要求

- **返回成功**：日志驱动 `doSend()` / `send()` 返回 `success: true`，让上层走正常流程（分发 `SmsSentEvent`），而非走失败分支。否则测试里每条短信都抛异常，测试根本跑不通。
- **不调任何外部 API**：不连 HTTP、不连 SDK、不连数据库。纯本地日志。这样才能在没有网络的开发环境也能跑。
- **记录关键信息**：phone、scene、code（验证码场景）。测试时直接看日志就能确认验证码，不用真去查手机。

## 多供应商实例缓存：SmsManager

`SmsManager`（注意：不是 SmsManagerInterface，是供应商管理器），按 name 缓存 Provider 实例，支持多供应商并存。

```
class SmsManager:
    managers: map<string, SmsManagerInterface>   // 按 name 缓存实例

    getProvider(name?: string) → SmsManagerInterface:
        name ??= config("sms.default", "log")          // 不传取默认
        if name in managers: return managers[name]     // 命中缓存复用
        cfg = config("sms.providers.{name}")           // 读供应商配置
        managers[name] = make(cfg.driver, {config: cfg})  // 自治构造，注入
        return managers[name]
```

**三个关键设计**：

1. **实例缓存**：同一供应商 name 多次请求返回同一实例，不重复构造（避免重复建连接）。
2. **Driver 自治构造底层 client**：`SmsManager` 只读配置 + 构造，不在内部硬编码任何供应商的 client 构造逻辑。新增腾讯云 = 加一个 `TencentSmsService` 实现 Contract + config 追加一条，`SmsManager` 一行不改。
3. **依赖注入而非 static 工厂**：`SmsManager` 是普通可注入类，业务侧构造函数注入，不走 `SmsManagerFactory::get()` 这种 static 调用（static 难测试、生命周期不可控）。

```
// 扩展新供应商的正确姿势
1. 实现 SmsManagerInterface（继承 AbstractSmsManager，写 doSend + getProviderName）
2. config 的 providers 数组追加一条配置
3. 完了。SmsManager::getProvider('tencent') 直接可用
```

> 单供应商场景可退化掉 SmsManager，构造函数直接注入一个 Provider 即可。多供应商并存时再按本节形态补齐。

## 事件驱动

在短信生命周期点派发事件，供下游监听（记审计日志、发企微告警、统计成功率）：

| 事件 | 触发时机 | 携带数据 |
|------|---------|---------|
| `SmsSentEvent` | 发送成功后 | phone、scene、params、result（含 messageId） |
| `SmsFailedEvent` | 发送失败后（抛异常前） | phone、scene、errorMessage、timestamp |

**事件在 `AbstractSmsManager.send()` 里统一派发，子类 `doSend()` 不碰事件**——子类只管发送，横切的"成功/失败后干嘛"由基类兜底。这就是模板方法模式的价值：横切逻辑收敛到一处。

事件监听器示例：

```
listener SmsSentListener on SmsSentEvent:
    auditLog.record("sms_sent", event.phone, event.scene, event.messageId)

listener SmsFailedListener on SmsFailedEvent:
    wecomAlert.notify("短信发送失败: %s 场景 %s 错误 %s",
                      event.phone, event.scene, event.errorMessage)
    metrics.increment("sms_failed_total", tags: {scene: event.scene})
```

> 语言或运行时没有事件总线时，事件分发可退化为：在 `send()` 成功/失败回调里直接调用监听逻辑，或包一层装饰器在 Provider 调用前后处理。横切逻辑仍集中在一处，不散落到各 Provider。

## 失败处理：失败即抛异常，统一错误码

**短信发送失败不是"可选忽略的软错误"，是必须暴露给调用方的硬错误。** 验证码发不出去，用户就收不到验证码，注册流程走不下去——这种事绝不能被静默吞掉。

### 统一错误，屏蔽供应商差异

```
doSend() 抛任何异常 → AbstractSmsManager 捕获 → 构造失败 result
                    → 分发 SmsFailedEvent → 抛 SmsException（统一错误码 SMS_SERVICE_ERROR）

或：Provider.send() 返回 Result，失败时 Service 转 err 向上抛
   统一错误码 ErrSendFailed，不透传供应商原始错误
```

**调用方只认统一错误（SmsException / ErrSendFailed），不关心是阿里云限流、腾讯云鉴权失败还是网络超时。** 供应商的错误细节被封装在 Provider 内部，翻译成统一错误后向上抛。这样调用方的异常处理代码与具体供应商解耦。

### 为什么不用纯 Result-Optional 模式

短信接口返回 `Result` 值对象，但失败时**同时抛异常**（或返回错误）。看似冗余（result 里已有 `success: false`），实则有意：

- 成功时：返回带 `messageId` 的 Result，调用方可记录、可查询。
- 失败时：Result 记录失败信息（供事件监听器用），但**抛异常/返回错误强制调用方处理**。

如果只返回 Result 不抛异常，调用方很容易"忘记检查 `success` 字段"，失败的短信被静默忽略。抛异常 = 强制你正视失败。

## 批量发送：不提供接口，走消息队列

**短信接口只提供单条发送（`send(Message)`），不提供批量发送。**

为什么：
- 短信发送是高延迟外部调用（每条几百 ms），接口层批量 = 接口同步阻塞，超时风险高。
- 批量场景（如给 10 万用户发营销短信）本身就该异步化，不该在请求-响应周期里做。

**正确做法**：用后台任务系统（见 shw-task）把批量拆成逐条任务，消费者每条调一次 `send(Message)`。这样每条独立重试、独立失败、进度可控，不会因一条失败拖垮整批。

## Result 值对象

发送结果也是只读值对象，携带发送回执：

| 字段 | 说明 |
|------|------|
| `success` | 是否成功 |
| `messageId` | 供应商返回的消息 ID（成功时用于查询回执） |
| `errorMessage` | 失败原因 |
| `provider` | 供应商名称（哪个供应商发的，供审计/排错） |

`provider` 字段的存在让审计日志能追溯"这条短信是谁发的"——多供应商并存时尤其重要。

## Good / Bad

| Good | Bad |
|------|-----|
| 调用方传 Scene 枚举，不传模板 ID | 调用方直接传 `SMS_1234567` 模板 Code |
| Provider 接口可替换（Contract 抽象），换供应商零改动 | 业务代码里硬编码阿里云 API 调用 |
| 日志驱动先行，开发/测试不真发短信 | 测试环境连真实供应商，每次跑用例扣钱 |
| 环境变量切换 Provider，代码不改 | 代码里 if (env == "prod") 走阿里云 else 走 log |
| 失败抛异常 / 返回错误，统一错误码 | send() 返回 bool/忽略错误，失败的短信被静默吞掉 |
| 统一错误屏蔽供应商差异 | 把阿里云/腾讯云的原始错误码透传到业务层 |
| Driver 自治构造底层 client，SmsManager 不硬编码 | 工厂里 if provider=="aliyun" new AliYunClient 硬编码 |
| 批量发送走消息队列逐条消费 | 接口层加 batchSend 同步循环发，接口超时 |
| 实例缓存，同供应商 name 复用实例 | 每次发送都 new 一个供应商 client（重复建连） |
| 模板方法：事件分发收敛在基类 send() | 每个子类 doSend() 各写一遍事件分发逻辑 |

## 红旗 - 停下重新评估

- 准备在调用方代码里出现模板 Code（`SMS_xxx`）或供应商 API 字段（违反 Scene 驱动）
- 准备在测试环境连真实短信供应商（违反日志驱动先行）
- 准备在代码里用 if/else 切换供应商而非用配置/环境变量
- 准备让 send() 返回值被忽略，失败被静默吞掉
- 准备把供应商原始错误码透传到业务层（违反统一错误）
- 准备在 Provider 工厂里硬编码 if (provider == "xxx")（违反 Driver 自治构造）
- 准备在接口层加批量发送方法（违反"批量走队列"）
- 准备覆盖 AbstractSmsManager.send() 而非实现 doSend()（破坏模板方法的横切封装）

## 防止合理化

| 借口 | 现实 |
|--------|---------|
| "调用方直接传模板 ID 最省事，包一层 Scene 太绕" | 绕一次，省下的是换供应商时满项目改模板 Code |
| "测试环境连真实供应商才能测真" | 短信发送的集成测试单独跑、可控环境里跑；日常开发/单元测试用日志驱动 |
| "加个 batchSend 方法批量发更方便" | 方便一次，背的是接口同步超时和整批失败的风险；批量走队列 |
| "send 返回 bool，调用方自己判断" | 调用方会忘判断。抛异常/返回 error 是强制你正视失败 |
| "把阿里云错误码透传到业务层，信息更全" | 业务层不需要知道阿里云。翻译成统一错误，细节留在日志 |
| "工厂里 if 硬编码供应商，就两三个没必要抽象" | 加第三个的时候就要改工厂。Driver 自治构造一次写好，永远不用改 SmsManager |
| "日志驱动不是真实环境，测不出问题" | 日志驱动测的是"流程通不通"（Scene 解析、Message 构造、事件分发），供应商对接单独验证 |

## 何时调用本 skill

**以下场景必须按本范式设计：**

- 新项目需要短信发送、验证码下发、通知短信功能
- 现有短信代码要改造为供应商可替换的架构
- 对接新的短信供应商（阿里云/腾讯云/其他），需要实现 Provider（Contract）
- 设计本地开发环境不真发短信的方案
- 排查"测试环境短信扣费"、"换供应商要改业务代码"、"批量发短信接口超时"等问题

**不触发：**

- 只读现有短信代码、查资料（没在设计/实现）
- 单次脚本发一条短信（不是系统化的短信服务）
- 纯邮件/站内信通知（那是别的通知渠道，不是短信）
- 前端展示验证码倒计时 UI（不涉及后端发送架构）

## 底线

**调用方传 Scene 不传模板 ID，Provider 可替换靠环境变量切换，日志驱动先行让开发不花钱，失败抛异常统一错误码不被静默吞掉。**

Scene 驱动让业务语言与供应商语言分离，Contract 抽象（SmsManagerInterface）让换供应商零改动，日志驱动让开发/测试零成本，模板方法把异常捕获与事件分发收敛到一处。这些是短信服务的地基，任何一条让步都会在供应商切换、测试扣费、线上故障时塌方。

批量发送永远走消息队列逐条消费，绝不在接口层做批量抽象。

这是不可协商的。
