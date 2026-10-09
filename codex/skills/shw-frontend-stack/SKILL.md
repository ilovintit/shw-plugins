---
name: shw-frontend-stack
description: 前端按目标端选型规范。新项目的 H5、各类小程序与 iOS/Android/鸿蒙分别实现，不以 Taro 同构为默认；PC 后台、Nuxt 与 Node 服务仍按各自形态选型。涉及前端技术栈、目录、新页面或跨端迁移时调用。
---

**执行前置**：先读 [适用模式与权限](../shw-issue-gate/SKILL.md)。仅修改当前已确认项目工作目录；项目外只读，未知修改不得覆盖。涉及写入先按 [工作区能力契约](../shw-workspace/SKILL.md) 确认所有权，不强制依赖本地 worktree 插件。

# 前端技术栈入口

先读项目 manifest、lockfile、路由和构建脚本，确认实际端与既有栈。新项目按下列规则选型；存量项目保留已确认技术栈，迁移须有自身范围和方案，不因插件升级自动重建。

| 目标 | 选型边界 |
|---|---|
| PC后台 | Vue3/Vite/TypeScript，pure-admin-thin 基座与 Element Plus；手动注册路由 |
| PC非后台 | Nuxt，按实际 SEO/交互需求选择 SSR、SSG 或 SPA |
| H5/每类小程序 | 按真实端分别实现；不默认 Taro 同构，旧 Taro 渐进迁移 |
| iOS/Android/鸿蒙 | 各端原生工程；不预设 shw-ui 提供统一组件 |
| Node连接器 | 服务工程，不套浏览器前端结构 |

- shw-ui 仅消费该端已发布且已验证的包；核对版本、支持矩阵、API与产物路径，不发明包名或能力。公共库不复制源码/submodule替代正式制品。
- 跨端共享产品/API契约，不强抽共享业务包，不为不存在的端建工程；各端分别体验与人工验收。
- API四字段 `{traceId, code, message, data}`，code=0成功，401认证失效；refresh仅在后端有契约时启用，大整数ID防精度丢失。
- 企微OAuth仅在PRD确认入口时接入。图标及交互加载 [通用规范](../shw-frontend-spec-common/SKILL.md)，再按实际端读 PC/mobile 规范。
- 直接实现实际页面，不维护独立必需原型；模拟能力明确标注。业务逻辑/权限/状态变化同步PRD，接口/数据/架构变化同步技术文档。

模型选择使用宿主当前设置，不在通用工程规范指定模型或自动派工。

**测试时机**：开发阶段必须执行类型检查、适用 lint/静态检查及本次改动涉及的单元与单模块 API 快速测试；全量 E2E、VRT、全量 API 等长周期回归集中到 dev→main 集成。必要构建部署正常执行；快速检查通过不替代人工体验，tag 不新增测试阶段。

## 按需加载（执行对应动作前必读）

下列文件随插件版本分发，属于执行规范。按改动主题读取并记录所用路径；找不到时报告缺口，不以记忆替代。多个主题命中时全部读取。

| 触发条件 | 本地规范 |
|---|---|
| 涉及按实际端组织的目录示例 | [按实际端组织的目录示例](references/project-layout.md) |
| 涉及移动 H5 与小程序：各端原生工程 | [移动 H5 与小程序：各端原生工程](references/h5-and-miniprograms.md) |
| 涉及iOS、Android、鸿蒙原生 App | [iOS、Android、鸿蒙原生 App](references/native-apps.md) |
| 涉及标准栈 2：PC 管理后台栈（pure-admin-thin 基座） | [标准栈 2：PC 管理后台栈（pure-admin-thin 基座）](references/pc-admin.md) |
| 涉及标准栈 3：Nuxt 栈（纯展示 / 数据大屏 / 应用型） | [标准栈 3：Nuxt 栈（纯展示 / 数据大屏 / 应用型）](references/nuxt.md) |
| 涉及特殊形态：Node 服务栈 | [特殊形态：Node 服务栈](references/node-services.md) |
| 涉及通用约定（跨所有栈） | [通用约定（跨所有栈）](references/shared-contracts.md) |
