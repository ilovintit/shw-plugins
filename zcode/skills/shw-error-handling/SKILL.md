---
name: shw-error-handling
description: 统一错误处理与响应格式的跨语言设计规范，不绑语言。在设计或实现统一响应格式、错误分类体系、业务码与 HTTP 状态码分离、错误码编号规则、异常/错误类型体系、日志分级时触发。覆盖统一四字段响应（traceId/code/message/data，code=0 成功）、错误三分类（Domain 业务规则→422、Application 流程正常无结果→200、Infrastructure 技术故障→500）、错误对象携带类型信息（继承基类 / gcode detail / enum + match 等多种落地形态）、日志分级（Domain=Warning/App=Info/Infra=Error）、错误码编号规则（领域 1+模块2位+序号2位、应用 2+模块+序号、通用 400/401/403/404、兜底 99999）。用户提到统一响应、错误处理、业务码、异常体系、HTTP 状态码设计时自动触发。
---

# 统一错误处理与响应格式设计规范

## 概述

本 skill 是错误处理与响应格式的**设计规范**，设计概念语言无关，用伪代码与表格描述。

**核心原则**：错误处理不是"抛异常捕获打印日志"，而是"错误分类 → 语义映射 HTTP → 统一响应结构 → 分级日志"的完整体系。把所有错误都当 500 丢出去、前端靠解析 body 里的 code 判断交互策略——是没设计，不是简洁。

**适用判断**：设计或实现统一响应格式、错误分类、业务码体系、错误/异常类型体系时。已经有一套体系在评估是否合理（对照本规范查漏）时也适用。

---

## 1. 统一响应格式：固定四字段

所有接口响应——无论成功失败——都是同一个四字段结构。

```
{
    "traceId": "xxx",     // 请求追踪，贯穿请求-日志-响应
    "code": 0,            // 业务码（0=成功，非0=业务错误码）
    "message": "成功",     // 消息（支持 i18n）
    "data": {}            // 数据对象（空时 {} 或 []）
}
```

### 四字段职责

| 字段 | 职责 | 说明 |
|------|------|------|
| `traceId` | 请求追踪 | 从请求入口生成，贯穿请求→日志→响应。线上排查靠它把分散日志串起来 |
| `code` | 业务语义 | `0` = 成功，非 `0` = 业务错误码。前端据此决定要不要展示 message |
| `message` | 人类可读消息 | 支持 i18n，按客户端语言环境返回对应文案 |
| `data` | 数据载荷 | 成功时的业务数据。空时给 `{}`（对象）或 `[]`（列表），**不返回 null** |

### 业务码与 HTTP 状态码分离

**这是最核心的设计决策**：

- `code`（body 内）：业务语义。"用户名已存在"是 10101，"用户不存在"是 20101——业务语义。
- HTTP 状态码：传输语义。200 表示请求被正确处理、422 表示请求实体有问题、500 表示服务器故障。

两者职责正交，互不替代。不要用 HTTP 状态码承载业务语义（如 200 = 成功、404 = 用户不存在、409 = 用户名重复），也不要用 body 的 code 替代 HTTP 语义。前端两条线索都要用。

---

## 2. 错误三分类 → HTTP 状态码映射

错误分三类，每类固定映射一个 HTTP 状态码。映射基于"错误的本质语义"，不是"哪个数字好看"。

### 三分类定义

| 类型 | 含义 | 典型场景 | HTTP 状态码 |
|------|------|---------|------------|
| **Domain**（领域错误） | 业务规则违反 | 手机号已注册、金额不能为负、状态不允许此操作 | **422** Unprocessable Entity |
| **Application**（应用错误） | 业务流程正常但无结果 | 资源不存在、权限不足 | **200** OK |
| **Infrastructure**（基础设施错误） | 技术故障 | DB 连不上、Redis 超时、第三方服务宕机 | **500** Internal Server Error |

### 设计意图：错误语义与 HTTP 语义对齐

```
Domain → 422
  请求实体（body 里的数据）在业务层面无法处理
  前端策略：表单错误提示（如"手机号已注册"标红）

Application → 200
  请求被正确处理了，只是没有业务结果（资源不存在 / 无权限访问）
  前端策略：空页面 / 无权限提示（流程正常，不是错误状态）

Infrastructure → 500
  服务器侧技术故障，请求没被正常处理
  前端策略：重试按钮 / 错误页面（服务端的问题，用户可重试）
```

**关键**：前端按 **HTTP 状态码**判断交互策略（422→表单提示、200→空页面、500→重试），不需要先解析 body 的 code 再分类。HTTP 状态码是传输层的"第一眼语义"，让前端在最外层就能决定怎么对用户呈现。

### 为什么 Application 用 200 而非 404/403

| 方案 | 问题 |
|------|------|
| 资源不存在 → HTTP 404 | 404 在 HTTP 语义里是"路由不存在"，会被网关/CDN 当作"接口未注册"拦截；且业务上"查不到这个用户"是正常流程结果，不是路由错误 |
| 权限不足 → HTTP 403 | 403 表示"服务器拒绝执行"，但权限不足时业务流程是正常的（登录态有效、接口存在、只是这个资源你无权看），用 200 + 业务码更准确 |

**Application 类错误的本质**：请求被正常接收、正常处理、正常响应——只是处理结果是"无此资源 / 无权访问"。这是业务的正常分支，不是传输层的错误，所以 HTTP 200。

---

## 3. 错误码编号规则

错误码是全局唯一的业务标识，编号有规则可循，避免各模块各拍各的。

### 编号分段

| 层 | 编号格式 | 示例 | 说明 |
|----|---------|------|------|
| **领域层（Domain）** | `1` + 模块前缀(2位) + 序号(2位) | `10101` | 1 开头 + 01(user 模块) + 01(序号) = 用户名已存在 |
| **应用层（Application）** | `2` + 模块前缀(2位) + 序号(2位) | `20101` | 2 开头 + 01(user 模块) + 01(序号) = 用户不存在 |
| **基础设施层（Infrastructure）** | `50001` ~ `50004` | `50001` | 固定段，DB / Redis / MQ / 第三方 各占一位 |
| **通用码** | `400` / `401` / `403` / `404` | `400` | 参数校验失败、未登录、无权限、通用资源不存在 |
| **兜底码** | `99999` | `99999` | 未捕获异常的最终兜底，保证响应永远是合法四字段 |

### 模块前缀分配

每个业务模块（user / order / payment 等）分配一个两位前缀，全局唯一。模块内序号从 01 递增。错误码集中定义在一处（常量类 / 错误码对象 / 常量块），新增时一眼看出占用了哪些。

### 兜底码的必要性

未捕获的异常（意料之外的 panic / 运行时错误）必须有一个兜底码 `99999` + HTTP 500，保证响应永远是合法的四字段结构，**绝不把裸的框架错误堆栈泄漏给前端**。

---

## 4. 日志分级

不同类型的错误，日志级别不同。分级依据是"这个错误对系统健康的信号强度"，不是"这个错误有多严重"。

| 错误类型 | 日志级别 | 理由 |
|---------|---------|------|
| Domain（领域错误） | **Warning** | 业务规则违反，用户行为问题，系统本身正常。值得记录用于业务分析，但不需要告警 |
| Application（应用错误） | **Info** | 正常的业务流程分支（资源不存在、无权限），系统运行符合预期。记录用于审计追踪 |
| Infrastructure（基础设施错误） | **Error** | 技术故障，系统健康受损，需要告警介入 |
| 校验失败（参数错误） | **Info** | 用户输入不合法，非系统问题。高频但无害 |
| 未捕获异常 | **Error** | 意料之外的崩溃，必须告警，需立即排查 |

**日志分级与 HTTP 状态码的对应**：Domain(422)→Warning、Application(200)→Info、Infrastructure(500)→Error。日志级别跟着错误本质走，不跟着"用户会不会投诉"走。

---

## 5. 错误对象携带类型信息（核心设计）

三分类要能被中间件统一捕获并分发到正确的 HTTP 状态码和日志级别，**每个错误对象必须携带自己的类型信息**。这是整套机制能工作的关键。

错误对象至少包含三个信息：
- **错误码**：业务标识（如 10101）
- **消息**：人类可读文案（如"用户名已存在"）
- **类型**：Domain / Application / Infrastructure 三选一

中间件统一捕获错误 → 读出类型 → 查类型到 HTTP/日志的映射表 → 输出四字段响应。

### 落地形态：类型携带的三种实现

不同语言生态有不同的"类型携带"机制，选最贴合该语言习惯的一种：

**形态 A：异常基类继承（is-a）** —— 面向对象语言（PHP / Java / Node 等）

```
abstract class DomainException extends BusinessException        // 领域错误 → HTTP 422
abstract class ApplicationException extends BusinessException   // 应用错误 → HTTP 200
abstract class InfrastructureException extends RuntimeException // 基础设施错误 → HTTP 500

// 具体异常继承基类，构造传码
class UsernameDuplicatedException extends DomainException:
    __construct(): parent.__construct(10101, "用户名已存在")

class UserNotFoundException extends ApplicationException:
    __construct(): parent.__construct(20101, "用户不存在")

// 中间件用 instanceof 分发
function exceptionHandler(e):
    if e instanceof DomainException:        httpStatus = 422; logLevel = WARNING
    elseif e instanceof ApplicationException: httpStatus = 200; logLevel = INFO
    elseif e instanceof InfrastructureException: httpStatus = 500; logLevel = ERROR
    else: e = wrapUncatched(e);              httpStatus = 500; logLevel = ERROR  // 兜底
    logger.log(logLevel, e.message, {traceId, exception: e})
    return Response({traceId, code: e.code, message: e.message, data: {}}, httpStatus)
```

继承关系天然携带类型（is-a），`instanceof` 能直接分发。

**形态 B：错误码 detail 携带类型（has-a）** —— Go / 类似 error-is-value 的语言

错误类型用枚举字符串表达，定义错误码时把类型绑到 detail 字段；中间件从 detail 反推类型。

```
type ErrorType string
const (
    ErrorTypeDomain         ErrorType = "domain"
    ErrorTypeApplication    ErrorType = "application"
    ErrorTypeInfrastructure ErrorType = "infrastructure"
)

// 错误码集中定义，第三个参数（detail）携带 ErrorType
var (
    CodeUsernameDuplicated = gcode.New(10101, "用户名已存在", ErrorTypeDomain)
    CodeUserNotFound       = gcode.New(20101, "用户不存在", ErrorTypeApplication)
    CodeDBConnectFailed    = gcode.New(50001, "数据库连接失败", ErrorTypeInfrastructure)
    CodeUncatched          = gcode.New(99999, "系统繁忙",     ErrorTypeInfrastructure)
)

// 中间件从 detail 反推类型，映射 HTTP（与形态 A 的 instanceof 分发一一对应）
var errorTypeHTTPStatus = map[ErrorType]int{
    ErrorTypeDomain: 422, ErrorTypeApplication: 200, ErrorTypeInfrastructure: 500,
}

func Response(r):
    if err := getCtxError(r); err != nil:
        code := gerror.Code(err)
        if code.Code() < 1000: code = CodeUncatched                    // 框架内部错误兜底
        errType, ok := code.Detail().(ErrorType)
        if !ok: errType = ErrorTypeApplication                          // 反推失败默认 Application
        writeStatusExit(errorTypeHTTPStatus[errType], {traceId, code: code.Code(), message: code.Message(), data: {}})
```

**为什么不靠 code 数值范围判断类型**：业务码扩展时范围要重排、跨层共用码无法归类、维护者记不住边界。每个码定义时就绑定类型（detail 或继承），中间件直接取出，精确且无需记忆区间。

**形态 C：枚举 + match** —— Rust / Scala / 等带模式匹配的语言

错误类型作为 enum 的 variant，match 分发。语义一致，仅表达方式不同。

### 三种形态等价

不管用继承、detail 还是 enum，本质都是"错误对象携带类型 + 中间件读类型分发"。三分类语义、四字段结构、HTTP 映射、日志分级一致就是同一套范式。

**换语言时迁移的是三分类、四字段、编号规则、HTTP 映射、日志分级这套概念，不是某个语言的语法。**

---

## 6. 通用场景举例

| 场景 | 抛错类型 | code | HTTP | 日志 |
|------|---------|------|------|------|
| 注册时手机号已存在 | Domain | 10101 | 422 | Warning |
| 创建订单金额为负 | Domain | 10201 | 422 | Warning |
| 订单状态不允许取消（已发货） | Domain | 10301 | 422 | Warning |
| 查询的用户 id 不存在 | Application | 20101 | 200 | Info |
| 普通管理员访问超管功能 | Application | 20102 | 200 | Info |
| 数据库连接池耗尽 | Infrastructure | 50001 | 500 | Error |
| Redis 读取超时 | Infrastructure | 50002 | 500 | Error |
| 参数校验失败（字段缺失） | Domain | 400 | 422 | Info |
| 意料之外的 NPE / panic | 兜底 | 99999 | 500 | Error |

---

## Good / Bad

| Good | Bad |
|------|-----|
| 四字段统一响应，空 data 给 `{}`/`[]` 不给 null | 成功/失败返回不同结构，或 data 返回 null |
| 业务码与 HTTP 状态码分离，各司其职 | 用 HTTP 状态码承载业务语义（404=用户不存在） |
| Domain→422、Application→200、Infrastructure→500 | 所有错误统一 200 或统一 500，前端无法按 HTTP 分流交互策略 |
| 错误码按层分段（1/2/5000x）+ 模块前缀 | 各模块随手定码，重复冲突、无规律可循 |
| 错误对象携带类型（继承 / detail / enum），中间件统一分发 | 一个 Exception 包打天下，靠 code 字符串 if 判断 |
| 中间件从类型反推 HTTP，不用 code 数值范围判断 | `if code >= 10000 && code < 20000` 判断 Domain（数值范围硬编码） |
| 日志按错误类型分级（Domain→Warning 等） | 所有错误统一 Error 级别，告警噪音淹没真问题 |
| 未捕获异常兜底 99999 + 500，永不泄漏堆栈 | 框架默认错误页直接吐给前端 |

---

## 红旗 - 停下重新评估

- 准备用 HTTP 404 表示"用户不存在"（混淆传输语义与业务语义）
- 准备让前端靠解析 body 的 code 判断"要不要重试"（应靠 HTTP 状态码）
- 准备把所有异常都当 500 丢出去（前端只能统一显示"系统错误"）
- 错误码随手定，没有编号规则（重复冲突、无法追溯）
- 准备在一个 Exception / Error 类里塞所有错误，靠 code 字符串判断（失去类型分发能力）
- 准备用 `if code >= 10000 && code < 20000` 判断 Domain（数值范围硬编码）
- 统一响应里 data 字段返回 null（前端要做 null 判断，违反契约）
- 错误响应不带 traceId（线上出问题串不起日志）
- 未捕获异常直接把堆栈返回给前端（信息泄漏）

---

## 防止合理化

| 借口 | 现实 |
|--------|---------|
| "HTTP 状态码直接用 404/409 更 RESTful" | RESTful 是资源语义，业务错误是业务语义，用 HTTP 码承载会让网关/CDN 误拦截 |
| "Application 用 200 不规范，错误就该 4xx/5xx" | Application 是正常业务流程结果（资源不存在/无权限），不是传输错误，200 + 业务码更准确 |
| "code 数值范围判断更简单" | 扩展时范围要重排、跨层码无法归类，detail/继承携带类型才精确 |
| "兜底码没必要，异常直接抛" | 不兜底 = 响应结构不统一 / 堆栈泄漏，前端没法处理 |
| "data 返回 null 前端也能处理" | null 是"没有这个字段"，`{}`/`[]` 是"字段在但空"，语义不同 |
| "日志都记 Error 最安全" | Error 会触发告警，Domain/Application 记 Error = 告警噪音，淹真正故障 |
| "traceId 没用，日志够全就行" | 没有 traceId，分散的日志串不起来，线上排查靠肉眼翻 |
| "前端解析 code 一样能分流交互" | 多了一层解析，HTTP 状态码是传输层第一眼语义，应在最外层分流 |

---

## 何时调用本 skill

**以下场景加载本 skill：**

- 新项目需要设计统一响应格式、错误处理体系
- 现有错误处理混乱，要统一规范（对照本规范查漏）
- 设计业务码编号规则、错误码集中定义方案
- 设计错误/异常类型体系、错误对象如何携带类型信息
- 评估"用 HTTP 状态码承载业务语义"是否合理（不合理的）
- 设计日志分级策略

**不触发：**

- 只读现有错误处理代码（没在动手设计/统一）
- 单次脚本随便处理个异常（不是系统化的错误体系）
- 纯前端错误处理（前端是消费方，本 skill 管后端的错误产生与响应）

---

## 底线

**四字段统一响应，业务码与 HTTP 分离，错误三分类对齐 HTTP 语义，错误对象必须携带类型信息。**

traceId 串日志，code 表业务，HTTP 表传输，data 永不 null。
Domain→422 让前端标红表单，Application→200 让前端渲染空页面，Infrastructure→500 让前端弹重试。
错误码分层分段有规律，未捕获兜底 99999 不漏堆栈。
错误对象携带类型（继承基类 / gcode detail / enum + match 任选其一），中间件统一分发——概念一致，实现随语言。

把所有错误都当 500、前端解析 code 才知道怎么交互——是没设计，不是简洁。

这是不可协商的。
