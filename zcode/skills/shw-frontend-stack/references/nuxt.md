# 标准栈 3：Nuxt 栈（纯展示 / 数据大屏 / 应用型）

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
