---
name: shw-backend-stack
description: 后端基础设施技术栈选型规范（公司口径固定，禁止 agent 自由发挥）。固定选型：数据库=PostgreSQL 18、缓存=Valkey、对象存储=silo（MinIO 停更后由 Pigsty 社区续维护的 fork）。新项目初始化、引入依赖、中间件/数据库/缓存/对象存储选型、写 CI services 配置、写代码示例/文档/对比表时调用；用户提到 MySQL、Redis、MinIO、PostgreSQL、PG、Valkey、silo、对象存储、中间件、技术栈选型时自动触发。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# 后端基础设施技术栈选型规范

## 概述

本 skill 是公司后端基础设施的**固定选型口径**——选型即裁决，不是建议。任何场景（新项目初始化、依赖引入、CI 配置、文档与示例写作）都不得引入口径外的同类替代品。

**示例同权**：写代码示例、文档、对比表、CI services 配置时同样必须用本口径。示例里出现 MySQL / Redis / MinIO 不是"随便举例"，而是选型漂移的起点——惯性会把旧栈写进新工程，读者会照抄。

## 固定选型总表

| 领域 | 固定选型 | 禁用的替代 |
|------|---------|-----------|
| 数据库 | **PostgreSQL 18** | MySQL、MariaDB、生产环境 SQLite |
| 缓存 | **Valkey** | Redis（新引入） |
| 对象存储 | **silo** | MinIO（官方已停更） |

一句话背景（为什么是它们）：

- **PostgreSQL 18**：公司现行数据库裁决，全栈统一。
- **Valkey**：Redis 许可证转向后由 Linux Foundation 托管的社区 fork，RESP 协议兼容，既有客户端与生态照用。
- **silo**：MinIO 官方 2025 年收缩社区版、转向维护模式后，由 Pigsty（PGSTY）社区 fork 续维护的版本——AGPLv3、S3 API 兼容、带 Web 管理控制台。

## PostgreSQL 18

### 官方资料

- 官网与文档：<https://www.postgresql.org/docs/18/>
- 版本政策：<https://www.postgresql.org/support/versioning/>

### 口径

- 主版本固定 18，小版本随安全更新。
- Go/GoFrame 项目经 GoFrame 的 pgsql 驱动组件接入（落地细节见 `shw-goframe-conventions`）；其他语言用官方推荐驱动。

### 运行形态

- **本地开发**：连共享实例，库按 Issue / 环境做逻辑隔离（分支 `feat/12-slug` → 库名带 issue 号，从分支名可确定性推导）。
- **CI**：per-run services 容器（见下文），禁共享长寿实例跑测试。

## Valkey

### 官方资料

- 官网与文档：<https://valkey.io/>
- GitHub：<https://github.com/valkey-io/valkey>

### 口径

- RESP 协议兼容 Redis：服务端换 Valkey，客户端 SDK 无需更换。
- 逻辑库仅 16 个（db index 0-15）：跨 Issue / 跨环境的逻辑隔离**优先 key 前缀**，db index 只留给少数强隔离场景——两个分支撞同一 index 就是 key 互踩。
- 若缓存里承载队列 / 会话类有状态数据，共享实例意味着跨分支可见，dev 环境通常可容忍但要有意识。

## silo

### 官方资料（必记链接）

- 官网 / 文档：<https://silo.pgsty.com/>
- GitHub 仓库：<https://github.com/pgsty/silo>
- 配套客户端（MinIO Client `mc` 的续维护 fork）：<https://github.com/pgsty/mc>
- 背景文章（Pigsty 作者）：<https://vonng.com/en/db/long-live-silo/>

### 口径

- **S3 API 兼容**：既有 S3 SDK / 客户端代码无需改动，端点指向 silo 即可。
- 项目经公司 lib 附件组件使用对象存储的，底层随公司口径切换，组件用法查 lib 仓库文档（`shw-lib-docs` 指路）；直连 S3 API 的场景把端点配置指向 silo。
- 存量 MinIO 按迁移对待：S3 兼容使切换成本主要是端点与凭证，不重写代码。

## CI 中间件形态（per-run services）

workflow 的 `services:` 块按下表起依赖，健康检查就绪前测试步骤不开跑：

| 中间件 | 镜像 | 健康检查 | 空实例就绪耗时 |
|--------|------|---------|---------------|
| PostgreSQL 18 | `postgres:18-alpine` | `pg_isready` | 3~8 秒（含 initdb） |
| Valkey | `valkey/valkey` | `valkey-cli ping` | 1~2 秒 |

- 每次 run 全新容器、独立网络命名空间：端口零冲突、库名零腾挪、run 结束随 job 销毁零清理。空库 + 全量迁移 = 确定性干净状态，测试可复现。
- **禁共享长寿实例跑 CI 测试**——那会重新引入按 run 建库、崩残库清理、并行 run 互踩的全套问题。
- 真正值得缓存的是构建链（Playwright 浏览器、node_modules、Go module cache），不是中间件实例。
- E2E / VRT 需要对象存储时按 silo 部署形态决定：可容器化则并入 services；公司统一长驻实例则测试连它并按桶 / 前缀隔离，或对纯业务用例 mock 附件组件。

## 未定项（禁止自行选定）

以下领域本 skill **未固定口径**，遇到选型需求时 MUST 问用户，不得自行引入：

- 消息队列（Kafka / RabbitMQ / RocketMQ / ...）
- 搜索引擎（Elasticsearch / Meilisearch / ...）
- 时序库、图数据库、分布式任务调度等同类基础设施

## 与其他 skill 的分工

- 前端选型 → `shw-frontend-stack`
- 框架内落地（分层 / DI / 错误处理）→ `shw-goframe-conventions` / `shw-hyperf-conventions`
- 公司组件用法 → `shw-lib-docs` 指路
- 端口登记 → `shw-port-manager`

## 常见错误（禁止）

- ❌ 示例 / 文档 / CI 配置里写 MySQL / Redis / MinIO → 惯性泄漏，一律 PostgreSQL 18 / Valkey / silo。
- ❌ 新项目引入 MySQL，或生产环境用 SQLite → 数据库固定 PostgreSQL 18。
- ❌ 新工程引入 Redis 服务端 → Valkey（协议兼容，换服务端即可，客户端不用动）。
- ❌ 新工程部署 MinIO → 官方已停更，用 silo。
- ❌ 缓存隔离全靠 db index → 逻辑库仅 16 个，优先 key 前缀。
- ❌ CI 复用共享长寿中间件实例 → per-run services。
- ❌ 未定领域（消息队列等）自行选型 → 必须问用户。
