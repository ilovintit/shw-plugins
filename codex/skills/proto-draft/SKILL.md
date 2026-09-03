---
name: proto-draft
description: "Codex prompt workflow for proto-draft、/proto-draft. 起草/增改功能 HTML 原型——读 Issue 与 PRD 反推界面结构→高保真交互原型（结构/字段/四态枚举齐全）→用户验收交互逻辑→落盘 docs/design/<功能>.html→提 docs PR（Refs #N） Use only when the user explicitly asks for this named workflow."
---

# proto-draft

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `proto-draft`、`/proto-draft` 或要求执行该工作流时按下方原文执行。

**参数**：[Issue 编号 或 功能名]

起草新功能 HTML 原型或增改已有原型：从 Issue 与 PRD 反推界面结构，产出高保真交互原型（结构 + 字段 + 四态枚举；结构字段冻结即可，视觉细节可后补），经用户验收交互逻辑后落盘 `docs/design/<功能>.html`，提 docs PR。

原型是**界面真相源**：表结构与 API 契约从界面反推（`/arch-draft` 依赖本产物），VRT 基线以此为锚。纯后端活（无界面）不需要本命令——直接 `/arch-draft`。

---

**输入**：`/proto-draft` 后的参数是 Issue 编号（优先——可反查 PRD 关联与时间线裁决）或功能名（对应 `docs/design/<功能名>.html`）。

**步骤**

1. **前置校验与领单**

   - 参数是 Issue 编号：经 gitea-mcp 读 Issue（正文 + 评论时间线），**读到否决裁决的问题不再重提**
   - 定位 PRD 对应章节（`docs/prd/<模块>.md`）：不存在 → 提示先 `/prd-draft`（原型从 PRD 反推，没有需求就没有界面），停止
   - 关联 Issue 仍带 `backlog` label → 打 `status/方案中` 摘 `backlog`（文档三件套领单）；已在 `status/方案中` 则不动
   - 已有原型 → **追加模式**：先通读现有 HTML，只增改涉及界面，不重排未受影响部分；识别出需求本身要改时提示走 `/prd-draft`（增改需求），不在原型里私改需求

2. **起草原型**

   - `docs/design/<功能>.html` 单文件高保真交互原型：页面结构、字段清单、**四态枚举**（正常/空/加载/错误）齐全
   - 前端视觉与栈规范按 `shw-frontend-spec-*` 系列 skill（Taro 多端 / PC 管理后台 pure-admin-thin / Nuxt 展示·大屏·应用）
   - 不写生产代码——HTML 原型是设计产物，不是前端实现

3. **用户验收交互逻辑（硬门）**

   - 展示原型，用户过一遍交互流：操作路径、状态反馈、误操作与恢复
   - 有出入处记录修改点，改完再审，收敛后落盘；未验收不提 PR

4. **提 docs PR**

   - 按 `shw-gitea-flow` skill 关联纪律提交：从 dev 建分支、commit、经 gitea-mcp 建 docs PR（目标 dev），描述写 `Refs #N`；该 Issue 已有未合并的 docs PR 时 commit 追加到同一分支，不另开 PR
   - 汇报：原型路径、PR 链接；提醒下一步 `/proto-review`（建议）或直接 `/arch-draft`（必做）

---

## 约束

- **前置顺序不可反**：PRD 必须先在；原型先于技术方案——跳过原型直接写方案会表加列、接口改出参
- **结构字段冻结、视觉可后补**——下游方案依赖的是结构与字段，不是像素
- **用户验收交互逻辑是硬门**：未验收不提 PR
- **变更必走 docs PR**（`Refs #N`，目标 dev），不直接 commit 到 dev/main；PR 内不写变更记录章节（留痕由 git 历史 + PR 描述承担）
