---
description: 需求入口处理——接需求建 Issue，澄清对话后把背景/目标/约束/初步范围整理进 Issue，判定微活/小活/大活并指路后续命令链。
argument-hint: [需求描述 或 Issue 编号]
---

处理一条需求的入口：从需求建 Issue，澄清对话收敛后把初步整理写回 Issue，判定微活/小活/大活。文档三件套（PRD/原型/技术方案）由各自命令族承接，本命令不产出 docs 文件。Issue 是这条需求生命的 thread，后续阶段用状态 label 表达。

**输入**：`/shw-issue <需求描述 | Issue 编号>`。执行前先加载 `shw-gitea-flow` skill。

**explore 姿态（澄清阶段保留）**：好奇不强加、抛线索不是审讯、用 ASCII 图助澄清、先读代码再提问、不要急于结论。**explorer 不写生产代码，也不写 docs 文件**——产出物只有 Issue 本身。

---

## 步骤

### 1. 需求入口

- 输入是 Issue 编号：读取 Issue + 评论时间线，跳到步骤 2
- 输入是需求描述：先做 2~3 轮快问快答确认理解，然后经 gitea-mcp 建 Issue（标题一句话 + 正文写背景/目标/约束，打 `backlog` label），声明 Issue 编号
- 项目没初始化过工作流（无 `<!-- shw-workflow:v6 -->` 标记）：检测目标目录是否有实质内容——空项目/新项目提示跑 `/shw-init`，已有代码的存量项目提示跑 `/shw-import`

### 2. 澄清与初步整理

- 读相关代码与现有 `docs/prd/`，基于事实提问，一次问一组不挤牙膏
- 澄清收敛后把**初步整理**经 gitea-mcp 写回 Issue（更新正文或评论）：背景与动机、目标、约束、初步范围（涉及哪些模块/表/界面）、与现有 docs 的关联链接。摘要级即可，细节留给文档三件套——Issue 不承载文档内容
- 判定规格（**必须经用户确认**）：三层定义的单一真源在 `shw-gitea-flow` §6，此处只给一句话判据：
  - **微活**（单文件单点修改、不碰逻辑结构）：跳到收尾并提示微活链
  - **小活**（三五句话能说清需求和做法的实现）：Issue 里补三五句话说明，跳到收尾并提示 change 族执行链
  - **大活**（跨多天/动表结构/定新契约）：与用户确认产出计划——PRD 必做（已有模块 PRD 则为追加）、HTML 原型有界面才做、技术方案必做
  - 判定权在用户（PO 决策，不替用户判定）；边界模糊保守缺省走小活

### 3. 收尾

汇报：Issue 编号、初步整理摘要、规格判定。

- **微活**提示微活链（`/shw-do <N>` → `/shw-wrap <N>`，wrap 含回写、提 PR、盯 CI、全绿自动合并）：

```
/shw-do <N> → /shw-wrap <N>
```

- **小活**提示 change 族执行链（差距调查 → 固化 → 测试起稿 → 对齐审查 → 执行 → 归档）：

```
/shw-explore <N> → /shw-propose <N>（同会话）→ /shw-test-draft <N> → /shw-test-review <N> → /shw-apply → /shw-archive
```

- **大活**提示文档三件套命令链与顺序纪律：

```
/shw-prd-draft → /shw-proto-draft（有界面时）→ /shw-arch-draft
```

**顺序不可反**：表结构/API 契约从界面反推，技术方案永远是三件套最后一个。每块各有 review 命令（`/shw-prd-review`、`/shw-proto-review`、`/shw-arch-review`）——审出问题经你裁决直接修正，主动增改走各 draft 的追加模式；三件套齐后再 `/shw-milestone` 排期 → test 族起稿审查 → `/shw-roadmap` 执行。过程中被否的方案与踩坑按 `shw-work-journal` 记入 `docs/journal/issue-N.md`。

---

## 约束

- **不写生产代码、不写 docs 文件**——产出物只有 Issue；三件套归 prd/proto/arch 命令族
- **Issue 不承载文档内容**——初步整理是摘要级（背景/目标/约束/范围/链接），真相源在 `docs/`
- **规格判定经用户确认**——微活/小活/大活是用户的 PO 决策，不替用户判定
