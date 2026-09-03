---
name: milestone
description: "Codex prompt workflow for milestone、/milestone. Sprint 计划——开 Milestone，从 status/待开发 label 的 Issue 里挑，大活拆分裁决，为每个 Issue 生成验收 checklist 写回 Issue 描述。 Use only when the user explicitly asks for this named workflow."
---

# milestone

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `milestone`、`/milestone` 或要求执行该工作流时按下方原文执行。

**参数**：[Sprint 名（可选，默认按序号）]

做一次 **Sprint 计划**：开 Milestone、从 `status/待开发` label 的 Issue 里挑、逐个生成验收 checklist。Sprint 计划只从这里挑——`status/待开发` 就是 Definition of Ready（PRD/原型/技术方案已全合入）。

**输入**：可选 Sprint 名（如 `sprint-3` 或主题名）。执行前先加载 `shw-gitea-flow` skill。

---

## 步骤

### 1. 开 Milestone

- 经 gitea-mcp 建 Milestone（名 = 输入或按序自动 `sprint-N`；截止日期 = 默认两周后，用户可改）
- 已有未完成 Milestone 时先列出其完成度，问用户是继续用还是开新的

### 2. 候选清单

经 gitea-mcp 列出 `is:open label:status/待开发` 的 Issue。每个候选展示：编号、标题、规模感受（大活是否已拆子 Issue）、关联 docs 链接。

### 3. 用户挑选

用户从中挑本次 Sprint 的 Issue（单人场景用户是唯一 PO——不替用户做优先级决策）。**挑选确认后即经 gitea-mcp 把入选 Issue 挂上本 Milestone**——挂单是排期语义（属于哪个 Sprint），状态 label 流转（待开发 → 开发中）仍在 apply 领单时。

### 4. 大活拆分裁决（入选 Issue 太大时）

对入选的大活逐个判断是否需要拆——判断依据：技术方案的模块/表边界天然可分、单 Issue 体量超出本 Sprint 容量（默认两周）、需要多会话并行推进。**需要拆的，拆分在本命令执行**：

- **agent 出拆分建议**：依据父 Issue 的技术方案章节提出子 Issue 清单——每个子 Issue 的标题、范围（对应方案哪几章/哪几张表）、与兄弟 Issue 的依赖关系
- **用户裁决拆分边界**：拆几个、每个的范围——确认后才动 Gitea，不替用户拆
- **经 gitea-mcp 建子 Issue**：打 `status/待开发` + 类型 label（feat/bug/chore 按实际）——父 Issue 方案已合入，子 Issue 直接继承 DoR，不走 backlog/方案中；描述写父 Issue 编号 + 对应方案章节链接，不复制文档内容；入选即挂本 Milestone（与其他 Issue 同纪律）
- **父 Issue 处理**：打 `epic` label 留作线索——不挂 Milestone、不关闭；全部子 Issue 关闭后收口关闭（Sprint Review 核对时顺手）
- 不需要拆的大活保持单 Issue 进下一步

### 5. 生成验收 checklist

对每个入选 Issue（含拆出的子 Issue），把其技术方案的"测试策略"章节 + PRD 验收标准转写为**可勾选 checklist**，每条注明对应 E2E/VRT 用例名（还没有用例名的标 `TC:` 占位），经 gitea-mcp 写回 Issue 描述末尾：

```markdown
## 验收 checklist
- [ ] AC1 <验收标准描述>（TC: <e2e 用例名>）
- [ ] AC2 <验收标准描述>（VRT: <场景名>）
- [ ] 交付文档已更新（README / docs/prd 与实现对齐）
```

### 6. 汇报

```
## ✅ Sprint 计划完成

**Milestone：** <名>（截止 <日期>）
**入选：** #12 <标题>、#15 <标题>（checklist 已写入）
**拆分：** #12 → #21 <标题>、#22 <标题>（父 #12 打 epic 留线索）
**留在待开发：** #18 <标题>（下批候选）

下一步：测试用例起稿 `/test-draft`（本 Milestone 全部 Issue）→ 对齐审查 `/test-review`（红黄清零放行）→ `/roadmap` 执行驱动（逐 Issue explore → propose → apply → archive，合并进 dev）→ `/review` 终审 → dev→main 放行 PR（用户确认合并）→ tag 发布。
```

---

## 约束

- **不替用户挑 Issue、不替用户拆分**——优先级与拆分边界都是用户的 PO 决策
- **checklist 必须逐条可取证**——对应 E2E/VRT 用例名或明确的人工验收动作
- **子 Issue 不再走 explore/文档三件套**——父 Issue 的方案即子 Issue 的方案，出生即 DoR
- **本命令不搬代码、不开分支**——那是 /apply 的事；Issue 挂 Milestone 发生在本命令挑选确认时，挪"开发中"发生在 apply 领单时
