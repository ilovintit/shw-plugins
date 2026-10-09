# 通用约定（跨所有栈）

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
