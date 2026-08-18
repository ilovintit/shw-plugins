---
description: 大任务深度探索与 roadmap 生产——需拆多个 change 的模块/大型改造用它；单个小改动直接 /shw-propose
argument-hint: [roadmap名或描述]
---

大任务深度探索与 roadmap 生产：先做深度调查，再把大任务固化为 roadmap（意图 + 有序 change 清单 + 验收目标）。

与 /shw-propose 的边界：propose 管单个 change 的小循环；本命令管需要拆成多个 change 编排的大任务。

---

**输入**：`/shw-roadmap-explore` 后的参数是 roadmap 名（kebab-case），或描述用户想做的大任务。

**步骤**

1. **若未提供输入，问用户想做什么**

   用向用户提问（开放性问题，不要预设选项）问：
   > "你想做什么大任务？描述你想构建或改造的东西。"

   从描述中推导出 kebab-case roadmap 名（如 "重构权限系统" → `refactor-auth`）。

   **重要**：理解用户想做什么之前不要继续。

2. **深度调查**

   产出 roadmap 前必须先调查项目现状：
   - 读项目代码结构——模块划分、目录组织
   - 读与任务相关的现有实现——集成点、已有模式、隐藏复杂度
   - 读项目 AGENTS.md 等约定文档——仓库规范、技术栈约束

   调查完成后向用户复述理解：现状是什么、任务触及哪些模块、有什么约束与风险。**用户确认后才继续**。

   **不调查不产出**：禁止跳过调查直接编 change 清单。

3. **推导 change 清单**

   把大任务拆成有序 change 清单：
   - 每个 change 自包含、可独立走完 propose→apply→archive 小循环——不允许"change A 必须和 B 一起验收"的耦合
   - 按依赖排序：被依赖的在前，依赖别人的在后

   向用户展示清单，每个 change 给出**存在理由**（为什么需要它）和**顺序依据**（为什么排在这个位置）。**用户确认后才落盘**；有异议先调整再确认。

4. **写 roadmap.md**

   创建 `.roadmaps/<name>/roadmap.md`（仓库顶层 `.roadmaps/` 目录，不进 `.changes/`——shw-spec 的 change 扫描会把它误认为 change）。按下方模板写入，change 状态初始全 pending：

````markdown
# Roadmap: <name>

## 意图

<这个 roadmap 要达成什么，一到两句>

## change 清单

| change 名 | 内容摘要 | 状态 |
| --- | --- | --- |
| <change-1> | <内容摘要> | pending |
| <change-2> | <内容摘要> | pending |

状态取值：pending / in-progress / done-archived

## 验收目标

本节是 /shw-roadmap-verify 转写 verify.md 的原材料。此阶段只需人能判断好坏的粗粒度，不要求可执行命令。

- <验收目标 1>
- <验收目标 2>
````

5. **提示下一步**

   roadmap 落盘后，向用户输出：

   ```
   roadmap 已创建：.roadmaps/<name>/roadmap.md
   下一步：运行 /shw-roadmap-verify <name> 把验收目标转写为可验证条目
   ```

**约束**

- 若大任务实际单个 change 就能承载，不硬拆——建议直接 /shw-propose
- 本命令只负责 roadmap 的初始落盘；后续状态推进不在本命令范围
