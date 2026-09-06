---
name: shw-product-docs
description: 产品文档真相模型。维护唯一产品级 PRD、按入口拆分的高保真原型族、整体架构入口与按端/服务/领域拆分的技术文档族；用于 product/prototype/architecture/product-review/init/update/version。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# 产品文档真相模型

## 三类真相

```text
docs/prd/product.md
        │ 产品目标、用户、业务规则、验收结果
        ├──────────────┐
        ▼              ▼
docs/design/       docs/architecture/
多入口原型族        整体技术文档族
```

### PRD：一份产品级当前真相

- 固定入口 `docs/prd/product.md`。
- 不按管理端、用户端、模块或版本复制 PRD；这些都是同一产品目标的组成部分。
- 历史由 Git/PR/tag 保存。当前文件只表达当前有效形态。
- 内容至少覆盖：目标用户、问题与价值、目标/非目标、范围、角色权限、业务规则、关键流程、状态/异常、数据口径、验收标准。

### 原型：一个索引，多份入口原型

- 固定产品索引 `docs/design/index.html`，列出全部入口、角色和跨入口用户旅程。
- 每个独立交互入口使用 `docs/design/<entry>/index.html`，例如 admin、user、mobile；必要时入口内再按功能拆文件。
- 每个入口必须是可点击、高保真、可独立验收的完整体验，不把多个端硬塞进一个文件。
- 业务规则只在 PRD 定义；原型展示规则，不另造规则真相。
- 无界面产品可明确不适用，但必须有事实依据。

### 架构：一个入口，多份按边界拆分文档

- 固定整体入口 `docs/architecture/index.md`。
- 可按 clients、services、domains、data、apis、security、testing、deployment 拆分。
- 每个子文档必须由 index 索引；跨文档契约只有一个权威定义位置。
- 部署/分发设计按产品形态：Kubernetes 应用说明项目内声明、Fleet、镜像、回滚与权限；插件/库/CLI 说明包或发布仓库、安装升级、回退与使用验证，不适用项写明依据。

## 一致性规则

1. PRD 的每个关键流程都能在适用原型中走通，并有架构能力支撑。
2. 原型中的每个字段、动作和权限都能回指 PRD。
3. 架构公开的能力、数据和接口不能暗中扩张产品范围。
4. 多端之间的提交、审核、配置生效等跨入口动作必须在索引中闭环。
5. 不确定内容标记待裁决并询问用户；禁止用 TODO 填充后声称文档完整。

产品定义变更使用一个 Issue、一个 worktree、一个分支和一个 docs PR。重要被否方案写 Issue/Journal，不污染当前真相。
