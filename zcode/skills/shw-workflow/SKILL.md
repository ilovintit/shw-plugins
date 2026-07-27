---
name: shw-workflow
description: 8 步模块开发工作流知识库 - DB迁移→API测试→API实现→前端→综合调整→E2E/VRT→业务审核→收尾。执行涉及多 step 联动的 task 时按需加载。含 PHP+Hyperf+Taro 技术栈模板。
---

# 8 步模块开发工作流

本 skill 是模块开发工作流的**单一真相源**。通用 8 步框架适用任何 spec-driven+TDD 项目；技术栈模板默认基于 PHP+Hyperf+Taro（项目特定字段用 `{{占位符}}` 标记）。

agent 在需要时加载本 skill，把内容落地到项目级 `AGENTS.md`，让主 Agent 自动加载。

---

## 第一部分：通用 8 步框架（适用任何 spec-driven+TDD 项目）

### 概述

模块开发的标准 8 步工作流，涵盖从 DB 迁移设计到模块收尾的完整流程。**每步对应一个 change**，有明确的交付物和门禁条件，通过后才能进入下一步。步骤 5 和步骤 7 为循环步骤，可多次迭代直至满足条件。

### 八步流程总览

```
┌───────────────────────────────────────┐
│ Step 1: DB 迁移设计                    │
│ change: {module}-migration            │
│ deliverable: migrations/*.php         │
│ gate: 可正常 migrate、无外键           │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ Step 2: API 测试用例编写 + 业务审查     │
│ change: {module}-api-tests            │
│ deliverable: *Test.php                │
│ gate: 审查通过 + 99%覆盖 + 全失败      │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ Step 3: API 源代码                     │
│ change: {module}-api-impl             │
│ deliverable: Module/四层代码           │
│ gate: Step 2 100% 通过                │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ Step 4: 前端初版                       │
│ change: {module}-frontend-v1[-{端}]   │
│ deliverable: pages/ + api/*.ts        │
│ gate: CRUD + tsc + PM2 不崩           │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ Step 5: 综合调整 (循环)                │
│ change: {module}-frontend-polish-{seq}│
│ deliverable: UI 联调全链路修复          │
│ gate: UI 满意 + 全绿                  │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ Step 6: E2E + VRT 测试用例             │
│ change: {module}-e2e-vrt-tests        │
│ deliverable: flow.ts + visual.ts      │
│ gate: E2E + VRT 全绿                  │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ Step 7: 业务审核 (循环)                │
│ change: {module}-qa-review-{seq}      │
│ deliverable: 业务审核 9 维度通过       │
│ gate: 9 维度通过 + 测试全绿            │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│ Step 8: 模块收尾                       │
│ 无独立 change                         │
│ deliverable: 归档 + 更新依赖图         │
│ gate: 所有 change 归档 + 依赖图已更新  │
└───────────────────────────────────────┘
```

### 各步骤定义

| Step | 名称 | change 命名 | 核心交付物 | 门禁条件 |
|------|------|------------|-----------|---------|
| 1 | DB 迁移设计 | `{module}-migration` | `migrations/*.php` | 迁移文件可正常 migrate、符合无外键约定 |
| 2 | API 测试用例编写 + 业务审查 | `{module}-api-tests` | `*Test.php` | 用户业务审查通过 + 测试覆盖 99% 场景 + 全部失败（实现未写，预期）+ 形式合规自检通过 |
| 3 | API 源代码 | `{module}-api-impl` | Module 四层代码 | Step 2 的测试用例 100% 通过 |
| 4 | 前端初版 | `{module}-frontend-v1[-{端}]` | pages/ + api/*.ts | 接通 API + 走通 CRUD + type-check + PM2 启动不崩 |
| 5 | 综合调整（循环） | `{module}-frontend-polish-{seq}` | UI 联调触发的全链路修复 | 用户对前端 UI 满意 + 所有被触及层的测试仍全绿 |
| 6 | E2E + VRT 测试用例 | `{module}-e2e-vrt-tests` | flow.ts + visual.ts + 首次基线 | E2E + VRT 全绿 |
| 7 | 业务审核（循环） | `{module}-qa-review-{seq}` | 按用户业务意见修订测试用例 | 用户确认 E2E/VRT 业务审核 9 维度通过 + 测试仍全绿 |
| 8 | 模块收尾 | 无独立 change | 归档 + 更新依赖图 | 当前模块所有未归档 change 归档 + 更新模块依赖图 |

### Step 4 多端拆分约定

一个业务模块可能涉及多个前端目标端。Step 4 的 change 拆分遵循以下原则：

- **每端一个独立 change**：`{module}-frontend-v1-{端}`
- **按模块需求选择端**：不是所有模块都需要全部端，按业务需求选择涉及的端
- **端的开发顺序**：按业务优先级和依赖关系排列，通常先 PC 端再移动端
- **每端独立满足 gate 条件**：接通 API + 走通 CRUD + type-check + PM2 不崩

### Step 5 综合调整 - TDD 回卷链

Step 5 由人工 UI 联调触发，针对前端联调发现的问题按根因层级依次修复。**禁止跳过测试用例的硬约束：必须先改测试锁定期望行为，再改源代码。**

| 根因层级 | 修复链（按顺序） |
|---------|----------------|
| DB 设计缺陷 | migration → API 测试用例 → API 源代码 → 前端 |
| API 行为问题 | API 测试用例 → API 源代码 → 前端 |
| 前端 bug | 仅前端 |

polish change 内部 task 分节标注规范：`[migration]` / `[api-test]` / `[api-impl]` / `[frontend]`

### Step 7 业务审核清单（9 维度）

业务审核从以下 9 个维度检查 E2E/VRT 测试用例对业务需求的覆盖完整性：

| # | 维度 | 审核点 |
|---|------|--------|
| 1 | 业务流程覆盖 | 模块 spec 声明的核心业务流程，是否有对应 E2E flow 覆盖 |
| 2 | 状态流转完整性 | 实体状态机的业务流转是否在 E2E 中走完整链路 |
| 3 | 业务边界场景 | 业务意义上的边界场景是否在 E2E 中覆盖（空列表态、错误态、权限拒绝态） |
| 4 | 关键页面视觉完整 | VRT 是否覆盖了模块所有关键页面状态（初始态、数据态、错误态、加载态） |
| 5 | 跨实体业务联动 | 涉及多实体联动的业务场景是否有 E2E 覆盖 |
| 6 | 多端业务隔离 | 不同端登录后看到的业务数据范围是否在 E2E 中验证 |
| 7 | 业务回归保障 | VRT 基线是否反映了正确的业务数据状态（非占位数据） |
| 8 | 业务时序编排 | 涉及时序的业务流程是否在 E2E 中编排正确 |
| 9 | 业务异常恢复 | 业务异常路径的 E2E 覆盖（表单校验失败、网络错误、权限变更兜底） |

**形式合规**（断言精度、文件命名、Playwright 用法、Scenario 编号等）由 Agent 按测试目录的 AGENTS.md 自动满足，不进入本审核范围。

### change 命名规范

格式：`{module}-{phase}[-{seq}]`

| 字段 | 规则 |
|------|------|
| `module` | 小写连字符（如 `admin`, `order`, `case-module`） |
| `phase` | 固定枚举：`migration` / `api-tests` / `api-impl` / `frontend-v1` / `frontend-polish` / `e2e-vrt-tests` / `qa-review` |
| `seq` | 仅 `frontend-polish` 和 `qa-review` 必带，从 1 递增 |

**示例**：order 模块完整流程
```
order-migration
  → order-api-tests
  → order-api-impl
  → order-frontend-v1-platform-pc
  → order-frontend-v1-client-mobile
  → order-frontend-polish-1
  → ...
  → order-e2e-vrt-tests
  → order-qa-review-1
  → ...
```

### 每步完成判定

完成判定满足后 **MUST 归档对应 change**。

| Step | 完成判定 |
|------|---------|
| 1 | 迁移文件可正常 migrate、符合无外键约定 |
| 2 | 用户业务审查通过 + 测试覆盖 99% 场景 + 测试全部失败（实现未写，预期）+ 形式合规自检通过 |
| 3 | Step 2 的测试用例 100% 通过 |
| 4 | 接通 API、走通一次完整 CRUD + type-check 通过 + PM2 启动不崩 |
| 5 | 用户对前端 UI 满意 + 所有被触及层的测试仍全绿 |
| 6 | E2E + VRT 全绿 |
| 7 | 用户确认 E2E/VRT 业务审核 9 维度通过 + 测试仍全绿 |
| 8 | 当前模块所有未归档 change 归档 + 更新模块依赖图 |

---

## 第二部分：PHP+Hyperf+Taro 技术栈模板（项目特定字段用占位符）

> agent 加载本 skill 生成项目级 AGENTS.md 时，会读取本部分并提示用户填充 `{{占位符}}` 字段。

### 项目概述

- **项目名**：{{project_name}}
- **服务列表**：{{services}}（示例：平台 PC / 业务 PC / 平台移动端 / 客户端 C 端 / API 后端 / AI 连接器 / 数据大屏）
- **仓库地址**：{{repo_url}}

### 技术栈

| 层 | 技术 |
|---|------|
| 后端 | PHP 8.3 + Hyperf 3.1 (Swoole) |
| 测试 | PHPUnit + Hyperf Testing |
| 前端 | Taro 4.x (Vue 3 + TS + Webpack5) |
| 前端组件库 | {{component_lib}}（示例：自研 / @xxx/taro-ui） |
| **Node.js** | **nvm 管理的 v24.x（禁止使用系统默认 Node 26）** |
| 包管理 | pnpm workspace |
| 数据库 | PostgreSQL（不是 MySQL） |
| 缓存 | Redis |
| API 响应格式 | `{ code: number, message: string, data?: T }` |

> Taro 4.x + Webpack5 在 Node 26 下存在兼容性问题（`ttf2woff2` 原生模块编译失败等），必须使用 Node 24 开发。

### 后端 DDD 四层架构

后端采用 DDD 四层架构（Interface / Application / Domain / Infrastructure），每层细化为子目录，另有 Shared 目录放跨模块共享代码。

**完整层级结构、依赖方向、每层职责、命名约定、异常分层规则**详见 **`shw-ddd` skill**——它是后端架构的单一权威定义。涉及新建文件归位、跨层依赖判断时加载该 skill。

简要概览：

```
src/api/app/
├── Module/{ModuleName}/   # 业务模块（每个模块完整四层）
│   ├── Interface/         # Controller、Command、Process
│   ├── Application/       # UseCase、ReqDTO/ResDTO、Listener
│   ├── Domain/            # Entity、ValueObject、Service、Repository(接口)、Event
│   └── Infrastructure/    # Model、Implement
└── Shared/                # 跨模块共享（同样四层结构）
```

### 开发环境约定

- **后端 PHP 必须在 Docker 容器内执行**（宿主机通常没有 PHP 环境）
- **前端所有操作必须使用 nvm 管理的 Node 24**（完整路径或 `nvm use 24`）
- **PM2 管理前端 dev server**
- **修改 `src/api/` 下的 PHP 代码后，必须重启 API 容器**（如 `docker compose -f .dev/docker-compose.yml restart api`）确保 Hyperf 进程加载最新代码

### Web 前端 API 转发规范

所有 Web 前端（浏览器可访问的端）必须同域访问 API，通过转发实现，禁止跨域直连后端。唯一例外是小程序（作为独立应用程序，直接请求 API 域名）。

- **开发环境**：Vite/Taro devProxy `/api` → 后端端口
- **生产环境**：静态服务镜像内置代理 或 Nuxt nitro routeRules

### 目录结构骨架

```
{{project_name}}/
├── src/
│   ├── api/                  # 后端 API（Hyperf）— DDD 四层架构
│   │   ├── app/
│   │   │   ├── Module/       # 业务模块（每模块完整四层，详见 shw-ddd skill）
│   │   │   └── Shared/       # 跨模块共享（同样四层结构）
│   │   ├── config/
│   │   └── migrations/
│   ├── {{前端服务}}-app/     # 前端 H5（Taro 4）
│   └── ...
├── packages/                 # pnpm workspace 共享包
├── tests/                    # 项目级测试
│   ├── e2e/                  # E2E 测试（Playwright）
│   └── vrt/                  # 视觉回归测试（Playwright visual）
├── .changes/                 # 变更工作区（不进 git）
├── specs/                    # 规格文档（git 跟踪）
├── deploy/                   # 部署配置
├── .dev/                     # Docker Compose 开发环境
└── AGENTS.md                 # 本文件
```

### 配套测试体系规范

| 测试体系 | AGENTS.md 位置 | 服务步骤 |
|---------|---------------|---------|
| API 集成测试（PHPUnit） | `src/api/test/AGENTS.md` | Step 2, 3, 5 |
| E2E 端到端测试（Playwright flow） | `tests/e2e/AGENTS.md` | Step 6, 7 |
| VRT 视觉回归测试（Playwright visual） | `tests/vrt/AGENTS.md` | Step 6, 7 |

各 AGENTS.md 定位：

| 文件 | 职责 |
|------|------|
| 根目录 `AGENTS.md` | 项目总览、全局约定、模块开发工作流 |
| `src/api/AGENTS.md` | 后端 DDD 架构、后端子流程（Step 2-3 展开） |
| `src/api/test/AGENTS.md` | API 测试规范 |
| `src/{端}/AGENTS.md` | 各前端服务开发、前端子流程（Step 4-5 展开） |
| `tests/e2e/AGENTS.md` | E2E 测试规范 |
| `tests/vrt/AGENTS.md` | VRT 测试规范 |

本 skill 不约束测试用例具体写法。断言精度、Scenario 编号等测试写法细则，下沉到对应目录的 AGENTS.md。

---

## 第三部分：反模式（技术栈通用）

### TypeScript

- **`any` 类型** — 禁止使用。必须定义明确的 interface/type。`as any` 同样禁止。
- **`@ts-ignore` / `@ts-expect-error`** — 禁止。类型错误必须修复。
- **`ref()` 无泛型** — 必须写 `ref<Type>([...])`，否则类型推断为 `never[]`。

### PHP

- **缺少类型声明** — 所有方法参数和返回值必须声明类型。
- **非严格模式** — 每个 PHP 文件第一行必须 `declare(strict_types=1);`。
- **Controller 写业务逻辑** — Controller 只做参数提取 + 调用 Service，不直接操作 DB。

### 架构

- **跨 Module 直接调 Model** — Controller 不直接调其他 Module 的 Model。通过 Service 层调用。
- **非事务写操作** — 涉及多个写操作的方法必须用 `Db::transaction()`。

### Git 分支

- **禁止创建 feature/fix/hotfix 等临时分支**。所有开发直接在主开发分支上提交。
- 仅维护开发/测试/生产三个分支，按合并流程流转。

### 工作流

- **跳过测试用例** — Step 3 实现前必须有 Step 2 的失败测试，禁止先写实现再补测试。
- **未归档 change 就开始下一步** — 每步完成判定满足后 MUST 归档，未归档不得开始下一 step 的 change。

---

## 参照项目

- **xlzb-project**：8 服务架构（PC+移动+agent+大屏），完整 K8s 部署，Hyperf+Taro+Express
- **ccl-new-project**：3 端架构（platform/landlord/tenant），docker-compose 部署，企业微信内嵌

两个项目都基于本 skill 描述的 8 步工作流 + PHP+Hyperf+Taro 技术栈，可作为参照。
