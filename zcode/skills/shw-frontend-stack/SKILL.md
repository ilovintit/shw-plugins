---
name: shw-frontend-stack
description: 前端按目标端选型规范。新项目的 H5、各类小程序与 iOS/Android/鸿蒙分别实现，不以 Taro 同构为默认；PC 后台、Nuxt 与 Node 服务仍按各自形态选型。涉及前端技术栈、目录、新页面或跨端迁移时调用。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# 前端技术栈选型规范

## 概述

本 skill 是多端前端工程的**技术栈选型规范**。按"业务角色 × 实际目标端"组织工程。逐步退出 Taro：新入口不默认使用一份代码编译 H5/小程序；现存 Taro 项目按自身 Issue 渐进迁移，不因插件升级立即失效。

**核心原则**：先确认目标平台、该端的原生语言/框架、组件库已发布的支持范围和构建/调试/发布入口。跨端共享产品/API 契约，不预设共享页面代码和统一交互。未确认的具体框架、包名和平台能力不得写成固定选型。

**PC 端先分形态再选栈**：

- 管理后台（表单/表格/权限路由）→ pure-admin-thin 基座（标准栈 2）
- 非管理后台——纯展示 / 数据大屏 / 其他应用型 → Nuxt 基座（标准栈 3），按需加组件库

## 按实际端组织的目录示例

按"业务角色 × 端形态"拆分，典型工程集合：

```
src/
├── {role}-pc/            # 各业务角色的 PC 端
│                         #   管理后台 → pure-admin-thin 基座（Vite + Element Plus）
│                         #   纯展示/大屏/应用型 → Nuxt
├── {role}-h5/            # 移动 H5（浏览器生态）
├── {role}-{platform}-mini/ # 每种已确认的小程序分别建工程
├── {role}-{ios|android|harmony}/ # 实际存在的原生 App 端，按端选语言/工程
├── data-screen/          # 数据大屏（Nuxt + echarts，spa 单屏）
└── agent/                # 服务类（Node + Express，非浏览器前端）
packages/
└── shared-utils/         # 仅项目自身确需共享的纯工具函数
```

目录后缀约定：`-pc`、`-h5`、`-{platform}-mini`、`-ios`、`-android`、`-harmony`、`-website`、`data-screen`；服务类可无端后缀。沿用项目现有稳定名称时先建立映射，不机械改名。

> 工程数量按业务角色的多少伸缩——单角色单端就一个工程，多角色多端按"角色 × 端"组合展开。**不要为了对称硬拆不存在的端。**

---

## 移动 H5 与小程序：各端原生工程

### 适用场景

先逐个确认真实目标：移动 H5 用浏览器原生生态；微信等各类小程序分别使用该平台原生语言、组件、API、路由与构建工具。H5 与小程序即使业务相同也分别实现，不能把某一平台的构建产物或交互当作其他平台的验收。

### 技术选型清单

| 层 | 技术 | 说明 |
|---|------|------|
| H5 | 浏览器原生能力及该 H5 工程已确认的框架/语言/构建工具 | 企微 H5 仅在产品确认时接入企微授权 |
| 每种小程序 | 对应平台官方原生工程、语言、页面注册、请求和构建能力 | 不跨平台套用微信目录或 API |
| UI | `shw-ui` 的该端**已发布且已验证**的组件包 | 库本身按 monorepo 分端维护；实际包名/API/支持矩阵以其发行文档为准，未发布时不能假装可用 |

### 关键约定

- 各端独立维护构建脚本、路由/页面登记、API adapter、静态资源与 CI 产物路径；按平台真实工具和项目契约配置，不能复制 Taro 的 `app.config.ts`、`Taro.request` 或 `dist/${TARO_ENV}`。
- 组件库 `shw-ui` 的 monorepo 属于公共库自身，不要求业务项目复制其源码或创建公共库 submodule。正式包尚未发布/该端尚未覆盖时记录缺口与组件实现方案，不引用不存在的包。
- 企微内嵌 H5 只有在产品确认时接入 OAuth；普通 H5 不默认增加企微链路。

## iOS、Android、鸿蒙原生 App

三个系统按各自原生语言、平台规范、工程与交互分别设计和实现；具体技术选型在真实 App 项目启动时确认。前期 `shw-ui` **不提供**三个端的统一可运行组件，不强制共用 H5/小程序的布局、CSS token、导航、弹层或手势。将来按端规范归属 `shw-ui` 还是另建 App 专用公共库，留待 App 开发时裁决；当前不创建库或假定已发布支持。

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
| 状态管理 | Pinia v3 | 仅 PC 工程的选型；移动端按各自平台确定 |
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

- **请求单例**：`utils/http/index.ts` 封装 axios 为单例类，仅后端已提供 refresh 契约时自动刷新（并发暂存队列重放）；否则按认证失效退出。
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

### 工程组织

- Web/小程序的 JavaScript 工程可按实际需要使用 pnpm workspace；原生 App 工程不强制使用 pnpm。示例 `src/` 是角色与端的归属示意，不要求不同语言的原生工程共享一个包管理器。`packages/` 仅放项目自身确有需要的共享包。
- **共享库职责分明**：`shw-ui` 在其独立 monorepo 为已支持的 H5/小程序端维护组件；业务项目只消费该端已正式发布的包和版本。项目自身确需共享的纯工具可放 `shared-utils`。公司库不复制到业务仓库、不以 submodule/source 替代正式制品；未发布时如实记录依赖缺口。
- **不要为了"复用"硬抽 shared 业务包**：跨端业务代码各端各写；纯工具和组件也只有满足各端实际兼容条件时才共享。

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
| H5/各类小程序 | 各端 API adapter | 目标平台原生请求能力或该端已确认的请求库 | 401→失效处理；403→该端无权限反馈；认证与重试以实际 API 契约为准 |
| iOS/Android/鸿蒙 | 各 App 端网络层 | 对应原生平台方案 | 同一后端响应契约，呈现方式遵循各端规范 |
| PC 管理后台 | `src/*/src/utils/http/index.ts` | axios（单例类） | 仅后端已提供 refresh 契约时自动刷新（并发暂存队列重放）；否则按认证失效退出；大整数用 safeJsonParse |
| Nuxt 各形态 | `useFetch` / `$fetch` | ofetch（Nuxt 内置） | 同一响应体契约；`code === 401` 认证失效处理 |

### 环境变量

- 后端地址统一用 `API_TARGET`（默认 `http://localhost:19501`，按部署环境覆盖配置）。
- 管理后台（Vite）用多模式：`.env.development` / `.env.staging` / `.env.production`。
- Nuxt 端用 runtimeConfig（`NUXT_` 前缀变量，如 `NUXT_API_TARGET`）。

### 图标体系

- H5/已支持的小程序按 `shw-frontend-spec-common` 的图标契约使用已验证的端内图标方案；微信原生 TabBar 图片由 `shw-ci-icons` 按同一语义映射生成。原生 App 三端另按各自平台资产规范确定实现，不能把 font-icon 或微信 TabBar 方案套用到 App。
- H5/小程序仅在对应 `shw-ui` 端包已发布并提供图标组件时使用该包的组件和字体；不预设旧 `ShwIcon` API 自动兼容。
- PC/Nuxt 沿用各端基座的统一 font-icon 组件；公共工具集中维护字体资源、`@font-face`、语义名称映射和组件入口，业务页面不得直接管理字体细节。
- 各端图标资产、语义名称和平台适配独立核对，不把一端的字体地址、codepoint 或图片路径复制到另一端。

### 企微集成

- mobile H5 端有完整企微浏览器静默授权链路：OAuth snsapi_base → wecom-login → 免密登录。
- 仅 PRD 明确为企微入口时接入此链路；公开 H5/其他登录体系按实际产品认证契约，不默认添加企微 OAuth。

## 原型与生产工程

上述按端选型用于生产工程。验收用HTML原型按shw-design-spec直接在docs/design维护，不因此新建另一套生产应用；组件外观和交互仍服从适用端规范，真实框架/组件/接口验收不能由HTML模拟替代。prototype由当前宿主Agent直接执行，下述子智能体偏好不要求为原型另派一个任务。

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
├─ 移动 H5 → 浏览器工程，核对 shw-ui H5 端已发布能力
├─ 每种小程序 → 对应平台原生工程，核对 shw-ui 对该平台已发布能力
├─ iOS / Android / 鸿蒙 → 各自原生工程及交互规范，不预设 shw-ui 组件
├─ PC 管理后台（表单/表格/权限路由）→ 标准栈 2（pure-admin-thin 基座）
├─ PC 纯展示（官网/产品站，要 SEO）→ 标准栈 3（Nuxt，SSR/SSG）
├─ PC 数据大屏（单屏可视化）→ 标准栈 3（Nuxt + echarts，spa 极简）
├─ PC 其他应用型（非后台非纯展示）→ 标准栈 3（Nuxt + 按需组件库）
└─ AI 连接器等 Node 服务 → 特殊形态（Node + Express）

确定端和形态 → 用该栈的固定选型 → 按该栈目录约定归位
```

## 常见错误（禁止）

- ❌ **新 H5/小程序默认生成 Taro 双端工程** → 按真实端分别建设。
- ❌ **假定 shw-ui 已覆盖全部小程序或原生 App** → 按实际发布矩阵取证。
- ❌ **管理后台裸 Vite 从零搭、不用 pure-admin-thin** → 后台统一 pure-admin-thin 二次开发。
- ❌ **非管理后台 PC 端不用 Nuxt** → 纯展示/大屏/应用型统一 Nuxt 基座，按需加件。
- ❌ **新建 shared 业务包** → 跨端业务代码共享已废弃，各端各写。
- ❌ **跨端复制同一字体包、地址或 codepoint** → 按各端资源规范独立实现。
- ❌ **大屏引 Pinia / 路由 / UI 组件库** → 单屏极简，echarts 之外不加依赖。
- ❌ **在新端沿用 Taro 页面注册/请求/产物路径** → 使用目标平台的真实入口。
- ❌ **管理后台路由不手动注册** → 必须在 router/ 登记（Nuxt 形态相反，路由即目录）。
