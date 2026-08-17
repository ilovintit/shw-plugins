---
name: shw-frontend-stack
description: 前端技术栈选型规范。涉及前端项目新建模块/页面、选技术栈、判断某端该用哪套技术、目录该放哪时调用。定义 3 套标准栈（Taro 多端 / Vite PC 后台 / Vite 单屏大屏）+ 2 套特殊形态（Nuxt 官网 / Node 服务）+ 通用约定。用户提到前端技术栈、Taro、Vite、PC 后台、数据大屏、官网、新建前端页面/模块时自动触发。
---

# 前端技术栈选型规范

## 概述

本 skill 是多端前端工程的**技术栈选型规范**。推荐采用 pnpm workspace monorepo 组织，按"业务角色 × 端形态"拆分前端工程，每端用**固定选型**，不是自由发挥。

**核心原则**：建新模块/页面时，先确定它在哪个端，端决定技术栈。不跨栈混用（如 PC 端别引 Taro，移动端别引 Element Plus）。

## monorepo 整体结构

按"业务角色 × 端形态"拆分，典型工程集合：

```
src/
├── {role}-pc/            # 各业务角色的 PC 后台（Vite + Element Plus）
├── {role}-mobile/        # 各业务角色的移动 H5/小程序（Taro）
├── data-screen/          # 数据大屏（Vite + echarts）
├── official-website/     # 官网（Nuxt + SSR）
└── agent/                # 服务类（Node + Express，非浏览器前端）
packages/
├── taro-ui/              # 移动端组件库（可自研，monorepo 内引用 source）
└── shared-utils/         # 工具函数
```

目录后缀约定：`-pc`（PC 后台）、`-mobile`（移动多端）、`-website`（官网）、无后缀服务类（agent）。

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
| 状态管理 | Pinia | 注意版本与 PC 端区分开（两端 Pinia 主版本可能不同，各自锁版本） |
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

## 标准栈 2：Vite PC 后台管理栈

### 适用场景

内部后台管理系统，复杂表单、表格、权限路由。可基于开源 `pure-admin-thin`（vue-pure-admin 精简版）二次开发。

### 技术选型清单

| 层 | 技术 | 说明 |
|---|------|------|
| 视图框架 | Vue 3 | |
| 构建 | Vite | |
| 语言 | TypeScript | ESM（"type": "module"） |
| 状态管理 | Pinia | 注意版本与移动端区分开 |
| UI 库 | Element Plus | |
| 脚手架生态 | pure-admin（可选） | @pureadmin/table、@pureadmin/descriptions、@pureadmin/utils |
| CSS | TailwindCSS + Sass + postcss + stylelint | 三者共存 |
| 路由 | vue-router | 手动路由，src/router/ |
| 请求 | axios | 封装为单例类（token 自动刷新） |

### 目录约定（pure-admin 风格）

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

## 标准栈 3：Vite 单屏可视化栈

### 适用场景

数据大屏、监控看板等纯展示单屏页。**极简，只负责把数据画出来**。

### 技术选型清单

| 层 | 技术 | 说明 |
|---|------|------|
| 视图框架 | Vue 3 | |
| 构建 | Vite | |
| 可视化 | echarts | 图表渲染 |
| UI 库 | **无** | 不引组件库 |
| 状态库 | **无** | 不引 Pinia |
| 路由库 | **无** | 单屏无路由 |

### 目录约定

```
src/data-screen/
└── src/
    ├── api/                   # 接口定义
    ├── components/            # 图表组件（每个图一个）
    ├── main.ts                # 入口
    └── App.vue                # 单屏根（网格布局 + 图表挂载）
```

### 关键约定

- **不引多余依赖**：UI 库 / Pinia / vue-router 都不要。大屏不需要。
- **图表即组件**：每个 echarts 图封装成 Vue 组件，App.vue 负责网格布局。
- **数据自取**：api 直接调，状态用组件内 ref，不搞全局 store。

---

## 特殊形态 1：Nuxt 官网栈

### 适用场景

需要 SEO 的对外展示站点（官网首页、产品介绍、博客等）。**全端唯一用 Nuxt/SSR 的工程**。

### 技术选型清单

| 层 | 技术 | 说明 |
|---|------|------|
| 框架 | Nuxt + Vue 3 | SSR 服务端渲染 |
| CSS | @nuxtjs/tailwindcss | |

### 关键约定

- **SEO 优先**：用 Nuxt 的 SSR / `useSeoMeta` 保证内容可被抓取，不做纯 CSR。
- **路由即目录**：Nuxt 约定式路由（pages/ 目录即路由），不用手动注册。
- **服务端能力**：可用 server routes / nitro 做轻后端代理，但重业务仍走后端 API。

---

## 特殊形态 2：Node 服务栈

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
- **共享库职责分明**：`taro-ui`（mobile 组件库）、`shared-utils`（工具函数）。
- **不要为了"复用"硬抽 shared 业务包**：跨端业务代码共享曾尝试过但难维护，目前已放弃。跨端业务代码各端各写，共享的只有纯工具/组件库。

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 目录 / 文件 | kebab-case | system-settings、express-address |
| Vue 组件文件名 | PascalCase | IconFont.vue、App.vue |

### API 契约（统一响应体）

```
{ code, message, data }
```

- `code === 0` 成功
- `code === 401` 认证失效
- 后端 API 前缀：`/api/<module>/...`

### 请求封装（两端不同实现，同一契约）

| 端 | 封装位置 | 实现 | 关键逻辑 |
|----|---------|------|---------|
| Mobile | `src/*/src/api/adapter.ts` | Taro.request | 401→登出+跳登录页（防抖）；403→toast 无权限 |
| PC | `src/*/src/utils/http/index.ts` | axios（单例类） | token 自动刷新（过期调 refresh，并发暂存队列重放）；大整数用 safeJsonParse |

### 环境变量

- 后端地址统一用 `API_TARGET`（按部署环境配置）。
- PC 端用 Vite 多模式：`.env.development` / `.env.staging` / `.env.production`。

### 图标体系

- 全端统一用 `<IconFont name="xxx" />`（阿里云 OSS + CDN 加载）。
- 不引别的图标库。

### 企微集成

- mobile H5 端有完整企微浏览器静默授权链路：OAuth snsapi_base → wecom-login → 免密登录。
- 新建需登录的 H5 页面默认接入此链路。

---

## 选型判定法

```
问：这个新模块/页面要建在哪个端？
├─ 移动端（H5 + 小程序双端）→ 标准栈 1（Taro）
├─ PC 后台管理 → 标准栈 2（Vite + Element Plus）
├─ 数据大屏 / 纯展示单屏 → 标准栈 3（Vite + echarts）
├─ 需 SEO 的对外官网 → 特殊形态 1（Nuxt）
└─ AI 连接器等 Node 服务 → 特殊形态 2（Node + Express）

确定端 → 用该端的固定技术栈 → 按该端目录约定归位
```

## 常见错误（禁止）

- ❌ **PC 端引 Taro** / **移动端引 Element Plus** → 跨栈混用，端决定技术栈。
- ❌ **移动端引 axios** → 移动端用 Taro.request 封装。
- ❌ **新建 shared 业务包** → 跨端业务代码共享已废弃，各端各写。
- ❌ **引别的图标库** → 全端统一 IconFont。
- ❌ **大屏引 Pinia / vue-router / 组件库** → 单屏极简，不引多余依赖。
- ❌ **Taro 新页面不注册** → 必须在 app.config.ts 登记。
- ❌ **PC 路由不手动注册** → 必须在 router/ 登记。
