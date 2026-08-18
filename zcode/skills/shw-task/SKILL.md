---
name: shw-task
description: 在设计或实现后台任务管理系统（异步任务、定时扫描、批量处理、父子拆分任务、常驻 Worker 进程）时触发。Table-First 设计：DB 为唯一真相源、SKIP LOCKED 并发 claim、attempt 级幂等、Executor 不决策重试（独立 RetryScanProcess 独占）、4 种执行模式、Process 四级继承骨架。用户提到后台任务、任务队列、定时任务、Worker、Task、SKIP LOCKED、幂等、重试策略时自动触发。
---

# 后台任务管理系统设计规范

## 概述

本 skill 是后台任务基础设施的**设计规范**。

**核心立场**：后台任务不是"把活扔到队列就完事"。它是一个带状态机、带幂等控制、带故障兜底的状态系统。看不见状态的后台任务 = 定时炸弹。

---

## 一、Table-First 核心理念

**DB 是唯一真相源，队列消息只携带 task_id，执行时回查 DB。**

```
传统 MQ-first：               Table-First（本规范）：
消息体 = 全部业务数据          消息体 = 只带 task_id
执行时消费消息即干活           执行时回查 DB task 行再干活
DB 只存历史快照                DB 是活的状态机
队列挂了 = 任务丢失            队列挂了 = 任务停摆但不丢（重发即可）
查不到实时状态                 查 task 表 = 看到真实状态
```

**铁律**：队列是传输层，不是存储层。任何"队列里有就一定在执行、队列里没有就一定没排"的假设都是错的。task 表里是什么状态，就是什么状态。

---

## 二、数据模型（双表设计）

### 2.1 task 表（任务主表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint PK | 主键 |
| task_no | string | 业务编号（可追溯） |
| type | string | 任务类型（一个 type 对应一个 handler） |
| payload | JSON 文档 | 任务参数 |
| status | enum | 任务状态（见状态机） |
| priority | int | 优先级 |
| attempts | int | 已尝试次数 |
| max_attempts | int | 最大尝试次数 |
| available_at | timestamp | 何时可被领取（支持延迟/退避） |
| started_at | timestamp | 首次执行开始时间 |
| finished_at | timestamp | 终态时间 |
| timeout | int | 单次执行超时秒数 |
| progress | int | 进度百分比（0-100） |
| result | JSON 文档 | 执行结果（成功/部分成功数据） |
| last_error | text | 最近一次错误 |
| parent_id | bigint | 父任务 ID（父子拆分用） |
| is_split | bool | 是否拆分任务 |
| biz_ext | JSON 文档 | 业务扩展字段（支持结构化包含过滤） |

### 2.2 task_attempt 表（执行历史 / 幂等控制）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint PK | 主键 = 全局唯一 attempt_id |
| task_id | bigint FK | 关联任务 |
| attempt_no | int | 第几次尝试 |
| status | enum | 该次执行状态 |
| started_at | timestamp | 开始时间 |
| finished_at | timestamp | 结束时间 |
| worker_id | string | 执行者标识（哪个 worker/实例领取） |
| error | text | 该次错误 |
| result | JSON 文档 | 该次结果 |

**为什么必须要有 attempt 表**：一次任务可能被尝试多次（重试），每次尝试都是一条独立 attempt 记录。attempt_id 是全局唯一的执行标识，是幂等控制的根基。没有 attempt 表，就无法区分"这次回写是第几次执行的结果"，也无法做抢占时的"无活跃 attempt"校验，更无法处理慢执行者冲突。双表设计是 Table-First 落地的硬性要求，不可省略。

---

## 三、状态机

```
                        ┌─────────── cancelled ◀──────┐
                        │  （任意非终态可取消）          │
                        │                              │
pending ──▶ running ──▶ succeeded（终态）
   ▲           │
   │           ├──▶ failed ──▶ pending（重试，未达 max_attempts）
   │           │
   │           └──▶ completed_with_errors（部分成功，终态）
   │
   └──── dead（达 max_attempts 上限，终态）
```

**状态流转必须校验**：不允许非法跳转（如 succeeded → running）。status enum 封装合法流转，非法流转直接抛异常。

**特殊状态 completed_with_errors**：父子拆分场景，部分子任务成功、部分失败，父任务标记为部分成功。适用于"批量通知 1000 人，995 成功 5 失败"这类可接受部分失败的场景。

---

## 四、四种执行模式

### 模式 1：单实例 Worker（锁 + pull）

```
场景：任务必须单实例串行执行（如数据导入，多实例会重复处理）
机制：分布式锁 + pull 模式
  抢到锁的实例 → 循环 claim 待执行 task → 执行
  抢不到锁的实例 → 待命（锁释放后再抢）
```

### 模式 2：多实例 Worker（SKIP LOCKED 并发 claim + pull）

```
场景：任务可并发执行，需要高吞吐（如批量通知，多实例分摊）
机制：无应用层锁 + 数据库 SKIP LOCKED 并发 claim + pull 模式
  所有实例 → 各自 claim（SKIP LOCKED 保证不领同一行）→ 并发执行
```

### 模式 3：队列消费（queue 模式）

```
场景：已有 MQ 基础设施（AMQP/Kafka），想用队列的推送能力
机制：queue 模式
  入队：task 创建后，消息（只带 task_id）推入 MQ
  消费：Consumer 收消息 → 回查 DB task → 执行
  兜底：消息丢了不可怕，RetryScanProcess 会捡起 available_at 到期但未终态的任务
```

### 模式 4：父子拆分（Generator 产出子任务）

```
场景：单个大任务拆成多个子任务并发/串行执行（如 10 万条数据导入拆成 100 个子任务）
机制：锁单实例 + 生成器流式产出子任务
  Splitter → estimate() 估算总量 → split() 用 Generator 流式产出子任务 payload
  每个子任务 = 一条 task 行（parent_id 指向父任务）
  子任务各自走模式 1/2/3 执行
  父任务等所有子任务终态后聚合结果
```

**为什么 Splitter 用 Generator（流式产出）**：一次性 split 10 万条会撑爆内存。Generator 每次 yield 一个子任务 payload，写一条 task 行，内存恒定。

---

## 五、核心设计原则

### 原则 1：Executor 不决策重试

```
错误做法：Executor 执行失败 → 自己决定要不要重试 → 自己安排 available_at
  问题：Executor 崩溃了，谁来重试？重试策略跟着 Executor 一起死。

正确做法：
  Executor / Consumer → 只执行 + 回写当前状态（running → failed）
  独立的 RetryScanProcess → 独占扫描 failed 且未达上限的 task → 决定重试 + 安排退避 available_at
```

**铁律**：重试是系统行为，不是执行者行为。Executor 只负责如实回写"我这次失败了"，是否重试、何时重试，由独立的 RetryScanProcess 统一独占裁决。这样 Executor 崩溃不会导致重试策略永久失效。Executor 内出现任何"安排重试"的逻辑都是规范违例。

### 原则 2：attempt 级幂等

每次执行 = 一条 attempt 记录 = 全局唯一 attempt_id。幂等控制分两段：

**抢占阶段（单个事务内完成）**：

```
BEGIN 事务;
  1. SELECT ... FOR UPDATE 锁住 task 行（防并发抢占）
  2. 校验 task.status == pending（非 pending 不抢）
  3. 校验无活跃 attempt（不存在 status=running 的 attempt，防重复领取）
  4. INSERT 一条 status=running 的 attempt 记录
  5. UPDATE task.status = running
COMMIT 事务;
```

**回写阶段**：

```
回写结果前先校验当前 attempt.status 是否仍为 running：
  是 running → 回写结果，更新 task + attempt 状态
  否则       → 丢弃本次结果（已被超时回收或被别的流程处理，处理"慢执行者"问题）
```

**"慢执行者"问题**：worker A 领了任务执行得很慢，系统以为它死了，超时回收 + 让 worker B 重试。这时 A 终于执行完要回写——必须丢弃 A 的结果，因为它的 attempt 已不是 running。否则双写冲突、数据错乱。

### 原则 3：Table-First 的四大优势

| 优势 | 说明 |
|------|------|
| 可视化即真实 | 查 task 表看到的就是真实状态，不需要"队列里有没有""内存里跑到哪"的猜测 |
| 天然并发互斥 | 数据库的 `FOR UPDATE SKIP LOCKED` 让多实例 claim 互斥，不需要应用层加锁 |
| SQL 表达运维 | 手动重跑（UPDATE status=pending）、延迟执行（UPDATE available_at）、重试退避（UPDATE available_at=now+退避）全由 SQL 搞定 |
| 降级友好 | 队列挂了任务不丢（task 行还在），分布式锁挂了单实例模式退化为串行（多实例模式靠 SKIP LOCKED 不受影响） |

### 原则 4：幂等责任划分

```
框架的责任（框架保证）：
  - 不并发重复执行同一个 task（抢占阶段的行锁 + 活跃 attempt 校验）
  - 同一时刻只有一个 worker 在执行某 task

业务的责任（handler 自己保证）：
  - 重试导致的"串行重复执行"必须幂等
  - 同一个 task 重试 3 次，handler 的副作用只能发生一次（或可安全重复）
```

**举例**：批量通知任务，handler 对每个用户调一次短信 API。重试时不能给同一用户发两条短信——handler 必须自己记录"这个用户已通知过"（用 task.biz_ext 或外部去重表）。

### 参考实现注记：利用数据库原生能力

本规范不绑定具体数据库，但落地依赖以下原生能力（PG/MySQL 8+/其他支持等效语义的库均可）：

| 能力 | 用途 |
|------|------|
| JSON 文档列（如 JSONB） | payload / result / biz_ext 存储，支持 `biz_ext @> '{"batch":"A"}'` 结构化包含过滤 |
| `FOR UPDATE SKIP LOCKED` | 多实例并发 claim，互斥不阻塞，天然负载均衡 |
| 部分索引 | `CREATE INDEX ... WHERE status='running'`，只索引 running 行，索引小且快 |

---

## 六、接口契约（伪代码）

### 6.1 任务处理器

```
interface JobHandler:
    # 一个 type 对应一个 handler 实现，注册时绑定
    handle(task) -> TaskResult
```

### 6.2 父子拆分器

```
interface Splitter:
    estimate() -> int                  # 估算子任务总数
    split() -> Generator<子任务payload> # 流式产出子任务 payload（不可一次性返回数组）
```

### 6.3 重试策略

```
interface RetryPolicy:
    shouldRetry(attempts, lastError) -> bool       # 是否应重试
    nextAvailableAt(attempts) -> timestamp         # 下次可领取时间（退避）
```

**一个 type 一个 handler**：任务类型（type）到 handler 是一对一映射。注册时绑定，执行时按 task.type 查到对应 handler 调用。

**注意**：RetryPolicy 由 RetryScanProcess 调用，Executor 不调用。这呼应原则 1——重试决策权不在执行者手里。

---

## 七、Process 进程骨架（四级继承）

Task 系统的所有执行模式（Worker / Consumer / Splitter / RetryScan）都构建在这套进程骨架之上。从通用到特化，四级继承：

```
第一级 AbstractSwitchProcess          —— 环境变量开关
   PROC_{MODULE}_{NAME} 控制启停；默认全关；API 容器关、Worker 容器开
        │
        ▼
第二级 AbstractLoopProcess            —— while 骨架
   循环上限 + 内存上限保护 + 循环间 sleep（防 CPU 空转）
        │
        ▼
第三级 AbstractLockLoopProcess        —— 分布式锁互斥
   继承 Loop，加分布式锁；抢到锁才进循环，抢不到待命
        │
        ▼
第四级 AbstractPeriodicProcess        —— 定时周期 + 间隔抖动
   sleep = interval - runTime + 0~10% jitter（抖动防多实例同步冲击）
```

### 各级职责

| 级别 | 解决的问题 | 不可省的原因 |
|------|-----------|-------------|
| SwitchProcess | 进程启停控制 | API 容器不该跑 Worker，Worker 容器才跑。靠环境变量切换，不靠部署时手动删进程 |
| LoopProcess | 常驻进程防崩 | while 骨架不加上限会内存泄漏、不 sleep 会吃满 CPU。循环上限 + 内存上限是兜底 |
| LockLoopProcess | 单实例互斥 | 分布式锁保证同一种 Worker 全集群只有一个实例在循环 |
| PeriodicProcess | 定时周期 + 抖动 | 间隔抖动防止多实例在同一秒冲击下游（如同时拉外部 API 触发限流） |

### 伪代码：各级行为骨架

```
# 第一级：开关
class AbstractSwitchProcess:
    enabled = env("PROC_" + MODULE + "_" + NAME)   # 默认 false
    function start():
        if not enabled: return                      # 不开直接不启
        super.start()

# 第二级：循环骨架
class AbstractLoopProcess < AbstractSwitchProcess:
    function start():
        while not shouldStop():
            if loopCount > MAX_LOOPS or memory > MAX_MEM: restart()   # 兜底重生
            this.tick()                              # 子类实现
            sleep(LOOP_INTERVAL)

# 第三级：锁循环
class AbstractLockLoopProcess < AbstractLoopProcess:
    function tick():
        if acquireLock():                            # 抢到锁
            try: this.handle()  finally: releaseLock()
        # 抢不到锁 → 待命，下轮再试

# 第四级：定时周期
class AbstractPeriodicProcess < AbstractLockLoopProcess:
    function start():
        while not shouldStop():
            runStart = now()
            this.tick()
            elapsed = now() - runStart
            jitter = INTERVAL * random(0, 0.10)       # 0~10% 抖动
            sleep(max(0, INTERVAL - elapsed + jitter))
```

**选择哪一级做父类**：
- 需要定时周期执行 → 继承第四级（AbstractPeriodicProcess）
- 需要常驻但非定时（事件驱动循环）→ 继承第三级（AbstractLockLoopProcess）
- 不需要锁的常驻 → 继承第二级（AbstractLoopProcess）

> 四级继承是 PHP 的设计表达。其他语言没有类继承时，用接口 + 嵌入结构体 / 装饰器 / 组合函数等等效机制实现同一套骨架职责（开关、循环上限、锁、抖动），语义不可缺失。

---

## 八、独立兜底流程：RetryScanProcess

```
RetryScanProcess（继承 AbstractPeriodicProcess 或 AbstractLockLoopProcess）：
  周期扫描：
    SELECT * FROM task
     WHERE status = 'failed'
       AND attempts < max_attempts
       AND available_at <= now()        # 退避到期
     LIMIT batch_size

  对每条 task：
    调用 RetryPolicy.shouldRetry()
      true  → UPDATE status='pending', available_at=RetryPolicy.nextAvailableAt()
      false → UPDATE status='dead'      # 达上限，终态
```

**职责独占**：RetryScanProcess 是唯一有权把 failed 翻回 pending 的流程。Executor/Consumer 不得自行做这件事。这是原则 1 的执行保证。

**也是超时回收的归属**：对 running 超过 timeout 的 task（其 attempt 卡在 running），同样由这类扫描流程回收——把卡死的 attempt 置为失败、task 重新放回 pending（或 dead），触发新一轮抢占。Executor 自身不感知超时。

---

## 九、通用场景设计要点

| 场景 | 推荐模式 | 设计要点 |
|------|---------|---------|
| 数据导入（10 万行 → DB） | 模式 4 父子拆分 | Splitter 按 1000 行/子任务拆分，子任务走模式 2 并发，父任务聚合统计成功/失败数 |
| 批量通知（给 10 万用户发消息） | 模式 2 多实例并发 | handler 内按用户去重幂等，progress 反映已通知百分比 |
| 定时同步（每晚同步外部系统数据） | 模式 1 单实例 | 单实例串行保证不重复拉取，失败由 RetryScanProcess 退避重试 |
| 邮件队列（用户触发后异步发） | 模式 3 队列消费 | 消息只带 task_id，消费时回查，队列丢消息不丢任务 |

---

## 十、通用设计原则（跨语言）

无论用何种语言实现，以下原则通用：

### 1. 状态必须可见

```
错误：任务状态藏在内存/队列里，外部无法查询
正确：查 task 表 = 看到真实状态；进程级指标/日志补充可见性
```

### 2. 失败必须可恢复

```
错误：进程崩了任务就没了
正确：RetryScanProcess 独占兜底重试；进程级 panic recover 保护循环不中断
```

### 3. 重复执行必须安全

```
错误：假设任务只会执行一次
正确：框架保证不并发重复（行锁 + 活跃 attempt 校验），handler 保证串行幂等
```

### 4. 降级必须存活

```
错误：依赖（队列/锁/DB）挂了整个任务系统瘫痪
正确：队列挂 → task 表兜底（重发消息即可恢复）；锁挂 → 单实例退化串行，多实例靠 SKIP LOCKED 继续
```

### Good / Bad

| Good | Bad |
|------|-----|
| 消息只带 task_id，回查 DB | 消息体塞全部业务数据，DB 只存历史 |
| Executor 只回写状态，RetryScan 独占决策重试 | Executor 自己决定重试，崩了重试策略失效 |
| 每次执行一条 attempt 记录，attempt_id 全局唯一 | 没有 attempt 表，无法区分第几次执行 |
| 回写前校验 attempt 是否仍 running | 直接回写，遇到慢执行者双写冲突 |
| Process 骨架用继承/组合复用（四级） | 每个 Worker 各写各的 while + sleep + 锁，必然漏兜底 |
| 多实例 claim 用 SKIP LOCKED | 应用层自己加锁协调，互斥不彻底 |

---

## 十一、常见错误（禁止）

- Executor 自己决策重试 → 重试逻辑跟 Executor 绑定，Executor 崩溃则重试永久失效。必须用独立 RetryScanProcess
- 消息体塞全部业务数据 → 违背 Table-First，DB 不再是唯一真相源。消息只带 task_id
- 没有 attempt 表 → 无法做抢占时的"无活跃 attempt"校验，无法处理慢执行者
- 回写不校验 attempt 状态 → 慢执行者回写覆盖新执行者结果，数据错乱
- 多实例 Worker 不用 SKIP LOCKED（或等效互斥）→ 同一任务被多实例重复领取
- 父子拆分一次性 split 全部子任务 → 大任务撑爆内存。必须用 Generator 流式产出
- Process 骨架不用继承/组合复用，各写各的 while 骨架 → 循环上限、内存保护、锁、抖动各实现一遍，必然漏
- 用进程内周期循环替代 Table-First 任务管理 → 没有状态机/attempt 幂等/重试兜底，用错场景必然出事
- 常驻进程不加 panic recover → 一次业务 panic 杀掉整个进程，所有任务陪葬
- 周期循环不加间隔抖动 → 多实例同秒冲击下游，触发限流

---

## 何时调用本 skill

**以下场景加载本 skill：**

- 设计/实现任何后台任务系统（异步任务、定时任务、批量处理、父子拆分）
- 涉及任务队列、Worker、Task、SKIP LOCKED、幂等、重试策略
- 需要父子拆分大任务、需要并发 claim、需要延迟/退避执行
- 设计常驻 Worker 进程、Process 进程骨架、定时周期循环
- 排查任务重复执行、任务丢失、重试失效、慢执行者冲突等问题

**不触发：**

- 纯同步请求处理（不是后台任务）
- 前端定时器（setTimeout/setInterval，进程内轻量定时，非后台任务管理）
- 只读代码、了解现有任务系统（没在动手设计/实现）

---

## 底线

**后台任务不是"扔到队列就完事"。它是一个带状态机、带幂等、带兜底的状态系统。**

- Table-First：DB 是唯一真相源，队列是传输层不是存储层。
- Executor 不决策重试：执行者只回写，重试由独立 RetryScanProcess 独占。
- attempt 级幂等：每次执行一条记录，抢占加事务、回写先校验。
- 双表 + 四模式 + 四级 Process 骨架：完整标准，不可裁剪。

选错了、省了兜底、丢了状态——线上炸的时候，就是这次偷的懒在还债。

这是不可协商的。
