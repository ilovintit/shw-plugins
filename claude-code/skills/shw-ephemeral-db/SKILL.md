---
name: shw-ephemeral-db
description: 需要连真实数据库才能跑的代码生成类命令（gf gen dao、ORM introspect/反向生成等），统一用一次性数据库容器：起容器 → 跑全量迁移 → 执行生成 → 无条件销毁。禁止连共享 dev/test/生产库生成，禁止本机长寿实例。用户提到 gf gen dao、gen model、introspect、db pull、反向生成、DAO/Entity 重新生成、本地没数据库跑不了生成命令时触发。
---

**执行前置**：先读 [适用模式与权限](../shw-issue-gate/SKILL.md)。仅修改当前已确认项目工作目录；项目外只读，未知修改不得覆盖。涉及写入先按 [工作区能力契约](../shw-workspace/SKILL.md) 确认所有权，不强制依赖本地 worktree 插件。

# 一次性数据库容器跑代码生成

## 模式前置

本 Skill 不是所有项目的默认约束。先读取仓库根 `.shw/project.yaml` 的模式：无标识时不主动应用；`issue-main` / `issue-dev` 只保留轻量 Issue 闭环；只有 `managed` 才应用本 Skill 对镜像口径、迁移入口和交付核对的完整要求。模式定义见 `shw-issue-gate/project-mode.md`。

## 适用场景

只针对**必须连上一个真实且 schema 已到位的数据库才能执行**的命令——它们读的是库里的表结构，不是代码：

| 栈 | 典型命令 |
|----|---------|
| Go / GoFrame | `gf gen dao`（读表生成 dao / model/entity / model/do） |
| PHP / Hyperf | `php bin/hyperf.php gen:model` |
| Node / Prisma | `prisma db pull`（introspect） |
| Java | jOOQ codegen、MyBatis Generator |
| 其他 | 任何 introspect / 反向生成 / schema diff 类命令 |

**不适用**：不连库就能跑的生成（`gf gen service`、`sqlc generate`、protobuf、前端类型生成），以及正常的单元/集成测试——快速测试和集成回归均按 `shw-backend-stack` 的 per-run services 走，不用本流程。

## 铁律

1. **禁止连共享库生成**：dev / test / 生产库，以及别人本机的库，一律不作为生成数据源。共享库的 schema 不等于当前分支迁移后的 schema，用它生成 = 把别的分支的表结构提交进本分支。
2. **禁止本机长寿实例**：不为了"下次还要用"留一个常驻数据库。长寿实例会累积残库、端口互踩，并且没人记得它上次迁移到哪一版。
3. **空库 + 全量迁移 = 确定性状态**：生成的唯一合法数据源，是一个全新空库跑完当前分支全部迁移后的结果。跳过迁移、只跑增量迁移、手工 `CREATE TABLE` 补表都不算。
4. **无条件销毁**：命令成功、失败、中断，容器都必须销毁；卷和临时配置一并清掉。

## 前置检查（按顺序，任一不满足就停止报告，不降级）

1. 容器运行时可用（`docker info` 或等价命令返回成功）。不可用时停止并报告，**不要**退回连共享库。
2. 数据库口径与镜像引用按 `shw-backend-stack`：PostgreSQL 18，使用已验证的内部引用或 `@sha256:<digest>`，不现拉公网 latest。
3. 项目存在可重复执行的**全量迁移入口**（GoFrame 项目通常是二进制的 `migrate` 子命令，见 `shw-goframe-conventions` 的 gcmd 子命令树）。没有全量迁移入口时先停止——那是比生成命令更靠前的问题。

## 执行流程

### 1. 起容器

- 容器名带 Issue 编号和随机后缀，便于识别与兜底清理：`shw-gen-<issue>-<rand>`。
- **端口交给 Docker 随机分配并只绑回环**：`-p 127.0.0.1::5432`，起来后用 `docker port` 读回实际端口。固定 5432 会和本机既有实例互踩。
- 数据目录用 tmpfs（`--tmpfs /var/lib/postgresql/data`）：本来就不需要持久化，走内存还更快。
- 凭据用一次性随机值，只存在于当前 shell 环境，**不写进仓库任何文件**。

### 2. 等就绪

轮询 `pg_isready`（或对应健康命令），**必须带超时上限**（例如 60 秒）。超时即失败退出并销毁容器，不无限等待。空 PostgreSQL 实例含 initdb 通常 3~8 秒就绪。

### 3. 跑全量迁移

用项目自己的迁移入口，对空库跑**全量**。迁移失败就停止——此时生成出来的 DAO 一定是残缺的，继续跑只会把错误结果提交。

### 4. 执行生成命令

连接参数**经环境变量注入**，不改仓库里已提交的配置文件。

- GoFrame：`gfcli.gen.dao` 的 link 支持配置文件里写环境变量占位，或临时用工作区内 gitignored 的覆盖配置，结束即删。
- 任何情况下都不把临时端口、临时密码写进 `config.yaml`、`.env.example` 等会被提交的文件。误改了就在提交前还原。

### 5. 销毁

用 `trap ... EXIT` 挂清理，保证中断（Ctrl-C、脚本报错、命令失败）也执行。收尾再确认一次没有残留容器。

### 模板加载

需要 shell 执行模板时，执行前读取 [生成容器模板](references/generation-template.md)，按项目真实迁移与生成命令替换占位符。

## 生成后核对（不做等于没跑）

- `git status` / `git diff` 只应出现**预期的生成目录**（GoFrame：`internal/dao/`、`internal/model/entity/`、`internal/model/do/`）。出现配置文件、迁移文件改动说明临时参数漏回滚。
- 表缺失、字段对不上 → 是迁移不全，回去修迁移再整轮重跑，**不要手改生成文件**（它们带 DO NOT EDIT）。
- 生成的 entity 只作 DB 映射，业务层仍用手写领域实体——归属规则见 [DAO 与实体规范](../shw-goframe-conventions/references/dao-entities.md)。
- 按 `shw-verify`，声称完成前附上真实命令输出（迁移成功行、生成命令输出、`docker ps -a` 无残留）。

## 常见错误（禁止）

- ❌ 本机没库就连 dev/test 库跑 `gf gen dao` → schema 漂移，生成结果不属于本分支。
- ❌ 留一个常驻本地 postgres 反复用 → 没人知道它迁移到第几版；端口与库名互踩。
- ❌ 跳过迁移直接生成 → 空库生成出空 DAO，或旧数据目录生成出旧结构。
- ❌ 只跑增量迁移 / 手工建表补差 → 破坏"空库 + 全量迁移"的确定性。
- ❌ 固定 `-p 5432:5432` → 撞本机既有实例；用随机端口 + 只绑 127.0.0.1。
- ❌ 把临时连接串、密码写进会提交的配置文件 → 泄漏 + 污染仓库。
- ❌ 生成命令失败后留着容器"下次接着查" → 必须销毁，重跑成本只有几秒。
- ❌ Docker 不可用时降级连共享库 → 停止并报告。

## 与其他 skill 的分工

- 数据库/镜像口径、CI per-run services → `shw-backend-stack`
- `gf gen dao` 配置、DAO/Entity 归属、`migrate` 子命令入口 → `shw-goframe-conventions`
- 完成前的证据要求 → `shw-verify`
- 文件写入边界 → `shw-issue-gate`
