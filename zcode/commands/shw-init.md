---
description: 初始化项目 - 创建 .changes/ + specs/ 目录 + 在 AGENTS.md 追加 change 管理说明。仅项目首次初始化使用；已初始化项目勿用（开新 change 用 /shw-propose）
argument-hint: [项目名]
---

初始化项目，挂载 change 管理工作流。此命令会：

1. 创建 `.changes/`（工作区，不进 git）和 `specs/`（交付物，git 跟踪）目录
2. 在 `AGENTS.md` 追加 change 管理说明（不覆盖已有内容）

**新项目或已有项目都适用。** 只管 change 管理基础设施，不引入技术栈模板或开发流程定义——那些是 agent 按需从 skill 加载的，不混进初始化。

---

**步骤**

1. **运行时守卫：检查项目是否已初始化**

   检查项目根的 `.changes/` 目录（或 `.changes/config.yaml`）是否已存在。

   - 若**已存在**：**立即停止执行**——不创建任何文件、不追加任何内容，向用户输出以下话术然后结束：

     > 本项目已初始化过 change 管理（.changes/ 已存在）。开新 change 请用 /shw-propose；/shw-init 仅用于未初始化项目的首次初始化。

   - 若**不存在**：继续后续步骤。

2. **创建目录结构**

   守卫已确认 `.changes/` 不存在，直接创建：
     ```bash
     mkdir -p specs .changes .changes/archive
     ```
     创建 `.changes/config.yaml`：
     ```yaml
     schema: spec-driven
     ```
     创建 `.gitkeep` 占位（确保空 specs 目录能被 git 跟踪）：
     ```bash
     touch specs/.gitkeep
     ```
     并将 `.changes/` 加入 `.gitignore`（工作区不进 git）：
     ```bash
     # 检查 .gitignore 是否已有 .changes/ 条目，避免重复
     grep -qxF '.changes/' .gitignore 2>/dev/null || echo '.changes/' >> .gitignore
     ```

3. **处理 AGENTS.md**

   根据项目现状分两种情况：

   **情况 A：已有 AGENTS.md**

   检查 AGENTS.md 中是否已有 "change 管理" 章节。若**没有**，在末尾追加：

   ```markdown

   ## change 管理

   本项目使用 change 管理流进行功能开发：
   - `/shw-explore` 探索需求
   - `/shw-propose` 创建 change（proposal + design + tasks）
   - `/shw-apply` 用子智能体并行实现 tasks
   - `/shw-sync` 同步 delta spec 到主 spec
   - `/shw-archive` 归档已完成的 change

   速查：开新 change → `/shw-propose`（`/shw-init` 仅首次初始化用）

   规格文档在 `specs/`（git 跟踪），变更记录在 `.changes/`（不进 git）。
   ```

   若已有该章节，跳过，不重复追加。

   **情况 B：无 AGENTS.md**

   生成一个极简 AGENTS.md：

   ```markdown
   # <项目名>

   ## 项目概述

   <从 package.json / README / 用户描述推断，一句话说明项目是什么>

   ## change 管理

   本项目使用 change 管理流进行功能开发：
   - `/shw-explore` 探索需求
   - `/shw-propose` 创建 change（proposal + design + tasks）
   - `/shw-apply` 用子智能体并行实现 tasks
   - `/shw-sync` 同步 delta spec 到主 spec
   - `/shw-archive` 归档已完成的 change

   速查：开新 change → `/shw-propose`（`/shw-init` 仅首次初始化用）

   规格文档在 `specs/`（git 跟踪），变更记录在 `.changes/`（不进 git）。
   ```

   若项目名/概述无法从上下文推断，向用户提问。

4. **显示总结**

   ```
   ## ✅ 初始化完成

   **项目：** <name>
   **工作区：** ✓ .changes/ + specs/ 已就绪
   **AGENTS.md：** ✓ 已追加/创建（change 管理说明）

   ### 下一步
   1. 用 /shw-explore 探索需求
   2. 用 /shw-propose <change名> 创建 change
   3. 用 /shw-apply 实现
   4. 用 /shw-sync 同步 spec
   5. 用 /shw-archive 归档
   ```

**约束**
- **绝不覆盖或改动**已有 AGENTS.md 中用户手写的内容（只追加末尾段落）
- **不加载**任何 skill——初始化只管基础设施
- **不生成**技术栈模板、目录结构骨架、反模式清单——需要时 agent 从 skill 按需加载
- 若 `.changes/` 已存在，立即停止执行并指向 /shw-propose（步骤 1 守卫），不创建任何文件、不追加任何内容
- 任何不清楚的地方，向用户提问——不要猜
