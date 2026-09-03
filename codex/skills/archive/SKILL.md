---
name: archive
description: "Codex prompt workflow for archive、/archive. 归档已完成的 change——合并 PR（核对 CI 全绿、用户确认）→ 执行轨迹回写关联 Issue → 本地 .changes/ 草稿清理 Use only when the user explicitly asks for this named workflow."
---

# archive

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `archive`、`/archive` 或要求执行该工作流时按下方原文执行。

**参数**：[change名]

归档已完成的 change：核对交付状态 → 合并 PR（用户确认下核对 CI 全绿并合并）→ 执行轨迹回写关联 Issue（经 gitea-mcp 评论）→ 清理本地 `.changes/` 草稿。本命令是 change 族交付的最后一环：合并就发生在归档环节内——apply 之后仍可继续修改，直到归档时才把 PR 落主干。归档**不产任何 specs 产物、不做 spec 合并**——多真相源问题不存在；留痕只有两处：Issue 评论（执行轨迹）与 git 主干（PR/merge commit）。本命令与 /apply 同属**执行段**——只依赖三件套固化产物，可委派给无探索上下文的其他 agent/会话。

**输入**：可选 change 名。省略时列 `.changes/` 下活跃 change（排除 `archive/`）让用户选；模糊或歧义时**必须问**，不猜。

---

**步骤**

1. **读 change**

   读 `.changes/<change名>/` 的 proposal.md / design.md / tasks.md，从 proposal 顶部 `Refs: #N` 取关联 Issue（可能无）。

2. **核对交付状态**

   - **tasks.md**：数 `- [ ]` vs `- [x]`——有未完成任务 → 警告列出，经用户确认后继续或停下
   - **PR CI 状态**（有 PR 时）：按 shw-gitea-ci 口径查 PR 对应 run——CI 全绿？未全绿 → 警告并停，等用户排查修复；除非用户明确要放弃此 change，否则不做现状归档。用户确认放弃时继续 = 确认现状归档（按当前 PR 状态留痕）

3. **合并 PR**

   - 核对发现 PR 已合并（编排模式自动合并、或用户已手动合并）→ 跳过本步，直接进入回写
   - CI 全绿 → 向用户确认是否合并（**用户拥有合并确认权——agent 不静默合并**）
   - 用户确认 → 经 gitea-mcp/API 合并（目标 dev；hotfix 分支目标 main 仅用户自己合——提示用户合并后 cherry-pick 回 dev）
   - PR 描述含 `Closes #N` → 随合并自动关闭关联 Issue
   - 合并后删除远端分支
   - 用户选择不合并 → 停止归档，保留 `.changes/` 草稿待后续再跑本命令

4. **执行轨迹回写（有关联 Issue 时）**

   经 gitea-mcp 向关联 Issue 追加归档评论：

   ````markdown
   ### YYYY-MM-DD 归档：<change-name>

   - **交付摘要**：<一到三句：做了什么、效果>
   - **PR**：<编号/标题>（已合并，CI 全绿）
   - **遗留**：<豁免未修的 🟡 项（逐条附豁免理由）/ 未完成任务；无则写"无">
   ````

   Issue 若还 open（无 `Closes` 的场景）→ 询问用户是否关闭。无关联 Issue → 跳过本步。

5. **本地清理**

   ```bash
   rm -rf ".changes/<change名>"
   ```

   `.changes/` 是 gitignore 本地草稿——删除即消失，无 commit 需要；执行轨迹已沉淀在 Issue 评论，代码已在归档环节合并，无需本地保留。若用户想留底，可改为移入 `.changes/archive/YYYY-MM-DD-<name>/`（同样不入库），按用户选择。

6. **显示摘要**

   ```
   ## 归档完成

   **Change：** <change-name>
   **关联 Issue：** #<N>（轨迹已回写评论）/ 无关联
   **交付：** PR <编号> 已合并（本次归档环节）/ <警告说明>
   **本地：** .changes/<change-name>/ 已清理
   ```

---

**约束**

- **归档不执行任何测试**——验证已在本地编译级检查与 PR CI 完成，收口采信其记录；合并动作采信 CI 全绿结论，不重跑测试
- **不产 specs、不做任何 spec 合并**——specs 层已退役且不回来
- **轨迹回写是归档的实质动作**——有关联 Issue 却跳过回写等于没归档；用户明确说"不用回写"才可跳过
- **合并必须用户确认**——agent 不静默合并任何 PR；本命令管 change 族（有三件套）的合并归档，微活链的合并收尾归 /wrap
- 本地清理默认删除；留底迁移到 `.changes/archive/` 需用户选择
- 未完成任务警告、CI 未全绿仅放弃场景可继续，均需用户确认覆盖
