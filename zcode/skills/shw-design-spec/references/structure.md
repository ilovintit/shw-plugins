# 原型目录与依赖约定

只采用“入口、业务页面、支持文件分离”的组织方法。视觉/组件/交互规则读取公司前端规范，不复制一套设计系统到此文件。以下是目录职责示例，按项目实际规模建立，禁止为凑结构创建空目录或虚构页面。

```text
docs/design/
├── index.html                     # 产品入口：角色、各端、关键跨端旅程和验收状态
├── shared/assets/                 # 确实跨端复用的自有logo等素材（按需）
├── admin-pc/
│   ├── index.html                 # 管理端入口/导航，可直接承载简单单页
│   ├── pages/orders/order-list.html
│   ├── pages/orders/order-detail.html
│   ├── styles/tokens.css          # 引用/映射公司PC主题，不新造色彩体系
│   ├── styles/layout.css         # 端内布局，不复制到每个页面
│   ├── scripts/navigation.js     # 端内导航与演示状态（按需）
│   ├── scripts/api-mock.js       # 明确隔离的模拟接口，不藏在页面事件里
│   ├── fixtures/orders-list.json
│   ├── fixtures/order-details.json
│   ├── assets/                   # 端内图片、图标；依赖许可和版本可追溯
│   └── ui-design.md              # 可选派生映射与验收/预览说明，不是第二份PRD
└── user-mobile/
    ├── index.html
    ├── pages/...
    ├── styles/...
    ├── scripts/...
    └── fixtures/...
```

## 入口、命名与边界

- `<entry>`沿用项目按业务角色×端形态确定的稳定名称，如admin-pc、user-mobile；不包含Issue号、worktree名、日期或发布版本。同一套Taro UI的H5/小程序编译出口不因此复制两套原型；PRD确有不同体验时再分入口。
- 产品index链接全部真实端；端index链接业务语义页面。`order-detail.html`优于`page2.html`或`final-v3.html`。同端可用一个可交互HTML承载小流程，不强制每个弹窗单独建文件。
- `shared/`只放经确认跨端一致的素材/纯工具。Element Plus与Shw组件、各端token和业务交互不得为了共用一个文件而混成第三套规范。
- 所有HTML/CSS/JS与资产引用使用可解析的项目相对路径；重命名/移动时检查引用方，不依赖外部平台的资源接口、绝对磁盘路径或活动项目ID。
- 仅确有需要时加入本地vendor文件或预览构建配置，注明版本/许可及运行入口；不把安装缓存、真实凭据或生产数据放进原型目录。不能直接打开的模块/JSON请求场景应使用有记录的本项目HTTP预览。

## 组件与数据组织

PC原型按PC规范表达查询区、操作区、表格、分页和弹窗，沿用Element Plus语义/尺寸；移动端按Shw组件外观、主题变量、安全区和页面栈表达。优先用可运行的真实组件资产；HTML模拟必须记录对应组件与已核对文档，不能改变组件契约或替代生产实现。

示例数据单独存放，页面通过明确的模拟接口取数据；列表fixture只保存摘要，详情fixture按ID保存独立完整记录。打开详情经过 `detail(id)`，保存经过独立写操作模拟并刷新列表；支持错误/空态/加载场景并可重置。状态模拟入口与示例数据均须说明，不能把它们伪装成已联调能力。

## 验收信息

在产品/端索引和已有产品PR中记录：PRD来源、可运行入口/预览命令、组件及依赖版本、模拟范围、用户验收结果和commit。`ui-design.md`仅在需要实现映射时派生这些信息，不复制业务规则、不新增一份审批流程。

## 存量整理

先盘点旧入口、样式、脚本、资产和有效交互，保持现有可运行状态，逐端整理并修复链接。外部工具已有完整导出时保留所需文件与来源说明；只有真正使用的资产进入仓库，不能连同外部工具的数据库、运行状态和缓存搬入。用户预览接受后才删除被替代文件，旧版由Git基线保留。

## 参考范围

目录职责分离与语义HTML文件名参考了OpenDesign 0.21.1的文件型产物组织、functional skills/design templates分离思路。本指南为本项目重新编写，未复制其源码、模板、品牌token、字体或第三方skill正文，也不依赖其守护进程。

来源定位：[上游仓库](https://github.com/nexu-io/open-design)、`skills/AGENTS.md`、`design-templates/AGENTS.md`及文件型产物handoff说明。未来如实际引入第三方代码/资产，应单独固定版本并检查对应许可和归属。
