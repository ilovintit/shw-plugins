---
description: 当前宿主 Agent 按公司前端规范直接创建或增量维护高保真 HTML 原型，组织 docs/design 多端入口、浏览器反馈和同一产品 PR 交付。
argument-hint: [产品定义 Issue 或入口范围]
---

**项目外只读**：所有原型文件写入当前Issue工作区，执行前读取 `shw-issue-gate`。

加载 `shw-design-spec`、`shw-product-docs`、`shw-frontend-stack`、`shw-frontend-spec-common`、对应端规范、`shw-docs-review` 和 `shw-worktree`。

1. 关联产品定义Issue并读取唯一PRD、公司组件规范和现有 `docs/design/`。从事实推导角色、端和页面，不重复问产品形态；缺失或冲突的业务决定才回用户。
2. 记录干净工作区基线、旧页面与依赖。按 `shw-design-spec/references/structure.md` 组织产品index、端入口、语义页面、端内共享资源及显式模拟数据；复用已有结构，不按Issue复制原型或从零重做。
3. 当前Agent直接在这套文件中完成高保真HTML/CSS/JS和交互；公司规范决定组件、主题与行为，不从外部平台导入另一套风格。原型与生产框架分清，组件仿真和模拟接口必须标注，详情按ID走独立adapter而非列表行透传。
4. 使用本项目的预览入口直接打开浏览器，逐端检查布局、状态、导航、权限表达、响应式与关键交互。用户反馈后修改原文件并重新预览；不派发外部设计任务、不建立第二套项目或轮询外部生成状态。
5. 用户明确接受后清理被替代文件，并从 `docs/design/index.html` 重走入口和关键流程。保留完整依赖、模拟范围、验收commit及未实测项；可选 `ui-design.md`只作实现映射，不是独立视觉阶段。
6. 复验通过后提交同一个draft产品定义PR，继续architecture与product-review，零阻断才合入dev。浏览器不可用或执行失去有效进展时报告具体阻塞与已完成文件，不用文字断言/重复等待冒充验收。

一个业务项目只有一套按真实角色与端组织的原型，唯一目录为 `docs/design/`。旧外部制品使用一次完整导出迁入后直接维护；不操作其项目、账号或配置。纯后端产品在索引说明不适用，不制造虚假界面或把业务截图/VRT放进插件仓库。
