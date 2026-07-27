---
description: 归档已完成的 change
argument-hint: [change名]
---

归档已完成的 change。

**输入**：可选地指定 change 名。若省略，检查能否从对话上下文推断。若模糊或歧义，你**必须**询问用户可选的 change。

**步骤**

1. **若未提供 change 名，提示选择**

   调用 **shw-spec** 的 `list_changes` 工具（传入 projectRoot）获取可选 change。用向用户提问让用户选。

   只显示活跃 change（未归档）。

   **重要**：不要猜或自动选 change。始终让用户选。

2. **检查 artifact 完成状态**

   调用 **shw-spec** 的 `get_status` 工具（传入 projectRoot + changeName）检查 artifact 完成情况。

   返回：
   - `schemaName`：使用的工作流
   - `changeRoot`：change 目录路径
   - `artifactPaths`：各 artifact 的文件路径
   - `artifacts`：artifact 列表及其状态（`done` 或其他）

   **若任何 artifact 不是 `done`：**
   - 显示警告列出未完成 artifact
   - 用向用户提问确认用户是否继续
   - 用户确认后继续

3. **检查任务完成状态**

   读 task 文件（通常是 `tasks.md`）检查未完成任务。

   数 `- [ ]`（未完成）vs `- [x]`（已完成）的任务数。

   **若发现未完成任务：**
   - 显示警告展示未完成任务数
   - 用向用户提问确认用户是否继续
   - 用户确认后继续

   **若没有 task 文件：** 不带 task 相关警告继续。

4. **第二次代码审查（归档前复审）**

   加载 `shw-review-code` skill 做完整的逐字符代码复审。

   这是 change 生命周期中的第二次代码审查（第一次在 apply 完成后）。审查范围是 change 的全部代码变更，重点关注：
   - 多次 apply 累积后的集成一致性
   - 是否有后续变更破坏了之前的实现
   - 跨 task 的整体视角问题

   若有 🔴 项，必须修复后才能归档。阻断归档流程。

5. **评估 delta spec 同步状态（审查通过后才问）**

   用 status JSON 的 `artifactPaths.specs.existingOutputPaths` 检查 delta spec。

   **审查未通过时不会走到这一步**——审查是同步的前提，没过审查的 spec 不该污染主 spec。

   **若无 delta spec：** 跳过本步，直接进入第 6 步执行归档。

   **若有 delta spec：** 必须询问用户是否同步（**不要自作主张同步**）：
   - 向用户提问，提供选项：
     - "立即同步（推荐）" → 加载 `shw-sync-spec` skill 执行合并，完成后继续归档
     - "跳过同步直接归档"
   - 用户选"立即同步"才执行同步；用户选"跳过"则直接进入第 6 步

   **同步执行方式**：加载 `shw-sync-spec` skill（不是用户去执行命令）。该 skill 是纯执行型，不做用户交互——决策（是否同步）已在本步完成，skill 只负责合并工作。同步完成后把 skill 返回的合并摘要展示给用户。

6. **执行归档**

   若 `.changes/` 下不存在 `archive` 目录则创建：
   ```bash
   mkdir -p ".changes/archive"
   ```

   用当前日期生成目标名：`YYYY-MM-DD-<change-name>`

   **检查目标是否已存在：**
   - 是：失败并报错，建议重命名现有归档或用不同日期
   - 否：移动 `changeRoot` 到归档目录

   ```bash
   mv "<changeRoot>" ".changes/archive/YYYY-MM-DD-<name>"
   ```

7. **Git commit（自动提交，不 push）**

   归档完成后自动提交到 git，但**不执行 push**——push 由用户手动操作。

   注意：`.changes/` 是 gitignore 目录，归档目录本身不需要提交。只需提交 spec 同步产生的变更。

   1. 检测当前目录是否是 git 仓库：`git rev-parse --git-dir`
   2. `git add` spec 同步变更（若有）：
      ```bash
      git add specs/  # 如果 spec 有同步变更
      ```
   3. 提交，commit message 格式：
      ```bash
      git commit -m "归档变更: <change-name>

      - 归档: YYYY-MM-DD-<change-name>
      - schema: <schema-name>
      - 进度: <completed>/<total> tasks"
      ```
   4. **不执行 `git push`**——push 留给用户手动执行。

   **异常处理：**
   - 如果不是 git 仓库 → 跳过提交，在摘要中注明 "非 git 仓库，跳过提交"
   - 如果没有变更需要提交 → 跳过提交，在摘要中注明
   - git 命令出错 → 在摘要中注明错误信息，不影响归档结果

8. **显示摘要**

   展示归档完成摘要，含：
   - change 名
   - 使用的 schema
   - 归档位置
   - Git commit 状态（committed / skipped / error）
   - spec 是否已同步（若适用）
   - 关于任何警告的说明（未完成 artifact/task）

**成功时的输出**

```
## 归档完成

**Change：** <change-name>
**Schema：** <schema-name>
**归档到：** .changes/archive/YYYY-MM-DD-<name>/
**Git：** ✓ 已提交（请手动 push）
**Spec：** ✓ 已同步到主 spec（或 "无 delta spec" 或 "跳过同步"）

所有 artifact 完成。所有任务完成。
```

**约束**
- 未提供时始终提示选 change
- 未完成 artifact/task 警告但允许覆盖
- 验证归档目标不存在
- 清晰展示归档了什么
- 自动 commit 但不 push（push 由用户手动执行）
