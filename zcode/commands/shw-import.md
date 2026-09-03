---
description: 存量项目导入 Issue 驱动工作流——工作流设施对齐 + specs 整理写入 Issue + 历史 Milestone 驱动真相源回补（PRD/HTML 高保真原型/技术文档）。空项目请走 /shw-init
argument-hint: [项目路径，默认当前目录]
---

把**已有代码的存量项目**接入 Issue 驱动工作流：先对齐工作流设施，再把存量 specs（或从代码结构推导的模块清单）整理写入 Issue，建一个**历史 Milestone** 作为回补容器——逐 Issue 回补真相源（PRD、HTML 高保真 UI+UX 原型、技术文档），回补完成后旧 specs 退役。空项目初始化走 `/shw-init`；已接入项目的插件升级迁移走 `/shw-update`。

**输入**：可选项目路径（默认当前目录）。执行前加载 `shw-gitea-flow` skill。

---

## 步骤

### 1. 项目体检

输出体检报告（给后续步骤供料）：

- **技术栈识别**（go.mod / package.json+taro / vite+element-plus / composer.json+hyperf）
- **存量规模**：模块/目录结构一览（供模块清单推导）
- **旧工作流残留**：`specs/`（逐模块清单）、`.changes/`（v5 草稿，其下 `specs/` 子目录单独标出）、`.roadmaps/`
- **Gitea 仓库**：远端是否存在、label 齐缺、现有 Issue/Milestone 概况

### 2. 工作流设施对齐（幂等，缺什么补什么）

- 本地骨架补缺：`docs/{prd,design,architecture,journal}/`、`e2e/`、`tests/vrt/`、`.changes/`（写入 .gitignore）
- AGENTS.md 追加 v6 工作流区段（`<!-- shw-workflow:v6 -->` 标记，模板见 /shw-init 步骤 4；已有旧 change 管理章节则整段替换）
- Gitea 流程设施：建齐 label（backlog / feat / bug / chore / retro / epic / status/* 四态）
- PR 门禁 workflow：`.gitea/workflows/pr-gate.yml` 缺失则按 `shw-gitea-repo` skill 模板生成（快速层 + API/E2E/VRT 全在 PR CI），输出分支保护设置指引（存量项目 CI 门禁往往缺失，重点补）

### 3. specs 整理写入 Issue

- **有 specs/**：逐模块（capability）经 gitea-mcp 建 Issue——标题 = 模块名，描述 = 该模块需求要点 + 验收条目 + 业务规则摘要（specs 原文要点完整写入，标注"迁移原料——回补 docs 后以 docs/ 为准"），打 `backlog`
- **无 specs/**：从代码结构推导模块清单（目录/路由/服务边界），逐模块展示给用户**确认边界后**建 Issue——不替用户划模块
- 旧 `.changes/` 中有 v5 `specs/` 子目录（delta spec）→ 同规则并入对应模块 Issue 后删除该子目录，change 草稿本体保留

### 4. 历史 Milestone（回补容器）

- 经 gitea-mcp 建 `import-<yyyymmdd>` Milestone（截止日期用户定——这是回补工作的目标线）
- 上述 Issue 全部挂上，每个 Issue 描述末尾追加**回补清单**：

  ```markdown
  ## 真相源回补清单
  - [ ] PRD：docs/prd/<模块>.md（走 /shw-prd-draft 追加模式）
  - [ ] HTML 原型：docs/design/<模块>.html（有界面的模块；走 /shw-proto-draft）
  - [ ] 技术文档：docs/architecture/<模块>.md（走 /shw-arch-draft）
  ```

  （按模块实际形态裁剪——纯后端模块无原型项）

### 5. 回补执行与收口

- **逐 Issue 回补**：走文档族命令（prd-draft 的追加模式以 Issue 描述中的迁移原料为访谈底稿 → docs PR `Refs #N`）——回补是分期的，一次跑不完正常，Milestone 在就看得到进度
- **单个 Issue 回补完成**：勾掉清单项 → 关单（回补类 Issue 无代码变更，不提 PR；关单评论附 docs 链接）
- **全部完成后收口**：关历史 Milestone → 经用户确认删除 `specs/`（`.roadmaps/` 同规则处理，内容已成 Issue 轨迹）→ 输出对齐报告（迁了多少模块、补了哪些 docs、遗留什么）
- 收口前 `specs/` 保持**只读**——回补期间不再更新 specs，真相源迁移期以 Issue 为准

---

## 约束

- **存量代码一行不动**——导入只对齐设施与文档，不重构不修码
- **模块边界经用户确认**——specs 有明确 capability 边界照用；推导清单必须用户拍板
- **specs 整理写入 Issue 后才可删**——删除经用户确认，git 历史兜底
- **回补走文档族命令**，不在本命令内一次性生成全部 docs（质量与上下文都不允许）
- 旧 AGENTS.md 用户手写内容不动，只替换 change 管理旧章节
