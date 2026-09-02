---
name: shw-arch-draft
description: "Codex prompt workflow for shw-arch-draft、/shw-arch-draft. 起草/增改技术方案——读 Issue+PRD+原型→八章节方案（表结构/API 契约/核心流程）→design-review 对照 PRD 一致性→用户拍板范围/表结构/权衡→docs PR，合入即 Definition of Ready（转 status/待开发） Use only when the user explicitly asks for this named workflow."
---

# shw-arch-draft

这是共享源码中同名 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `shw-arch-draft`、`/shw-arch-draft` 或要求执行该工作流时按下方原文执行。

**参数**：[Issue 编号 或 功能名]

起草功能技术方案或增改已有方案：从 Issue、PRD、原型反推技术设计，产出八章节方案落盘 `docs/architecture/<功能>.md`，加载 `shw-design-review` skill 对照 PRD 做一致性检查，用户拍板三处后提 docs PR。**技术方案是文档三件套最后一个**——本命令的 docs PR 合入即三件套齐备，Issue 转 `status/待开发`（Definition of Ready）。

---

**输入**：`/shw-arch-draft` 后的参数是 Issue 编号（优先——可反查 PRD/原型关联与时间线裁决）或功能名（对应 `docs/architecture/<功能名>.md`）。

**步骤**

1. **前置校验与领单**

   - 参数是 Issue 编号：经 gitea-mcp 读 Issue（正文 + 评论时间线），**读到否决裁决的问题不再重提**
   - 定位 PRD 对应章节（`docs/prd/<模块>.md`）：不存在 → 提示先 `/shw-prd-draft`，停止
   - **有界面的活**：原型必须已存在（`docs/design/<功能>.html`；不存在 → 提示先 `/shw-proto-draft`，停止——表结构/API 契约从界面反推，跳过原型必然返工）；纯后端活跳过原型检查
   - 关联 Issue 仍带 `backlog` label → 打 `status/方案中` 摘 `backlog`（文档三件套领单）；已在 `status/方案中` 则不动
   - 已有方案 → **追加模式**：先通读现有方案，只增改涉及章节，不重排未受影响的节

2. **起草八章节**

   背景 / 目标与非目标 / 总体设计 / 详细设计（表结构 + API 契约 + 核心流程）/ 非功能性 / 兼容迁移 / 测试策略 / 备选与风险：

   - **写决策不抄代码**，粒度对齐工作量
   - 表结构与 API 契约从原型反推（有界面时）；纯后端活从 PRD 反推
   - **测试策略**章节把 PRD 验收标准对齐为 E2E/VRT 用例规划（`TC:` 命名）——`/shw-propose` 生成验收 checklist 时直接引用
   - 起草时没想清的节落空占位注释 `<!-- 待 /shw-arch-review 补齐 -->`，逼审查补齐

3. **一致性检查与用户拍板**

   - 加载 `shw-design-review` skill：对照 PRD（与原型）做一致性检查（agent 自主）；PRD 未覆盖的设计点逐项让用户确认
   - 用户拍板三处：**范围**、**表结构契约**、**权衡**——未拍板不提 PR

4. **提 docs PR 并转待开发**

   - 按 `shw-gitea-flow` skill 关联纪律提交：从 dev 建分支、commit、经 gitea-mcp 建 docs PR（目标 dev），描述写 `Refs #N`；该 Issue 已有未合并的 docs PR 时 commit 追加到同一分支，不另开 PR
   - **PR 合入后**：Issue 仍处 `status/方案中` → 打 `status/待开发` 摘 `status/方案中`（三件套齐备 = Definition of Ready）；Issue 已在其后状态（如开发中补方案）则不动
   - 汇报：方案路径、PR 链接；提醒下一步 `/shw-milestone`（Sprint 计划排期挑单）

---

## 约束

- **三件套顺序不可反**：PRD → 原型（有界面时）→ 技术方案
- **方案 docs PR 合入是唯一 `status/待开发` 转入点**——prd/proto 的 PR 合入不转状态
- **写决策不抄代码**——方案记录为什么这么设计，不复制实现细节
- **用户未拍板不提 PR**：范围/表结构契约/权衡三处确认是硬门
- **变更必走 docs PR**（`Refs #N`，目标 dev），不直接 commit 到 dev/main；PR 内不写变更记录章节
