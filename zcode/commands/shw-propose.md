---
description: 固化 explore 的探索结论为 change 三件套（proposal/design/tasks）——.changes/ 本地草稿，gitignore。前置：同会话已有 explore 差距调查结论（无则先 /shw-explore，本命令不现想方案）
argument-hint: [change名 | Issue 编号]
---

把 explore 的探索结论**固化**为 change 三件套。change 是**执行层的本地草稿**（`.changes/` 目录，gitignore 不入库）——计划在这里落成文，交付经 PR 进主干，归档时轨迹回写 Issue。

**固化是本命令的唯一职责**：方案的产地是 /shw-explore（差距调查），本命令不探索、不现想——没有探索结论就先回去探索。

创建的 artifact：
- proposal.md（做什么 & 为什么；顶部 `> Refs: #N` 记录关联 Issue）
- design.md（怎么做——内容来自 explore 的执行方案：差距清单、改动落点、顺序依赖、风险）
- tasks.md（实现步骤）

准备好实现时，运行 `/shw-apply`；交付完成后 `/shw-archive` 归档回写。

---

**输入**：`/shw-propose` 后的参数是 change 名（kebab-case）或 Issue 编号。

**步骤**

1. **前置检查：explore 结论在吗**

   - 同会话刚跑过 /shw-explore、差距清单与执行路径在上下文中 → 继续
   - **没有探索结论**（新会话直入、或会话已轮替）→ 提示先运行 `/shw-explore <Issue 编号>`（可带 change 名），停止——**不在本命令里访谈现想方案**（那是把探索欠的债转移到固化时还，方案质量失控的根源）
   - 探索结论存在但已明显过时（探索后代码又大改过）→ 重新探索受影响部分再固化

2. **创建 change 目录与 artifact**

   解析输入定 change 名（Issue 编号 → 读 Issue 后推导 `<N>-<slug>`；change 名 → 同名已存在问用户继续还是新建）：

   ```bash
   mkdir -p .changes/<change名>
   ```

   依次固化三个 artifact（`.changes/` 是 gitignore 本地草稿，不入版本库）：

   - **proposal.md**——做什么 & 为什么：背景、目标、非目标、关联 Issue（顶部 `> Refs: #N`，无关联则写"无关联 Issue"）
   - **design.md**——怎么做：把 explore 的执行方案落成文——差距清单、技术方案要点（大活切片以 `docs/architecture/` 方案为准，不重新发明）、影响面、依赖与顺序、风险。涉及数据库表结构/API 路由设计时**自动加载 `shw-design-review` skill**，逐字段逐路由经用户确认后才写入
   - **tasks.md**——实现步骤（粒度指引见下）

3. **Task 拆分粒度**

   目标是把任务拆到**单次委派就能完整、准确交付**的粒度。**最高优先级是准确性**——拆分不能让任何单个 task 失真；其次才是效率。

   **目标粒度信号**：触及 1 个清晰模块/功能点；改动文件通常 ≤ 5 个；能一句话写出 EXPECTED OUTCOME；不需要"先理解整个系统才能动手"。

   **保留粗粒度**（硬拆会降低准确性）：架构决策类、跨模块强耦合重构、难 bug 根因分析、安全/事务/一致性敏感改动。判定法：拆开后某子任务单独跑会失败或需要 mock 才能跑——别拆。

4. **循环：审查 → 修复 → 复审，直到收敛**

   全部 artifact 创建后自我审查，循环到红黄清零：

   ```
   loop:
     1. 审查全部 artifact（复审 = 上次遗留 🔴 + 本次修复涉及的文件），维度：
        - 需求覆盖完整性（Issue checklist / 探索结论的差距是否都体现）
        - 方向一致性（技术选型/范围与 Issue 讨论、docs/architecture 方案一致）
        - 内部自洽性（proposal/design/tasks 交叉引用完整）
        - 表述精确性（无模糊/歧义/自相矛盾）
     2. 🔴 → 修复对应文件 → 回到 1；🟡 → 逐条经用户裁决处置（修复，或豁免并记录理由）；零 🔴 且 🟡 全部处置 → 跳出
   ```

   连续 5 轮仍有 🔴 → 停下列出未解决项交用户决策，不无限循环。**收敛是 propose 的责任。**

5. **输出**

   ```
   ## ✅ Propose 完成 - 可以开始实现

   **Change：** <change-name>（.changes/<change-name>/）
   **关联 Issue：** #<N>（或"无"）
   **artifact：** proposal.md / design.md / tasks.md（审查收敛，🟡 处置：修复 <X> / 豁免 <Y> 附理由；无则"无"）

   下一步：测试用例起稿 /shw-test-draft → 对齐审查 /shw-test-review → 运行 /shw-apply <change-name> 开始实现。
   ```

---

**约束**

- **只固化，不探索**——方案必须产自同会话的 /shw-explore；无探索结论不开工（这是硬前置，不是建议）
- **三件套是执行段唯一交接契约**——apply/archive 可委派给无探索上下文的其他 agent，它们只依赖三件套；所以固化质量 = 交接质量
- **`.changes/` 是 gitignore 本地草稿**——不 commit、不 push；真相与留痕在 Issue（评论回写）与 git 主干（PR）
- **测试运行零本地（对 tasks.md，无豁免）**——tasks 可含"编写测试"条目（任何层级），但不得含任何"运行测试"条目；task 验证命令只限编译级（build/typecheck）。lint 与一切测试的运行都在 PR CI
- 写入后验证每个 artifact 文件存在
