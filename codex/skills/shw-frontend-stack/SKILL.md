---
name: shw-frontend-stack
description: 前端技术栈选型规范。涉及前端项目新建模块/页面、选技术栈、判断某端该用哪套技术、目录该放哪时调用。定义 3 套标准栈（Taro 多端 / pure-admin-thin PC 后台 / Nuxt 展示·大屏·应用）+ 1 套特殊形态（Node 服务）+ 通用约定。用户提到前端技术栈、Taro、Vite、pure-admin、Nuxt、PC 后台、数据大屏、官网、新建前端页面/模块时自动触发。
---

# 前端技术栈选型规范

## 概述

本 skill 是多端前端工程的**技术栈选型规范**。推荐采用 pnpm workspace monorepo 组织，按"业务角色 × 端形态"拆分前端工程，每端用**固定选型**，不是自由发挥。

**核心原则**：建新模块/页面时，先确定它在哪个端、是什么形态，端 × 形态决定技术栈。不跨栈混用（如 PC 端别引 Taro，移动端别引 Element Plus）。

**PC 端先分形态再选栈**：

- 管理后台（表单/表格/权限路由）→ pure-admin-thin 基座（标准栈 2）
- 非管理后台——纯展示 / 数据大屏 / 其他应用型 → Nuxt 基座（标准栈 3），按需加组件库

## monorepo 整体结构

按"业务角色 × 端形态"拆分，典型工程集合：

```
src/
├── {role}-pc/            # 各业务角色的 PC 端
│                         #   管理后台 → pure-admin-thin 基座（Vite + Element Plus）
│                         #   纯展示/大屏/应用型 → Nuxt
├── {role}-mobile/        # 各业务角色的移动 H5/小程序（Taro）
├── data-screen/          # 数据大屏（Nuxt + echarts，spa 单屏）
└── agent/                # 服务类（Node + Express，非浏览器前端）
packages/
├── taro-ui/              # 移动端组件库（可自研，monorepo 内引用 source）
└── shared-utils/         # 工具函数
```

目录后缀约定：`-pc`（PC 端）、`-mobile`（移动多端）、`-website`（官网/展示站）、`data-screen`（大屏）、无后缀服务类（agent）。

> 工程数量按业务角色的多少伸缩——单角色单端就一个工程，多角色多端按"角色 × 端"组合展开。**不要为了对称硬拆不存在的端。**

---

## 标准栈 1：Taro 多端栈（H5 + 微信小程序）

### 适用场景

需要企微内嵌 H5 + 微信小程序双端同构的业务。一份代码编译出 H5（企微浏览器内嵌）和微信小程序两套产物。

### 技术选型清单

| 层 | 技术 | 说明 |
|---|------|------|
| 框架 | Taro 4.x（@tarojs/plugin-framework-vue3） | 多端编译框架 |
| 视图框架 | Vue 3 | Composition API |
| 构建 | webpack5（@tarojs/webpack5-runner） | **不是 Vite** |
| 语言 | TypeScript | |
| 状态管理 | Pinia v2 | Taro 端 Pinia v2 / PC 端 Pinia v3（各自锁版本） |
| UI 库 | 自研 Taro 组件库（monorepo packages 内）或选用 Taro 生态库 | |
| CSS | Sass + pxtransform | rpx 单位自动转换 |
| 路由 | Taro 内置 | app.config.ts 注册 pages |
| 请求 | Taro.request 封装 | **不用 axios** |

### 构建命令

```
taro build --type h5      # 企微内嵌 H5
taro build --type weapp   # 微信小程序
```

### 目录约定

```
src/{端}-mobile/
├── config/                    # Taro 构建配置（dev/prod/index.ts）
└── src/
    ├── api/                   # 接口定义
    │   └── adapter.ts         # Taro.request 封装（401→登出跳登录，403→toast）
    ├── app.config.ts          # 页面注册、tabBar、企微配置
    ├── app.scss               # 全局样式
    ├── app.ts                 # 入口
    ├── app.vue                # 根组件
    ├── components/            # 端内复用组件
    ├── pages/                 # 业务页面（按模块分目录）
    ├── static/                # 静态资源
    ├── stores/                # Pinia store
    └── utils/                 # 工具函数
```

### 关键约定

- **页面注册**：新建页面必须在 `app.config.ts` 的 pages 数组登记，否则 Taro 不识别。
- **请求不引 axios**：统一走 `api/adapter.ts` 的 Taro.request 封装。
- **企微集成**：H5 端有完整企微浏览器静默授权链路（OAuth snsapi_base → wecom-login → 免密登录）。
- **UI 用统一组件库**：组件优先用 monorepo 内约定的 Taro 组件库（直接引用 source，非构建产物）。

---

## 标准栈 2：PC 管理后台栈（pure-admin-thin 基座）

### 适用场景

内部后台管理系统，复杂表单、表格、权限路由。**统一基于开源 pure-admin-thin（vue-pure-admin 精简版）二次开发，不从零搭**。

### 技术选型清单

| 层 | 技术 | 说明 |
|---|------|------|
| 基座 | pure-admin-thin | **必选**——拉取精简版后二次开发，禁止裸 Vite 从零搭后台 |
| 视图框架 | Vue 3 | |
| 构建 | Vite | pure-admin-thin 自带 |
| 语言 | TypeScript | ESM（"type": "module"） |
| 状态管理 | Pinia v3 | Taro 端 Pinia v2 / PC 端 Pinia v3（各自锁版本） |
| UI 库 | Element Plus | pure-admin-thin 内置 |
| 生态件 | @pureadmin/table、@pureadmin/descriptions、@pureadmin/utils | 按需引入 |
| CSS | TailwindCSS + Sass + postcss + stylelint | 三者共存 |
| 路由 | vue-router | 手动路由，src/router/ |
| 请求 | axios | 封装为单例类（token 自动刷新） |

### 目录约定（pure-admin-thin 自带结构，二次开发沿用）

```
src/{端}-pc/
├── build/                     # vite 构建辅助
├── mock/                      # mock 数据
└── src/
    ├── api/                   # 接口定义
    ├── components/            # 全局复用组件
    ├── composables/           # 组合式函数
    ├── config/                # 配置
    ├── directives/            # 自定义指令
    ├── layout/                # 布局组件
    ├── main.ts                # 入口
    ├── plugins/               # 插件
    ├── router/                # 路由（手动注册）
    ├── store/                 # Pinia store
    ├── style/                 # 全局样式
    ├── utils/                 # 工具函数
    │   └── http/index.ts      # axios 封装（单例类）
    └── views/                 # 业务页面（按模块分目录）
```

### 关键约定

- **请求单例**：`utils/http/index.ts` 封装 axios 为单例类，token 自动刷新（过期调 refresh，并发暂存队列重放）。
- **大整数安全**：响应体含大整数 ID 时用 safeJsonParse 防精度丢失。
- **环境多模式**：`.env.development` / `.env.staging` / `.env.production`（Vite 多模式）。
- **路由手动注册**：新建页面在 `router/` 手动登记，不做文件路由自动扫描。

---

## 标准栈 3：Nuxt 栈（纯展示 / 数据大屏 / 应用型）

### 适用场景

PC 端**非管理后台**的一切工程，统一 Nuxt 基座，按形态分三种打法：

| 形态 | 典型场景 | 渲染模式 | 额外依赖 |
|------|---------|---------|---------|
| 纯展示 | 官网首页、产品介绍、博客 | SSR/SSG（SEO 优先） | 无组件库 |
| 数据大屏 | 监控看板、单屏可视化 | spa（`ssr: false`） | echarts；无 UI 库 / 无 Pinia / 无路由 |
| 应用型 | 非管理后台的交互型 PC 站点 | 按需（要 SEO 用 SSR，否则 spa） | 按需加组件库（如 Element Plus） |

### 技术选型清单

| 层 | 技术 | 说明 |
|---|------|------|
| 框架 | Nuxt 4 + Vue 3 | SSR / SSG / spa 按形态选 |
| CSS | @nuxtjs/tailwindcss | |
| 可视化 | echarts | 仅大屏形态 |
| UI 组件库 | 按需 | 仅应用型形态；管理后台不在此栈（走标准栈 2） |

### 目录约定（Nuxt 约定式）

```
src/{端}-website/  或  data-screen/
├── nuxt.config.ts            # ssr 开关、runtimeConfig、模块注册
├── pages/                    # 约定式路由（大屏单屏只用 index.vue）
├── components/               # 组件（大屏 = 每个 echarts 图一个组件）
├── composables/              # 组合式函数
├── assets/                   # 全局样式
└── server/                   # server routes / nitro 轻代理（按需）
```

### 关键约定

- **SEO 优先（纯展示）**：用 SSR/SSG + `useSeoMeta` 保证内容可被抓取，不做纯 CSR。
- **路由即目录**：Nuxt 约定式路由（pages/ 目录即路由），不手动注册。
- **大屏极简**：echarts 之外不加依赖——UI 库、Pinia、路由都不要；每个图封装成组件，单屏页负责网格布局；数据自取，状态用组件内 ref。
- **应用型按需加件**：在 Nuxt 基础上需要什么加什么（组件库、图表、编辑器），但管理后台不在本栈。
- **服务端能力**：可用 server routes / nitro 做轻后端代理，重业务仍走后端 API。

---

## 特殊形态：Node 服务栈

### 适用场景

AI 机器人连接器等后端服务性质（非浏览器前端，是 Node 服务进程）。

### 技术选型清单

| 层 | 技术 | 说明 |
|---|------|------|
| 运行时 | Node.js + TypeScript | |
| Web 框架 | Express | |
| AI SDK | 按需（如 OpenAI SDK、企微 AI 机器人 SDK） | 看具体对接 |
| 测试 | vitest | |

### 关键约定

- **这是服务不是前端**：没有浏览器、没有 Vue 组件、没有路由组件库。
- **长驻进程**：作为 Node 服务部署，注意进程管理（pm2 / 容器）。

---

## 通用约定（跨所有栈）

以下约定适用于全部工程，是跨端的一致性基线。

### monorepo 组织

- **pnpm workspace**，`src/` 下按端拆分，`packages/` 放共享库。
- **共享库职责分明**：`taro-ui`（mobile 组件库）、`shared-utils`（工具函数）；共享库以 git submodule + workspace 引用接入（source 直接引用，非构建产物）。
- **不要为了"复用"硬抽 shared 业务包**：跨端业务代码共享曾尝试过但难维护，目前已放弃。跨端业务代码各端各写，共享的只有纯工具/组件库。

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 目录 / 文件 | kebab-case | system-settings、express-address |
| Vue 组件文件名 | PascalCase | IconFont.vue、App.vue |

### API 契约（统一响应体）

```
{ traceId, code, message, data }
```

- `traceId` 用于链路追踪（与后端统一响应规范对齐，规范定义见公司 lib 仓库文档，shw-lib-docs 指路）；前端在错误提示 / 上报时携带
- `code === 0` 成功
- `code === 401` 认证失效
- 后端 API 前缀：`/api/<module>/...`

### 请求封装（各端不同实现，同一契约）

| 端 | 封装位置 | 实现 | 关键逻辑 |
|----|---------|------|---------|
| Mobile | `src/*/src/api/adapter.ts` | Taro.request | 401→登出+跳登录页（防抖）；403→toast 无权限 |
| PC 管理后台 | `src/*/src/utils/http/index.ts` | axios（单例类） | token 自动刷新（过期调 refresh，并发暂存队列重放）；大整数用 safeJsonParse |
| Nuxt 各形态 | `useFetch` / `$fetch` | ofetch（Nuxt 内置） | 同一响应体契约；`code === 401` 认证失效处理 |

### 环境变量

- 后端地址统一用 `API_TARGET`（默认 `http://localhost:19501`，按部署环境覆盖配置）。
- 管理后台（Vite）用多模式：`.env.development` / `.env.staging` / `.env.production`。
- Nuxt 端用 runtimeConfig（`NUXT_` 前缀变量，如 `NUXT_API_TARGET`）。

### 图标体系

- 全端统一用 `<IconFont name="xxx" />`（阿里云 OSS + CDN 加载）。
- 不引别的图标库。

### 企微集成

- mobile H5 端有完整企微浏览器静默授权链路：OAuth snsapi_base → wecom-login → 免密登录。
- 新建需登录的 H5 页面默认接入此链路。

## 模型路由偏好（前端任务子智能体）

派发前端思考 / 实现类子智能体时，**优先使用 `kimi-k3` 模型**；`kimi-k3` 不可用时保持默认模型，**静默降级、不阻断流程、不弹窗询问**。

**触发条件**（任一命中即视为前端任务）：

- 任务涉及 `.vue` / `.tsx` / `.jsx` 文件的新建或修改
- 涉及 Taro / Element Plus / Nuxt / pure-admin / echarts 等前端框架或库的代码
- 前端页面 / 组件 / 交互 / 样式的设计思考与实现

**路由规则**：

| 场景 | 动作 |
|------|------|
| `kimi-k3` 可用 | 子智能体 `model` 设为 `kimi-k3` |
| `kimi-k3` 不可用 | 保持默认模型（不指定 model 覆盖），继续执行 |

**边界**：后端任务（Go / PHP / Node 服务 / 数据库 / 基础设施）**不适用**本偏好——用默认模型。

---

## 选型判定法

```
问：这个新模块/页面要建在哪个端、什么形态？
├─ 移动端（H5 + 小程序双端）→ 标准栈 1（Taro）
├─ PC 管理后台（表单/表格/权限路由）→ 标准栈 2（pure-admin-thin 基座）
├─ PC 纯展示（官网/产品站，要 SEO）→ 标准栈 3（Nuxt，SSR/SSG）
├─ PC 数据大屏（单屏可视化）→ 标准栈 3（Nuxt + echarts，spa 极简）
├─ PC 其他应用型（非后台非纯展示）→ 标准栈 3（Nuxt + 按需组件库）
└─ AI 连接器等 Node 服务 → 特殊形态（Node + Express）

确定端和形态 → 用该栈的固定选型 → 按该栈目录约定归位
```

## 常见错误（禁止）

- ❌ **PC 端引 Taro** / **移动端引 Element Plus** → 跨栈混用，端决定技术栈。
- ❌ **移动端引 axios** → 移动端用 Taro.request 封装。
- ❌ **管理后台裸 Vite 从零搭、不用 pure-admin-thin** → 后台统一 pure-admin-thin 二次开发。
- ❌ **非管理后台 PC 端不用 Nuxt** → 纯展示/大屏/应用型统一 Nuxt 基座，按需加件。
- ❌ **新建 shared 业务包** → 跨端业务代码共享已废弃，各端各写。
- ❌ **引别的图标库** → 全端统一 IconFont。
- ❌ **大屏引 Pinia / 路由 / UI 组件库** → 单屏极简，echarts 之外不加依赖。
- ❌ **Taro 新页面不注册** → 必须在 app.config.ts 登记。
- ❌ **管理后台路由不手动注册** → 必须在 router/ 登记（Nuxt 形态相反，路由即目录）。
