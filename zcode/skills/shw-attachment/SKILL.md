---
name: shw-attachment
description: 附件/文件上传管理系统的跨语言设计范式。在设计或实现文件上传、前端直传 OSS/MinIO、附件去重、临时上传清理、附件归档等功能时触发。定义"前端直传 + 后端双表索引 + 后台归档去重"的整体架构、6 阶段生命周期、UploadTicket/UploadPolicy/StorageInterface/业务钩子四大接口契约、commit 顺序铁律、域名三层分离、3 个后台清理进程。涉及 uploads/attachments 双表、md5 去重、预签名 URL、PostObject 表单上传时适用。跨语言通用，不绑定特定框架，代码用伪代码描述。
---

# 附件管理设计范式（跨语言）

## 概述

本 skill 是附件/文件上传管理系统的**设计范式**，语言无关。下面的数据模型、接口契约、生命周期、后台进程都是范式，换语言照搬同一套思路即可。

**核心原则**：前端直传 + 后端双表索引 + 后台归档去重。文件流直奔对象存储（OSS/MinIO），应用服务器只负责签发票据、登记索引、调度归档——绝不充当文件中转站。

**违反这个原则就是把应用服务器当文件网关用**：带宽被吃满、内存被撑爆、扩容时每台机器都要挂大磁盘、上传慢用户骂娘。所有这些问题的根因都是"文件经过了应用服务器"。

**适用判断**：设计或实现任何系统化的附件/文件上传（用户头像、订单附件、文档上传、跨模块统一附件管理库）时。不适用：单次脚本传个文件、纯前端预览/裁剪、只读现有代码。

---

## 铁律

```
文件不经应用服务器中转，直传对象存储
附件用双表索引（uploads 临时态 + attachments 归档态）
业务提交先写 uploads 后写业务表（顺序不可反）
归档去重靠 md5，不靠文件名
读取走 CDN 优先，私有文件才走预签名
```

凭"先存本地再传 OSS 省事"、"一张表够用了干嘛搞两张"、"先写业务表再补 uploads 记录"的直觉做事——全部是在给未来埋雷。

---

## 6 阶段生命周期

一个文件从用户选择到最终被读取，经历 6 个阶段。每个阶段有明确的状态转移和数据流。

### 阶段 1：请求上传 URL

前端向后端请求一张上传票据（UploadTicket）。后端生成全局唯一的 `filename`（uuid + 原始扩展名），向对象存储申请预签名 URL 或 PostObject 表单，连同上传约束一起返回。

**数据流**：前端 → 后端 `GET /upload/ticket` → 对象存储 SDK → 返回 UploadTicket → 前端

**状态**：uploads 表写入一条记录，`status = 1`（待上传）

```
请求入参：directory（归档目录）、filename（原始名，仅用于取扩展名）、expireSeconds
后端动作：
  1. 生成新文件名：uuid + ext（如 a1b2c3...e9.png）
  2. uploads 表插入记录（status=1, expire_seconds=N）
  3. 调 storage.uploadTicket(directory, filename, expireSeconds, policy)
  4. 返回 UploadTicket
```

### 阶段 2：前端直传

前端拿到票据后，**直接**把文件 PUT/POST 到对象存储。请求不经过应用服务器，不经负载均衡的业务端口，只走对象存储的入口。

- `uploadMethod = PUT`：用预签名 URL，请求体是文件二进制
- `uploadMethod = POST`：用 PostObject 表单，`uploadFormData` 是表单字段（含 policy 签名）

**数据流**：前端 → 对象存储（PUT/POST）→ 对象存储返回成功

**状态**：对象存储里有了 temp 文件，但 uploads 表 `status` 仍是 1（后端此时不知道前端传没传完）

### 阶段 3：业务提交（commit）

前端上传完成后，把 `filename` 随业务请求一起提交给后端。后端调 `commit(filename)`，将 uploads 表的 `status` 从 1 改成 2（已上传），并把 filename 关联到业务表。

**数据流**：前端 → 后端业务接口 → commit() → uploads 表更新 + 业务表写入

**状态**：`status 1 → 2`

**这一步必须先写 uploads 再写业务表**，原因见下文"commit 顺序铁律"。

### 阶段 4：归档去重（后台）

后台进程 `ArchiveProcess` 定期扫描 `status = 2` 的记录。对每条记录：
1. `HEAD` 取对象元信息，拿到 md5、mime_type、size
2. 查 attachments 表有没有相同 md5 的归档记录
3. **命中**（已存在同 md5）：调业务钩子 `renameFilename(old, new)` 把业务表里的 filename 改成已归档的那份，temp 文件删除
4. **未命中**：copy temp 文件到正式归档目录，attachments 表插入新记录
5. uploads 表 `status 2 → 3`（已归档）

**数据流**：后台进程 → HEAD temp → 查 attachments → copy 或改名 → 状态推进

**状态**：`status 2 → 3`

去重发生在这一步，不在上传时——因为上传时文件还没传完，拿不到 md5；传完了也要异步处理，不能阻塞业务提交。

### 阶段 5：清理（后台）

两个清理进程并行工作：

- **UploadCleanupProcess**：定期删 uploads 表里过期的 temp 文件（`status` 还停在 1 或 2 但 `expire_seconds` 已超时的记录），删对象存储里的 temp 对象 + 删表记录
- **AttachmentCleanupProcess**：定期删 attachments 表里无业务引用的归档文件，删前调业务钩子 `shouldDeleteAttachment(record)` 让项目端确认"这个文件确实没人用了"

**数据流**：后台进程 → 扫过期/无引用记录 → 删对象存储对象 → 删表记录

### 阶段 6：读取

读取走双表查询：先查 attachments 表（已归档），查不到再查 uploads 表（过渡期还没归档）。拿到记录后：
- 公开归档目录（`isPublicArchiveDirectory` 返回 true）→ 返回 CDN URL
- 私有文件 → 返回带过期时间的预签名 URL

**数据流**：后端 → 查 attachments / uploads → 拼 CDN 或预签名 URL → 返回前端

---

## 双表索引

附件系统用两张表分工，**不要合并成一张**。两张表的生命周期、查询模式、清理策略都不同，合并会导致 temp 垃圾污染归档索引、归档去重查询变慢。

### uploads 表（临时上传记录 + 状态机）

| 字段 | 说明 |
|------|------|
| `filename` | uuid + ext，全局唯一路由键 |
| `disk` | 存储盘标识（public/private 等多盘配置） |
| `status` | 1 待上传 / 2 已上传 / 3 已归档 |
| `expire_seconds` | temp 文件有效期，超时由 UploadCleanup 清理 |

这张表是**临时态**，记录会随清理进程不断被删。查它只发生在"刚上传完还没归档"的过渡期。

### attachments 表（归档去重索引）

| 字段 | 说明 |
|------|------|
| `filename` | 归档后的正式文件名（可能因去重命中换成已存在的那份） |
| `md5` | 内容指纹，去重的唯一依据 |
| `mime_type` | MIME 类型 |
| `size` | 字节数 |
| `archive_directory` | 归档目录（业务隔离用） |

这张表是**长期态**，记录长期保留，是读取的主入口。md5 上必须有索引——归档去重靠它查命中。

### 为什么不能合成一张

| 单表方案的坑 | 双表如何避免 |
|-------------|-------------|
| temp 垃圾和归档索引混在一起，查询慢 | temp 在 uploads 随时清，归档在 attachments 稳定 |
| 去重查询要在全表扫 md5 | attachments 表只存归档记录，扫的范围小 |
| 状态机字段（expire_seconds）污染归档语义 | 两表各管各的字段，语义清晰 |

---

## 四大接口契约

组件框架与项目端、组件框架与对象存储之间通过四个接口解耦。组件定义接口，对象存储 Adapter 和项目端各自实现。

### 接口 1：存储抽象（StorageInterface）

附件专用的存储抽象，**不是通用 Flysystem**。关键区别：所有方法都是 `directory + filename` 两参模型，不是单 `path` 参数。因为附件系统需要把"归档目录"和"文件名"分开管理——归档目录决定 CDN 路由和清理策略，文件名是全局唯一路由键。

```
interface StorageInterface:
    // 签发上传
    uploadUrl(directory, filename, expireSeconds) → string
    uploadTicket(directory, filename, expireSeconds, policy?) → UploadTicket

    // 读取访问
    accessUrl(directory, filename, isPublic, expireSeconds) → string

    // 元信息（归档去重用）
    head(directory, filename) → ObjectMeta { md5, mimeType, size }

    // 对象操作
    copy(from, to), exists(directory, filename)
    get(directory, filename) → stream
    put(directory, filename, content)
    delete(directory, filename)
```

**ObjectMeta 是归档去重的输入**：`head()` 拿到 md5，归档进程据此查 attachments 表命中。

### 接口 2：uploads 表仓储（UploadRepositoryInterface）

封装 uploads 表的 CRUD，隔离存储细节。commit 状态推进、清理扫描都走这个接口。

```
interface UploadRepositoryInterface:
    create(filename, disk, expireSeconds) → UploadRecord      // 插入 status=1
    findByFilename(filename) → UploadRecord?
    updateStatus(filename, newStatus)                          // 1→2→3 推进
    findExpired(now) → UploadRecord[]                         // 清理进程扫过期
    delete(filename)                                           // 清理时删表
```

### 接口 3：attachments 表仓储（AttachmentRepositoryInterface）

封装 attachments 表的 CRUD，归档去重查询的主入口。md5 查询必须走这个接口。

```
interface AttachmentRepositoryInterface:
    findByMd5(md5) → AttachmentRecord?                         // 去重命中查询
    findByFilename(filename) → AttachmentRecord?
    create(filename, md5, mimeType, size, archiveDirectory)    // 归档新增
    findUnreferenced() → AttachmentRecord[]                    // 清理进程扫无引用
    delete(filename)                                           // 清理时删表
```

### 接口 4：业务钩子（AttachmentBusinessHookInterface）

组件框架不能预知项目端的业务表结构，所以用钩子接口让框架反向调用项目端。这是依赖倒置——框架定义接口，项目端实现，框架在关键节点回调。

```
interface AttachmentBusinessHookInterface:
    // 归档去重命中时，框架通知项目端把业务表里的 filename 改成已归档的那份
    renameFilename(oldFilename, newFilename)

    // 清理归档文件前，框架问项目端"这个文件还有人引用吗"
    shouldDeleteAttachment(record) → bool

    // 读取时，框架问项目端"这个归档目录走 CDN 还是预签名"
    isPublicArchiveDirectory(directory) → bool
```

**三个钩子覆盖三个关键决策点**：去重改名、清理引用检查、读取 URL 策略。项目端实现这三个方法，框架就能完整运转。

---

## 上传票据（UploadTicket）

票据是阶段 1 后端返回给前端的全部信息，前端凭它就能独立完成直传，不需要再问后端任何东西。

| 字段 | 说明 |
|------|------|
| `filename` | 后端生成的 uuid + ext，后续业务提交原样回传 |
| `uploadUrl` | POST 表单 URL 或 PUT 预签名 URL |
| `uploadMethod` | `POST` 或 `PUT` |
| `uploadFormData` | POST 时的表单字段（含 policy 签名、key 等） |
| `contentType` | 文件 MIME 类型，PUT 时设到请求头 |

**设计要点**：票据是一次性的、带过期时间的、自包含的。前端拿到后如果过期了，重新申请一张，不要复用旧的。

## 上传约束（UploadPolicy）

约束映射对象存储的 PostObject policy 机制，在后端签发票据时就嵌入签名，前端无法绕过。

| 字段 | 说明 |
|------|------|
| `minSizeBytes` | 最小字节数 |
| `maxSizeBytes` | 最大字节数 |
| `allowedContentTypes` | 允许的 MIME 类型白名单 |
| `excludedContentTypes` | 排除的 MIME 类型黑名单 |

**约束由对象存储强制执行**，不是后端在 commit 时才检查——那时文件已经传上去了。在签发票据时就用 policy 锁死，前端传超大文件或非法类型时对象存储直接拒绝。

---

## commit 顺序铁律

```
业务提交时：先写 uploads 表（status 1→2），再写业务表
```

**反过来（先业务表后 uploads）会导致孤儿被清理**：

- 假设先写了业务表，filename 已经关联到业务记录
- commit uploads 之前进程崩了，uploads 的 status 还停在 1
- UploadCleanupProcess 扫到这条过期记录，删了 temp 文件 + 删了 uploads 记录
- 业务表里的 filename 成了悬空引用，读取时找不到文件

**先 uploads 后业务表则安全**：uploads 先确认"这个文件已上传、已登记"，业务表再引用它。即使中间崩了，uploads 记录还在，清理进程不会误删（status=2 且未过期的不删），重试 commit 就能恢复。

---

## 域名三层分离

对象存储涉及三个不同用途的域名，**不要混用一个**：

| 域名 | 用途 |
|------|------|
| `endpoint` | SDK 操作（签发预签名、HEAD、copy 等） |
| `access_domain` | OSS 直连上传 + 读取备选 |
| `accelerate_domain` | CDN 读取，最高优先级 |

读取 URL 的选择顺序：`accelerate_domain`（CDN）> `access_domain`（OSS 直连）> `endpoint`（SDK 拼）。公开归档目录优先 CDN，私有文件才走预签名。

---

## 3 个后台进程

三个进程各管一段生命周期，用环境变量独立启用（如 `PROC_ATTACHMENT_ARCHIVE=1`），互不依赖：

| 进程 | 周期 | 职责 |
|------|------|------|
| `ArchiveProcess` | 30s | 扫 `status=2` 的 uploads，HEAD 取 md5，查 attachments 去重，copy 或改名，推进 `status 2→3` |
| `UploadCleanupProcess` | 60s | 删 uploads 表里过期的 temp 文件（status 停在 1/2 且超时） |
| `AttachmentCleanupProcess` | 5min | 删 attachments 表里无业务引用的归档文件，删前调 `shouldDeleteAttachment` 确认 |

**周期不同是有意的**：归档要快（用户等着文件可读），temp 清理中等（给前端上传留余量），归档清理慢（引用检查开销大、低频即可）。

> 三个进程用各语言的定时任务/守护进程机制实现（如 goroutine + ticker、定时任务进程、worker pool），进程划分、周期、职责保持一致，不要合并成一个进程。

---

## 通用场景举例

| 场景 | 归档目录 | 说明 |
|------|---------|------|
| 用户头像 | `avatars` | 公开目录，CDN 读取；小图但频次高，去重收益大（默认头像重复上传） |
| 订单附件 | `order-attachments` | 私有目录，预签名读取；需 `shouldDeleteAttachment` 检查订单是否仍引用 |
| 文档上传 | `documents` | 大文件，`maxSizeBytes` 设大；归档去重节省存储效果显著 |

---

## Good / Bad

| Good | Bad |
|------|-----|
| 前端直传 OSS，应用服务器不碰文件流 | 文件先传到后端再转存 OSS |
| uploads + attachments 双表索引 | 合成一张表，temp 和归档混在一起 |
| commit 先 uploads 后业务表 | 先业务表后 uploads（孤儿风险） |
| 归档去重用 md5 查 attachments | 用文件名判断是否重复 |
| 上传约束在签票据时用 policy 锁死 | commit 时才校验文件大小/类型 |
| StorageInterface 用 directory + filename 两参 | 用单 path 参数（丢失目录语义） |
| 业务钩子让框架反调项目端 | 框架里硬编码项目业务表名 |
| 公开目录走 CDN，私有走预签名 | 所有文件都走预签名（CDN 白用了） |
| 3 个后台进程独立启用、周期不同 | 一个进程扫所有事（周期无法分别调） |

---

## 红旗 - 停下重新评估

- 准备在后端接收文件二进制再转存对象存储（违反直传）
- 准备用一张表存所有附件记录（违反双表）
- 准备先写业务表再补 uploads 记录（违反 commit 铁律）
- 用文件名做去重依据（同内容不同名/同名不同内容都会出错）
- commit 时才校验文件大小和类型（文件已传完，浪费带宽）
- StorageInterface 用单 path 参数（和通用 Flysystem 混淆）
- 所有文件统一走预签名 URL（公开文件没用上 CDN）
- 后台归档和清理合成一个进程（周期和策略无法独立调整）
- 业务表里直接存对象存储的完整 URL（URL 会过期，应存 filename 运行时拼）

---

## 防止合理化

| 借口 | 现实 |
|--------|---------|
| "先传后端再转存省事，直传太复杂" | 复杂一次，省下的是每台机器的带宽和内存 |
| "一张表够用了，两张表 JOIN 麻烦" | 两张表本来就不 JOIN，各管各的生命周期 |
| "先业务表后 uploads，回头补就行" | 回头 = 崩了就补不了，孤儿文件就是这么来的 |
| "文件名够用，md5 多余" | 同内容不同名 = 重复存储；同名不同内容 = 误命中 |
| "commit 时校验更可控" | 那时文件已经传完，带宽和存储都浪费了 |
| "用通用 Flysystem 的单 path 接口更省心" | 附件系统需要 directory 语义做 CDN 路由和清理，单 path 丢失这个 |
| "业务表存完整 URL 读取快" | URL 会过期，存 filename 运行时拼才稳定 |
| "公开文件也走预签名，安全" | 公开文件走 CDN 又快又省，预签名反而慢 |
| "先简单实现一个单表的" | 单表是反模式的起点，照样要推倒重来；按本范式一次到位 |

---

## 何时触发

**以下场景必须按本范式设计：**

- 新项目需要文件/附件上传功能
- 现有上传功能要改造为直传对象存储
- 设计附件归档、去重、清理机制
- 跨模块/跨业务做统一的附件管理库
- 排查附件丢失、孤儿文件、重复存储、上传慢等问题

**不触发：**

- 只读现有附件代码、查资料（没在设计/实现）
- 单次脚本传个文件（不是系统化的附件管理）
- 纯前端文件预览/裁剪（不涉及后端存储架构）

---

## 底线

**文件不经应用服务器，索引用双表，提交先 uploads 后业务表。**

直传省带宽，双表分清生命周期，commit 顺序防孤儿，md5 去重防冗余。这四条是附件系统的地基，任何一条让步都会在流量上来时塌方。

四大接口契约（StorageInterface / UploadRepositoryInterface / AttachmentRepositoryInterface / AttachmentBusinessHookInterface）跨语言保持一致，只换实现语言，不要因语言差异擅自简化双表或直传架构。

这是不可协商的。
