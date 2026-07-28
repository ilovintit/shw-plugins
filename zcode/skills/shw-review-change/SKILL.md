---
name: shw-review-change
description: 内部专用 - 在 propose 完成后调用。逐字符审查 change 的 artifact（proposal/specs/design/tasks）是否与 explore 阶段讨论的上下文一致，确保没有遗漏需求、偏离方向或自相矛盾。
---

# 审查 change 与探索上下文的一致性

## 概述

propose 生成了 change 的全部 artifact 后，必须立即加载本 skill 做一次完整审查。

**核心原则**：change 的 artifact 是 explore 阶段讨论结果的固化。如果 artifact 偏离了讨论上下文，后续 apply 阶段的全部实现都会跑偏——越早发现代价越小。

## 触发时机

- **propose 完成后**（强制）：所有 artifact 创建完毕，立即审查
- **手动触发**：用户对 change 内容有疑虑时

## 审查方法：逐字符对比

不是粗略浏览，是**逐字逐句**把 artifact 内容与 explore 上下文对比。

### 审查输入

1. **explore 上下文**：对话历史中 explore 阶段讨论的所有内容（需求、约束、决策、取舍、风险）
2. **change artifact**：
   - `proposal.md` — 为什么 + 做什么
   - `specs/` — 需求规格（scenario 即测试用例）
   - `design.md` — 技术方案
   - `tasks.md` — 实现清单

### 审查维度

#### 1. 需求覆盖完整性

逐条检查 explore 讨论中提到的每个需求点：

| 检查项 | 方法 |
|--------|------|
| 用户明确要求的功能 | 在 proposal 的 What Changes 中是否都有对应 |
| 用户提到的约束条件 | 在 design 的 Decisions 或 specs 的 scenario 中是否体现 |
| 用户关注的边界场景 | 在 specs 的 scenario 中是否覆盖 |
| 用户提到的非目标（明确不做的） | 在 proposal 或 design 的 Non-Goals 中是否声明 |

**发现问题**：列出遗漏的需求点，标注严重程度（必须补 vs 可选补）。

#### 2. 方向一致性

逐段检查 artifact 是否偏离了 explore 确定的方向：

| 检查项 | 方法 |
|--------|------|
| 技术选型方向 | design 的决策是否与 explore 讨论的技术倾向一致 |
| 范围边界 | proposal 的范围是否与 explore 讨论的范围一致（没有偷偷扩大或缩小） |
| 优先级排序 | tasks 的顺序是否反映了 explore 讨论中确定的优先级 |

**发现问题**：列出偏离点，标注 explore 中的原始讨论位置和 artifact 中的偏离位置。

#### 3. 内部自洽性

检查 artifact 之间的交叉引用是否一致：

| 检查项 | 方法 |
|--------|------|
| proposal → specs | proposal 声明的每个 capability 在 specs 中是否都有对应文件 |
| specs → tasks | specs 中的每个 requirement 在 tasks 中是否都有对应实现任务 |
| design → tasks | design 中的每个技术决策在 tasks 中是否都有对应落地任务 |
| tasks 内部 | 依赖顺序是否合理（前置任务排在前面） |

**发现问题**：列出断裂的引用链。

#### 4. 表述精确性

逐句检查是否有模糊、歧义或自相矛盾的表述：

| 检查项 | 方法 |
|--------|------|
| 模糊措辞 | "等"、"可能"、"如果需要"、"后续考虑" — 是否需要现在明确 |
| 自相矛盾 | 同一 artifact 内或跨 artifact 的矛盾描述 |
| 缺失定义 | 提到但未定义的概念、术语 |

## 审查报告格式

```
## 审查报告：<change-name>

### 审查范围
- explore 上下文：对话从 <起> 到 <止>
- artifact：proposal.md / specs/*.md / design.md / tasks.md

### 🔴 必须修复（<N> 项）
1. [需求遗漏] explore 讨论中提到的「XXX」在 proposal 中没有体现
   - explore 原文："..."
   - 当前状态：缺失
   - 建议：在 proposal 的 What Changes 中补充

2. [方向偏离] design 选择了 Redis 但 explore 讨论确定用 PostgreSQL
   - explore 原文："用 PostgreSQL，不要 Redis"
   - design 原文："使用 Redis 做缓存"
   - 建议：改为 PostgreSQL

### 🟡 建议修复（<N> 项）
1. [表述模糊] tasks.md 的 task 3.1 "完善测试"过于笼统
   - 建议：明确测试哪些场景

### ✅ 通过项
- 需求覆盖：X/Y 项覆盖
- 方向一致：技术选型/范围/优先级均与 explore 一致
- 内部自洽：artifact 交叉引用完整
- 表述精确：无模糊/矛盾
```

## 审查后的行动

- **有 🔴 项**：必须修复后才能进入 apply。列出修复建议，等待用户确认后修改 artifact。
- **只有 🟡 项**：提示用户，建议修复但不阻塞。用户确认后可进入 apply。
- **全部 ✅**：宣布审查通过，提示可以 `/shw-apply`。

## 约束

- **逐字符审查，不是粗略浏览**。每个 artifact 都要从头到尾读完。
- **必须有 explore 上下文可对比**。如果没有 explore 阶段（用户直接 propose），跳过维度 1 和 2，只做维度 3 和 4。
- **审查报告必须包含具体引用**（explore 原文 + artifact 原文），不能只说"有问题"。
- **不修改 artifact**——只报告问题，修改由 propose 流程或用户决定。
