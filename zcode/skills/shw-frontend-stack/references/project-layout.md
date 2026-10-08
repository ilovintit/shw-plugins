# 按实际端组织的目录示例

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
