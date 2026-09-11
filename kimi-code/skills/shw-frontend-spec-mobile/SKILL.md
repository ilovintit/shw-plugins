---
name: shw-frontend-spec-mobile
description: 移动端（Taro + @shwkj/taro-ui 组件库）视觉规范与操作逻辑规范。在 Taro 多端项目写页面/组件、选组件、配主题变量、做移动端 Code Review 时调用。基于公司 @shwkj/taro-ui 组件库（Shw* 组件 + --shw-* 主题变量 + 物理 px）。通用操作逻辑（详情接口铁律、表单/列表行为）见 shw-frontend-spec-common。用户提到 Taro、小程序、H5、移动端页面时自动触发。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# 移动端前端视觉与操作逻辑规范

## 概述

本 skill 是 **Taro 多端**（H5 企微内嵌 + 微信小程序）的视觉与操作逻辑规范，**基于公司 `@shwkj/taro-ui` 组件库**（源仓库 taro-ui-demo）。技术栈选型见 **shw-frontend-stack**；通用行为铁律（编辑/详情必须调详情接口、表单/列表通用逻辑）在 **shw-frontend-spec-common**，本 skill 不重复。

**第一原则：页面不造轮子**——UI 一律优先用 `@shwkj/taro-ui` 的 `Shw*` 组件拼装，只有库里没有的形态才自写样式，自写部分同样遵守本 skill 的主题变量与单位铁律。

---

## 组件使用规范（第一优先级）

### 组件从库取，不手写

`@shwkj/taro-ui` 已覆盖：按钮/单元格/表单/弹层/反馈/布局/展示全量组件（ShwButton、ShwCell(Group)、ShwField/ShwForm(FormItem)、ShwInput、ShwPicker 系列、ShwPopup/ShwOverlay、ShwToast/ShwDialog/ShwNotify/ShwActionSheet、ShwTabs/ShwTabbar、ShwEmpty、ShwSkeleton 系列、ShwSearch(SearchBar)、ShwTag、ShwUpload、ShwActionBar 等）。

- 页面里出现手写的按钮/输入框/弹层/空态/骨架屏，而库里**有**对应组件 → 违规，改用库组件
- 组件从 `@shwkj/taro-ui` 导入（非相对路径），不复制库源码进业务项目
- 组件 API 细节查组件库自己的文档与 demo（taro-ui-demo 仓库），本 skill 不背组件 props

### 布局组件拼页面

- 页面外壳统一 `<ShwLayout>`（内含主题容器 + 导航栏 + 安全区处理），业务页面**不再**自己写 `.gallery-page` 式根容器、主题切换、导航栏
- 页面内容**零水平 padding**，页边距一律由 `<ShwSection>` 承担（默认区块自带 `--shw-section-page-inset`，页面注入 24rpx）；通栏形态组件（search-bar/nav-bar/notice-bar/tabs/swipe 等）用 `<ShwSection full>`
- **页面根下禁止游离内容**（按钮行/提示文本/自定义块）——游离内容会贴边，一律包进 `<ShwSection>`（无 title 也行）
- 底部主操作用 `<ShwActionBar>`（沉底操作栏），主操作不放内容流里

### 图标

统一 `<ShwIcon :name="<lucide语义名>" />`（classPrefix 默认 `shwkj`）。图标字体随包自包含，不依赖 CDN；缺的图标用 lucide 语义名占位（不渲染但不报错），记入组件库 PROGRESS 待补，不在业务项目自造图标字体。

---

## 主题变量铁律

组件库使用 `--shw-*` CSS 变量体系（亮/暗双套，`.theme-light`/`.theme-dark` 容器级联）：

```scss
// ✅ 正确
background: var(--shw-surface, #FFFFFF);
color: var(--shw-text-primary, #101010);
border: 1px solid var(--shw-border, #EFEFEF);

// ❌ 错误
background: #FFFFFF;   // 暗黑不切换
color: #333;           // 硬编码
```

- 业务项目所有自写样式**必须** `var(--shw-*, #fallback)`（fallback 是亮色 hex），**禁止硬编码颜色**
- 语义变量分工：背景 `--shw-bg/-secondary/-tertiary`、表面 `--shw-surface/-elevated`、文字 `--shw-text-primary/secondary/hint/disabled`、语义色 `--shw-success/warning/error/info`、品牌 `--shw-primary` 系、边框 `--shw-border`/`--shw-divider`、阴影 `--shw-shadow(-elevated)`
- 一个业务状态只对应一种语义色，不自造第三套色值
- 暗黑模式靠 `.theme-light`/`.theme-dark` 容器级联自动切换，业务代码**不写主题判断分支**；主题跟随/切换逻辑已封装在布局层（useTheme）

---

## 单位与 pxtransform（铁律）

组件库样式是**物理 px**，不参与 Taro 单位转换。两套单位在业务项目里并存，边界要分清：

| 样式归属 | 单位 | 转换 |
|---------|------|------|
| `@shwkj/taro-ui` 组件库样式 | 物理 px | 排除，不转换 |
| `--shw-*` token 定义文件 | 物理 px | 排除，不转换 |
| 业务页面/布局样式 | 按项目口径（rpx） | 正常 pxtransform 转换 |

- **消费方项目必须配置 pxtransform exclude**：在项目 `config/index.ts` 把组件库路径与 token 文件路径排除在 `px→rem/rpx` 转换之外，否则组件整体偏小（详细配置见组件库 README「必须配置 pxtransform exclude」章节）。这是接入组件库的第一步，没配 = 页面视觉全错
- 业务页面样式与组件库样式**不混写同一文件**；新增"禁止转换"的样式文件放进 exclude 路径，不散落各处
- 组件库样式内**禁止 rpx**（不会被转换，H5 直接失效）

---

## 页面栈与导航

- 层级导航用 `navigateTo` 压栈，**页面栈深度 ≤ 10**（小程序硬限制），连续流程用 `redirectTo` 替换而不是无限压栈
- 编辑保存成功后返回列表页用 `navigateBack` 并通知上一页刷新（事件通道/全局事件），**不重新 navigateTo 一个新列表页**（叠栈）
- Tab 级页面切换只用 `switchTab`
- 导航栏用 `<ShwNavBar>`（随 ShwLayout 内置），返回箭头由布局智能处理，业务不自绘导航

## 微信开发者工具自动化边界

### Taro 分端编译输出

在 Taro 项目的 `config/index.ts`（或 `.js`）中按平台配置：

```ts
outputRoot: `dist/${process.env.TARO_ENV}`,
```

- H5 输出到 `dist/h5/`，微信小程序输出到 `dist/weapp/`，不得共用 `dist/` 根目录作为两端输出。开发 watch 与生产 build 使用同一分端约定。
- 同步微信开发者工具 `miniprogramRoot`、自动化项目/产物路径、小程序 CI 上传路径，以及 H5 部署、Docker COPY 和产物归档路径。路径按各自配置文件所在位置解析；根目录的开发者工具配置应指向 `dist/weapp/`，不能只改 outputRoot 而留下旧引用。
- 编译清理仅限当前平台输出目录，禁止因编译 H5 删除微信产物或反之；排查脚本、构建 hooks 和 CI 中清空整个 dist 的行为。业务项目迁移在其自身 Issue 工作区完成。

### 保持调试项目与连接

- 项目已经打开且可正常调试时，修改代码必须保持项目打开，复用现有自动化连接和 watch 编译；等待本次编译完成后继续调试，不以每次改代码为由关闭、重开项目或反复 launch。连接断开时先重连已有项目；确有卡死再按下述恢复边界处理。

- 本地调试微信小程序时，打开微信开发者工具后，页面导航、交互、断言、日志获取和调试控制全程使用微信 `automate-ci` 工具，不得直接使用 Computer Use 操作开发者工具完成调试。
- Computer Use 可直接用于打开微信开发者工具和截图；截图是观察证据，不替代 `automate-ci` 的确定性操作与断言。
- 微信开发者工具卡死时，Computer Use 可直接关闭工具和触发重新编译，无需用户确认。
- 除打开、截图以及卡死时关闭工具和重新编译外，任何 Computer Use 操作都必须先向用户说明拟执行内容并逐次取得明确确认；一次确认不得扩展为后续长期授权。

---

## 移动端操作逻辑落地

（通用铁律见 shw-frontend-spec-common，以下是移动端口径）

### 详情与编辑

- 详情/编辑页进入时**用路由参数的 id 调详情接口**，不从列表页把整行数据序列化塞进路由参数（路由参数有长度限制且同样是过期快照）
- 编辑保存成功 → `navigateBack` → 通知列表页刷新

### 列表交互

- 首屏骨架屏用 `<ShwSkeleton>` 系列（skeleton/avatar/image/paragraph/title 按内容形态拼）；下拉刷新重置第一页；上拉触底加载下一页
- 空态/加载态/出错态用 `<ShwEmpty>` / `<ShwLoadingView>` / `<ShwForbiddenView>`，不空白、不自绘
- 到底展示"没有更多了"；空态区分"无数据/无网络/查询无结果"
- 快速切页竞态防护（见通用规范）：旧页响应不得覆盖新页

### 表单交互

- 表单一律 `<ShwForm>` + `<ShwFormItem>` + `<ShwField>` 系组件拼装，不自写输入行
- 单列纵向排布；校验错误就地标红 + 具体原因文案（走 Form 校验体系）；提交失败滚动到第一个错误项
- 提交按钮沉底（`<ShwActionBar>`），提交中 loading/禁用防双击（移动端双击是高频误操作）
- 上传用 `<ShwUpload>`、评分 `<ShwRate>`、开关 `<ShwSwitch>` 等库组件，不自造

### 反馈

- 轻提示 `<ShwToast>`/`<ShwNotify>`；**轻提示不承载关键结论**（下单成功这类用结果页/`<ShwDialog>` 确认）
- 危险操作（删除/取消订单）用 `<ShwDialog>` 或 `<ShwActionSheet>` 确认，文案带对象标识
- 网络异常页提供"重新加载"，不只展示错误图

---

## 红旗 — 停下

- 详情页数据来自列表行透传（含路由参数塞整行 JSON）（严重，见通用规范）
- 手写按钮/输入框/弹层/空态，而库里已有对应 `Shw*` 组件
- 样式硬编码颜色，不走 `var(--shw-*, fallback)`
- 没配 pxtransform exclude，组件整体偏小
- 业务代码写暗黑模式判断分支（应靠容器级联）
- 保存成功后 navigateTo 新列表页叠栈
- 页面根下游离内容没包 `<ShwSection>`
- 提交按钮无防双击
- 打开微信开发者工具后绕过 `automate-ci`，直接用 Computer Use 导航或调试；或在免确认范围外未获用户逐次确认便操作

## 审计应用

对移动端项目逐页审查时，优先核对：详情/编辑数据来源、是否用了库组件（手写 UI 即违规）、pxtransform exclude 配置、主题变量使用（grep 硬编码色值）、页面栈使用（叠栈/超深），以及微信开发者工具是否由 `automate-ci` 控制。产出逐页违规清单（页面文件 + 违规项 + 级别）后统一修复。

## 纯 HTML 原型适用性

生产页面仍必须按上述规则使用真实Shw组件。浏览器HTML原型优先复用项目已有可运行H5组件资产；没有此构建时可按已验证组件文档与--shw-*主题变量作明确标注的原型表达，并记录对应Shw组件，不能把自写HTML当组件实现或小程序/原生端验收。直接写Shw标签不会使浏览器自动具备Taro运行时。
