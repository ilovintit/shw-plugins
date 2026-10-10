# 标准栈 2：PC 管理后台栈（pure-admin-thin 基座）

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
