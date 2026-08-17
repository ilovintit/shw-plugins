---
description: 提出一个新 change - 创建它并一步生成所有 artifact
argument-hint: [change名或描述]
---

提出一个新 change - 创建 change 并一步生成所有 artifact。

我会创建一个包含以下 artifact 的 change：
- proposal.md（做什么 & 为什么）
- design.md（怎么做）
- tasks.md（实现步骤）

准备好实现时，运行 /shw-apply

---

**输入**：`/shw-propose` 后的参数是 change 名（kebab-case），或描述用户想做什么。

**步骤**

1. **若未提供输入，问用户想做什么**

   用向用户提问（开放性问题，不要预设选项）问：
   > "你想做什么 change？描述你想构建或修复的东西。"

   从描述中推导出 kebab-case 名（如 "add user authentication" → `add-user-auth`）。

   **重要**：理解用户想做什么之前不要继续。

2. **创建 change 目录**

   调用 **shw-spec** 的 `create_change` 工具（传入 projectRoot + changeName）。这会创建 change 目录结构 + `.change.yaml` 元数据。

3. **获取 artifact 构建顺序**

   调用 **shw-spec** 的 `get_status` 工具（传入 projectRoot + changeName），返回：
   - `applyRequires`：实现前需要的 artifact ID 数组（如 `["tasks"]`）
   - `artifacts`：所有 artifact 及其状态（done/ready/blocked）和依赖关系
   - `changeRoot`、`artifactPaths`：路径和文件位置

4. **按顺序创建 artifact，直到 apply 就绪**

   用任务清单跟踪 artifact 进度。

   按依赖顺序循环（先做无 pending 依赖的 artifact）：

   a. **对每个 `ready`（依赖已满足）的 artifact**：
      - 调用 **shw-spec** 的 `get_instructions` 工具（传入 projectRoot + changeName + artifactId），返回：
        - `template`：用于输出文件的结构
        - `instruction`：该 artifact 类型的 schema 特定指引
        - `resolvedOutputPath`：写入 artifact 的解析路径
        - `dependencies`：为获取上下文而需读取的已完成 artifact（含 done 状态和路径）
      - 读取已完成的依赖文件作为上下文
      - 用 `template` 作为结构创建 artifact 文件，写入 `resolvedOutputPath`
      - 把 `instruction` 作为约束应用——但**不要**把它复制进文件
      - 显示简短进度："已创建 <artifact-id>"

   b. **继续直到所有 `applyRequires` artifact 完成**
   - 每创建一个 artifact 后，重新调用 `get_status` 工具刷新状态
   - 检查 `applyRequires` 里的每个 artifact ID 在 artifacts 数组中是否 `status: "done"`
   - 全部 `applyRequires` artifact 完成时停止
   - 创建 `tasks` artifact 时，参考下方"Task 拆分粒度指引"控制粒度——目标是大多数 task 能在一次委派内完整交付，但保留必要的粗粒度任务

   c. **若某个 artifact 需要用户输入**（上下文不清晰）：
      - 用向用户提问澄清
      - 然后继续创建

5. **显示最终状态**

   调用 `get_status` 工具获取最终 artifact 状态并展示。

6. **循环：审查 -> 修复 -> 复审，直到收敛**

   所有 artifact 创建完毕后，进入自我审查阶段。**propose 的交付标准是"收敛到零偏差"，不是"审查过一次"**--所以审查和修复是循环进行的。

   #### 6.1 加载审查 skill

   加载 `shw-change-review` skill，对本次 propose 的全部 artifact（proposal/specs/design/tasks）做逐字符审查。审查维度（由 skill 定义）：
   - 需求覆盖完整性（explore 讨论的需求是否都在 artifact 中体现）
   - 方向一致性（技术选型/范围/优先级是否与讨论一致）
   - 内部自洽性（artifact 之间的交叉引用是否完整）
   - 表述精确性（是否有模糊/歧义/自相矛盾）

   #### 6.2 循环：审查 -> 修复 -> 复审

   ```
   loop:
     1. 加载/复用 shw-change-review skill 审查全部 artifact
        （首次审查范围 = 本次 propose 全部 artifact；后续复审范围 = 上次遗留问题 + 本次修复涉及的 artifact）
     2. 收集审查结果
        - 🔴 项（必须修复）：进入 step 3
        - 🟡 项（建议改进）：累积起来，最终输出时列出
        - ✅ 无 🔴：跳出循环，进入第 7 步输出
     3. 对每个 🔴 项，修复对应的 artifact
        - 直接编辑 artifact 文件（proposal.md / specs/ / design.md / tasks.md）
        - 修复要精准定位，不要盲目大改
     4. 修复完成后，回到 step 1 重新审查（只复审"上次遗留 🔴 + 本次修复涉及的 artifact"即可，不必从头全审）
   end loop
   ```

   **循环退出条件**：一次完整审查后**零 🔴 项**。

   **循环保护**：
   - 实务上绝大多数情况 1-3 轮即可收敛。若修复反复引入新问题（例如连续 5 轮仍有 🔴），停下来按第 7 步格式输出"卡在审查循环"，列出当前未解决的 🔴，让用户决策--**不要无限循环**。
   - 每一轮的修复要基于上一轮的审查结果精准定位，不要盲目大改。

   **为什么是循环而不是一次**：artifact 之间的偏差往往是相互关联的--改了 proposal 的范围可能暴露 design 的不一致，修了 design 又影响 tasks 的拆分。只有循环审查到收敛，才能确认 artifact 真正自洽。**这个收敛过程是 propose 的责任，不是用户的事**--不能交付一个"还残留 🔴、等用户发现再修"的状态。

**输出**

完成所有 artifact 并审查收敛后，总结：

```
## ✅ Propose 完成 - 可以开始实现

**Change：** <change-name>
**位置：** <change-root>

### 创建的 artifact
- proposal.md - <简短描述>
- specs/<capability>.md - <简短描述>
- design.md - <简短描述>
- tasks.md - <简短描述>

### 自我审查结果
<shw-change-review 审查摘要，含 🔴 项的修复记录>

🟡 待你决定的改进项（若有）：
- <改进项 1>
- <改进项 2>

---
**所有 artifact 已创建并审查通过！** 运行 `/shw-apply` 开始实现。
```

**若卡在审查循环**（连续 5 轮仍有 🔴），按下面格式停下等用户决策：

```
## ⏸ Propose 卡在审查循环

**Change：** <change-name>

### 当前未解决的 🔴
- <问题 1>
- <问题 2>

**选项：**
1. <选项 1>
2. <选项 2>
3. 其他方案

你想怎么做？
```

**Artifact 创建指引**

- 遵循 `get_instructions` 返回的 `instruction` 字段--它定义了每个 artifact 应该包含什么
- schema 定义了每个 artifact 应该包含什么--遵循它
- 创建新 artifact 前先读依赖 artifact 作为上下文
- 用 `template` 作为输出文件的结构--填充它的章节
- **重要**：`context` 和 `rules` 是给你的约束，不是文件内容
  - 不要把 `<context>`、`<rules>`、`<project_context>` 块复制进 artifact
  - 它们指导你写什么，但永远不应该出现在输出里

**设计评审强制确认（创建 design.md 时）**

若 design.md 涉及数据库表结构/字段设计/迁移，或后端 API 路由设计：
- **自动加载 `shw-change-design-review` skill**
- 该 skill 强制把每个字段的设计逻辑、每个路由的设计意图逐个展示给用户确认
- **不要等用户主动问**--主动展示，主动列出"需要确认的点"
- 用户确认后才把设计写入 design.md，不要偷偷写未确认的设计

**Task 拆分粒度指引（仅对 tasks.md）**

写 tasks.md 时，目标是把任务拆到**单次委派就能完整、准确交付**的粒度。不必过度拆细——只要每个 task 自包含、边界清晰即可。

**最高优先级是准确性**：拆分不能让任何单个 task 失真或丢信息。其次才是效率。如果某任务天然需要全局视野或跨模块强耦合，**保留粗粒度是对的**。

**目标粒度信号——一个 task 应该：**
- 触及 1 个清晰的模块或功能点（不是"整个用户系统"）
- 改动文件通常 ≤ 5 个（信号，不是硬上限）
- 能用一句话写出明确的 EXPECTED OUTCOME（创建/修改哪些文件 + 验证命令）
- 不需要"先理解整个系统才能动手"

**✅ 好的拆分：**
- task 1.2：创建用户表结构（单文件 + 迁移验证）
- task 1.3：创建用户数据模型（单文件）
- task 2.1：实现用户注册逻辑（单一功能）
- task 2.2：实现用户 API 端点 + 输入校验（单一功能组）

**❌ 过粗（通常可拆）：**
- task 1：实现整个用户系统（建表 + 模型 + 逻辑 + API 全包）
  → 通常可按功能点拆成 1.1/1.2/1.3/1.4
- task 2：实现订单功能（跨多个不相关的子系统）
  → 按子系统拆

**❌ 过细（为拆而拆，增加协调开销且易失真）：**
- task 1.2.1：给模型加字段映射
- task 1.2.2：给模型加类型转换
  → 合并为"task 1.2：创建用户数据模型（含字段映射和类型转换）"

**何时保留粗粒度：**
这些任务如果硬拆会降低准确性，应保持原样：
- 架构决策（"重新设计权限系统"、"改造为事件驱动"）
- 跨模块强耦合重构（改 A 必须同时改 B 才能编译/通过测试）
- 难 bug 根因分析（需要全局视角）
- 安全/事务/一致性敏感的改动（拆开容易引入竞态或不一致）

**判定法**：如果"拆开后某个子任务单独跑会失败或需要 mock 才能跑"——别拆。

**约束**
- 创建实现所需的所有 artifact（由 schema 的 `apply.requires` 定义）
- 创建新 artifact 前总是先读依赖 artifact
- 若上下文严重不清晰，问用户——但优先做合理决策保持进度
- 若同名 change 已存在，问用户是想继续它还是创建新的
- 写入后、进入下一个前验证每个 artifact 文件存在
