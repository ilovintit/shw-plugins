---
name: shw-seqnum
description: 业务编码生成的跨语言设计规范。在设计或实现订单号、单据号、序列号、流水号、短码等编码生成功能时触发。覆盖 Redis INCR 原子递增 + DB 恢复（带 RedisLock 防并发）双轨机制、N 进制短码压缩（36/10/26 进制）、首字符范围校验、padding 顺序、CodeRule 配置模型。用户提到订单号、单据号、序列号、流水号、编码生成、Redis 序号、DB 恢复、intToCode 时自动触发。跨语言通用，不绑定特定框架，代码以伪代码描述。
---

# 业务编码生成设计规范（跨语言）

## 设计目标与分工

编码生成要同时满足四个互相拉扯的目标：**快**（高并发下不重号）、**可靠**（Redis 丢了能从 DB 恢复）、**短**（大序号压缩长度）、**规则可控**（前缀/后缀/长度/字符集/首字符范围可配）。

这四个目标由四个机制分别承担，职责不可混淆：

| 机制 | 承担 | 关键点 |
|------|------|--------|
| Redis INCR | **速度** | 唯一递增入口，原子操作承担并发 |
| DB MAX 恢复 | **可靠性** | Redis 丢失时从 DB 反推序号兜底 |
| N 进制转换 | **压缩** | 大序号压到最短长度 |
| CodeRule 配置 | **规则** | 前缀/长度/字符集/首字符范围全配置化 |

Redis 是唯一并发瓶颈点，DB 只是兜底恢复来源——**绝不让 DB 直接承担递增压力**（行锁成瓶颈），**也绝不让 Redis 单点丢失导致编号从头开始**（必须有 DB 恢复）。

把编码生成简化成"DB 自增主键拼前缀"或"UUID"都是错误：前者 DB 行锁成并发瓶颈，后者长度不可控且无序不可读。

## 核心生成流程（5 步）

一次 `generate(name)` 调用，经历 5 个严格有序的步骤。顺序不可颠倒，每步有明确职责边界。

```
generate(name):
    rule = codeRules.get(name)                    // 0. 取配置

    // 第 1 步：Redis 原子递增
    seq = redis.INCR("seq_num:" + name)

    // 第 2 步：INCR 返回 1 → 触发 DB 恢复（带 RedisLock）
    if seq == 1:
        seq = recoverFromDBWithLock(rule)         // 查 MAX(列) 反推，回写 Redis

    // 第 3 步：intToCode（N 进制转换）
    code = intToCode(seq, rule.charType)          // 如 36 进制：10→"A"，36→"10"

    // 第 4 步：首字符范围校验（padding 之前）
    code = validateFirstChar(code, rule)          // 超范围则换码

    // 第 5 步：padding + 拼接
    code = padLeft(code, rule.length, rule.padding)
    return rule.prefix + code + rule.suffix
```

**两条顺序铁律**：
- 第 2 步的 DB 恢复必须在 RedisLock 保护下进行（防并发恢复互相覆盖）
- 第 4 步首字符校验必须在第 5 步 padding 之前（padding 字符不能污染首字符校验）

## 第 1 步：Redis INCR 原子递增

```
seq = redis.INCR("seq_num:" + name)
```

- 原子操作，高并发下不会重号
- 自带"key 不存在则初始化为 0 再 +1"语义，无需单独 SETNX 初始化
- key 格式统一为 `seq_num:{name}`，name 来自 CodeRule 配置

**不让 DB 直接递增**：DB 的 `AUTO_INCREMENT` 或 `SELECT MAX+1` 在并发下要么行锁阻塞（吞吐崩）、要么需要事务隔离（复杂度高）。Redis 单线程模型天然适合这个场景。

## 第 2 步：DB 恢复（必须带 RedisLock）

### 丢失检测

```
if seq == 1:
    seq = recoverFromDBWithLock(rule)     // key 不存在 → 从 DB 恢复
```

**INCR 返回 1 意味着 key 此前不存在**（不存在则初始化 0 再 +1 = 1）。这不是"第一个编号"，而是"key 丢了"——可能是 Redis 重启、内存淘汰、key 被误删。此时必须从 DB 反推当前最大序号，否则编号会从 1 重新开始，与历史数据冲突。

### 恢复算法（必须带锁）

```
function recoverFromDBWithLock(rule):
    lockKey = "seq_num_lock:" + rule.name

    // 抢锁，10s TTL 防死锁
    got = redisLock.try(lockKey, ttl=10s)

    if not got:
        // 抢锁失败 → 抛异常，让调用方重试整个 generate(name)
        // 重试时 key 已被持锁方恢复，INCR 不会再返回 1，直接拿到正常号
        throw SeqRecoveryBusyException("并发恢复中，请重试: " + rule.name)

    try:
        maxValue = db.table(rule.tableName).max(rule.columnName)
        currentSeq = decodeToInt(maxValue)            // 反推当前最大序号
        newSeq = currentSeq + stepForRewrite           // +1 或留余量
        ok = redis.SET("seq_num:" + rule.name, newSeq) // 回写
        if not ok:
            alert("seq_num 回写失败：" + rule.name)     // 必须告警！
    finally:
        redisLock.release(lockKey)

    return redis.INCR("seq_num:" + rule.name)          // 回写后再 INCR 取号
```

### RedisLock 防并发恢复（关键设计）

key 丢失的瞬间，可能有 N 个并发请求同时拿到 `seq == 1`。若都触发 DB 恢复会：

- N 次重复查 MAX（浪费）
- N 次重复回写（最后一个覆盖前面，**序号可能回退**）
- 恢复期间拿到的号错乱

**正确做法**：恢复前抢 RedisLock，10s TTL 防死锁。
- **抢到锁**：执行 DB 恢复 → 回写 Redis → 释放锁 → 再 INCR 取号
- **抢不到锁**：**抛异常**，让调用方重试。不在恢复函数内部 sleep 轮询——那会占用并发协程/进程，且无法判断持锁方是否已恢复完成。抛异常把"何时重试"的决策权交给调用方（调用方捕获后立即重试 `generate(name)`，此时 key 已被恢复，INCR 直接返回正常号）。

**抢锁失败抛异常而不是静默等待**：让错误显式化，避免在恢复热点上堆积等待的请求。

> DB 恢复的 RedisLock **必须就位**，这是正确性必需，不是可选优化。锁和恢复算法是一个整体——只搬算法不搬锁，Redis 一重启高并发瞬间多个协程/进程同时进入恢复分支，各自查 MAX、各自回写，后写入的覆盖先写入的，序号回退导致**重号**。

### 回写失败必须告警

```
if redis.SET(...) 失败:
    alert("seq_num 回写失败：" + name)
```

回写失败意味着下一次 INCR 又会返回 1，又触发恢复——但 DB 还是旧值，拿到的号会与之前重复。告警是为了让人介入检查 Redis 状态，**不是为了让程序自己重试**（Redis 挂了重试也会失败）。

## 第 3 步：intToCode（N 进制短码压缩）

### 三种字符集（charType）

| charType | 字符集 | 适用场景 |
|----------|--------|----------|
| `36` | 0-9 A-Z（36 个，混合） | 默认，压缩比最高 |
| `10` | 0-9（纯数字） | 需要纯数字编码（如部分订单号） |
| `26` | A-Z（纯字母） | 避开数字的编码 |

### 进制压缩原理

大序号用高进制压缩长度——同样是序号 1295：

```
10 进制："1295"   （4 位）
36 进制："Z7"     （2 位，36²×0 + 36×35 + 7 ... 实际 1295 = 35×36 + 35 → "ZZ"）
```

**关键映射示例（36 进制）**：

| 序号 | 36 进制码 | 说明 |
|------|----------|------|
| 0 | "0" | 最小值 |
| 9 | "9" | 数字段最后 |
| 10 | "A" | 进入字母段 |
| 35 | "Z" | 单字符最大 |
| 36 | "10" | 进位（36¹×1 + 36⁰×0） |
| 1295 | "ZZ" | 36²-1，双字符最大 |
| 46655 | "ZZZ" | 36³-1，三字符最大 |

**为什么默认 36 进制**：1-2 位字符覆盖到 1295，1-3 位覆盖到 46655。订单号、单据号这种增长型编码，36 进制把长度压到最短，扫码、记忆、显示都友好。一律用 10 进制会让长度随业务无限增长（订单号到 10 位以上）。

### intToCode 算法

```
function intToCode(seq, charType):
    // charType=36 用 "0123...8ABCDEFGHIJKLMNOPQRSTUVWXYZ" 前 36 个
    // charType=10 用 "0123456789"
    // charType=26 用 "ABCDEFGHIJKLMNOPQRSTUVWXYZ"（跳过数字段，特殊处理）
    charset = getCharset(charType)

    if seq == 0:
        return charset[0]

    code = ""
    while seq > 0:
        code = charset[seq % charType] + code   // 取余当索引，前插
        seq = seq / charType                     // 整除进位
    return code
```

这是标准进制转换，charType 决定字符集大小与进制基数。

## 第 4 步：首字符范围校验（validateFirstChar）

### 为什么需要首字符范围校验

生成的编码首字符需要避开两类问题：

1. **看起来像 padding**：首字符是 "0" 时，容易和左填充的 "0" 混淆，看不出真实长度
2. **敏感/混淆字符**：某些业务编码要避开特定首字符（如避开 "O" 和 "0" 混淆）

### fcMin / fcMax 配置

CodeRule 里用 `fcMin` / `fcMax` 两个索引限定首字符在 charset 中的范围：

```
charType = 36, charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
fcMin = 1, fcMax = 35
→ 首字符索引范围 [1, 35]，即首字符只能是 "1"-"9" 或 "A"-"Z"
→ 避开索引 0 的 "0"（防 padding 混淆）

fcMin = 0, fcMax = 0
→ 0 表示不校验，首字符任意
```

### 校验逻辑

```
function validateFirstChar(code, rule):
    if rule.fcMin == 0 and rule.fcMax == 0:
        return code                              // 不校验

    firstChar = code[0]
    firstIdx = charset.indexOf(firstChar)
    if firstIdx < rule.fcMin or firstIdx > rule.fcMax:
        // 首字符超范围 → 跳过这个号，递增到下一个首字符合法的号
        return regenerateUntilValid(rule)
    return code
```

**校验失败的处理**：首字符超范围时，这个序号不能直接用——通常递增到下一个首字符合法的号（跳过非法区间）。不能简单"换首字符"，那会破坏编码与序号的对应关系。

### padding 必须在首字符校验之后

```
✅ 正确顺序：intToCode → validateFirstChar → padLeft → 拼接
❌ 错误顺序：intToCode → padLeft → validateFirstChar
```

**错误顺序的坑**：假设 length=4，seq=5（code="5"）。先 padLeft 成 "0005"，再校验首字符——首字符是 "0"，被判定非法，但这个 "0" 是 padding 填出来的，不是真实首字符。校验逻辑会被 padding 污染，要么误报非法、要么把 padding 也算进白名单导致逻辑混乱。

**padding 永远是最后一步（拼接前）**：校验的是真实生成的首字符，不是填充后的。

## 第 5 步：padding 与拼接

```
code = padLeft(code, rule.length, rule.padding)   // 不足长度左填充
return rule.prefix + code + rule.suffix
```

- `length`：编码体长度（**不含前后缀**）。生成的 code 不足此长度时，用 `padding` 字符左填
- `prefix` / `suffix`：业务前缀后缀（如 "ORD" 表示订单、"20260814" 表示日期段）
- padding 字符通常是 "0"，纯字母编码（charType=26）可能用 "A"

**length 是不含前后缀的**：`prefix + code + suffix` 里 code 部分被 padLeft 到 length 长度。总长度 = len(prefix) + length + len(suffix)。

## CodeRule 配置模型

所有生成规则集中在 CodeRule 配置表/配置项里，**不在代码里硬编码规则**。新增一种编码（如"退款单号"）只需加一条 CodeRule，不改生成逻辑。

| 字段 | 说明 | 示例 |
|------|------|------|
| `name` | 规则名，Redis Key 组成（`seq_num:{name}`） | `order_no` |
| `prefix` | 前缀 | `ORD` |
| `suffix` | 后缀 | `""` 或日期段 `20260814` |
| `length` | 编码体长度（不含前后缀） | `6` |
| `charType` | 字符集进制：36 / 10 / 26 | `36` |
| `padding` | 左填充字符 | `0` |
| `tableName` | DB 恢复时的来源表 | `orders` |
| `columnName` | DB 恢复时的来源列 | `order_no` |
| `fcMin` | 首字符索引下限（0=不校验） | `1` |
| `fcMax` | 首字符索引上限（0=不校验） | `35` |

**padding 顺序约定（重复强调）**：padding 字符只参与第 5 步的左填充，发生在首字符校验（第 4 步）之后。配置里的 `padding` 与 `fcMin/fcMax` 是两个独立维度——前者管长度补齐，后者管首字符合法性，二者顺序不可调换。

**配置驱动的好处**：换业务、换长度、换字符集，改配置不改代码。生成引擎只认 CodeRule 接口，与具体业务解耦。

## Good / Bad

| Good | Bad |
|------|-----|
| Redis INCR 是唯一递增入口 | DB AUTO_INCREMENT 或 SELECT MAX+1 承担并发递增 |
| INCR 返回 1 触发 DB 恢复 | 忽略返回 1，编号从 1 重头开始 |
| DB 恢复前抢 RedisLock | 多协程/多进程并发恢复，序号回退错乱 |
| 抢锁失败抛异常让调用方重试 | 在恢复函数内部 sleep 轮询，堆积等待请求 |
| 大序号用 36 进制压缩 | 一律 10 进制，长度随业务无限增长 |
| padding 在首字符校验之后 | 先 padding 后校验，padding 污染首字符 |
| 回写 Redis 失败告警 | 静默失败，下次又返回 1 重复恢复 |
| 规则放 CodeRule 配置表 | 硬编码在代码里，新增规则要改代码 |
| fcMin/fcMax 控首字符范围 | 首字符任意，生成 "0" 开头像 padding |

## 底线

**Redis 承速，DB 承恢复，进制承压缩，配置承规则。**

1. INCR 是唯一递增入口
2. 返回 1 必触发 DB 恢复
3. 恢复必抢 RedisLock，抢锁失败必抛异常
4. 大序号必压缩
5. padding 必在首字符校验之后
6. 回写失败必告警

这六条是编码生成的地基，任何一条让步都会在并发上来或 Redis 重启时塌方（重号、回退、错乱）。第 3 条尤其要注意：**锁和恢复算法是一个整体，分开搬等于没搬**。

这是不可协商的。
