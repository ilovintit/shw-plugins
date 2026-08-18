---
name: shw-change-sync-spec
description: 把 change 的 delta spec 全量一致性合并到主 spec（全量读取 + 交叉影响 + 一致性核验）。归档命令在用户确认同步后加载此 skill 执行。不做用户交互，只做合并工作。
---

# 把 delta spec 全量一致性合并到主 spec

## 触发场景

归档命令（`/shw-archive`）中，**第二次代码审查通过后**，若检测到 change 有 delta spec 且**用户明确选择"同步"**，则加载本 skill 执行合并。

不做用户交互——决策（是否同步）已经由归档命令完成，本 skill 只负责执行合并。

## 工作流程

合并是**全量一致性合并**：不只应用 delta 声明的直接变更，还要找出全部需要连带修改的地方统一更新，并核验旧口径零残留。四个阶段依次执行。

### 1. 全量读取：建立全局口径视图

**a. 获取 delta spec 文件列表**：归档命令已经调过 `shw-spec` 的 `get_status`，把返回的 `artifactPaths.specs.existingOutputPaths` 作为 delta spec 文件列表传给本 skill。若列表为空，直接返回"无需同步"，归档命令继续后续步骤。

**b. 读全部 delta spec**：逐个读 delta 文件，理解每个 capability 的预期变更。

**c. 读全部主 spec**：读 `specs/` 下**全部** capability 的主 spec 文件（位于 `specs/<capability>/spec.md`，可能还不存在），不只读 delta 涉及的 capability。全量读取是后续影响面扫描与一致性核验的基础——没有全局口径视图，就发现不了交叉影响。

**纪律：禁止只读目标 capability 就开始合并。局部视图是分叉矛盾的根源**——capability 之间有交叉引用与口径联动，只看局部做合并，多次修改后新口径进了 A、旧口径残留在 B/C，specs 就前后矛盾了。哪怕本次 delta 只涉及 8 个 capability 中的 1 个，也要读完全部 8 个再进入下一阶段。

### 2. 影响面扫描：找出全部需要修改的地方

**a. 提取关键术语与口径变化清单**：逐条 delta 变更分析，提取三类口径变化：

- 需求改名（旧名 → 新名）
- 数量口径（如"共 8 个"变"共 9 个"）
- 机制表述变化（核心机制换了叫法或换了描述）

这份清单同时供第 4 阶段核验用——其中的**旧口径关键词**（被替换的旧术语）就是核验轮的 grep 词表。

**b. 识别两类影响**：

- **直接影响**：delta 声明的 ADDED / MODIFIED / REMOVED / RENAMED 目标
- **交叉影响**：用清单中的术语在**其他 capability** 的 spec 全文搜索，逐命中评估是否需要连带修改：
  - 口径更新（旧术语表述换成新口径）
  - 交叉引用修正（引用了被改名/改表述的需求或机制）
  - 数量同步（"共 N 个"类口径联动）

**搜索命中 ≠ 必改。** 命中可能只是与本次变更无关的同形文字。是否连带修改由合并者结合上下文判断。

### 3. 统一应用：直接影响 + 交叉影响一次改齐

全部识别完成后，直接影响与交叉影响在**同一次合并**中统一应用，不留"下次再说"。

**直接影响**按以下智能合并语义应用（每个 delta spec 文件包含四类章节）：

#### ADDED Requirements
- 若需求不存在于主 spec → 添加它
- 若需求已存在 → 更新它以匹配（视作隐式 MODIFIED）

#### MODIFIED Requirements
- 在主 spec 里找到需求
- 应用变更——可能是：
  - 添加新 scenario（不需要复制现有 scenario）
  - 修改现有 scenario
  - 改需求的描述
- **保留 delta 未提及的 scenario/内容**

#### REMOVED Requirements
- 从主 spec 移除整个需求块

#### RENAMED Requirements
- 找 FROM 需求，重命名为 TO

**交叉影响**按第 2 阶段的逐命中评估结果，修改对应 capability 的对应位置（口径更新 / 交叉引用修正 / 数量同步）。

**若 capability 还不存在，创建新主 spec：**
- 创建 `specs/<capability>/spec.md`
- 加一段简短的 Purpose 章节
- 用 agent 友好格式（表格 + 散文）加需求

**无法确定某命中是否连带修改的，标注"待人工判断"进入合并摘要——不静默跳过，也不瞎改。**

### 4. 全局一致性核验：零残留才算完成

用第 2 阶段清单中的**旧口径关键词**（被替换的旧术语）在 `specs/` 全局 grep：

- **有命中** = 存在残留矛盾——旧口径还留在某处没改到的地方。定位该处，回到第 3 阶段继续处理（按新口径修正，或标"待人工判断"），处理后重新核验
- **零命中** = 合并完成

核验结果（旧口径关键词清单 + 零残留确认）写入合并摘要。未通过这轮核验，MUST NOT 宣布合并完成。

## 合并摘要

返回给归档命令的摘要 MUST 含四部分：

1. **直接变更明细**：哪些 capability 被更新、各做了哪些变更（需求 added/modified/removed/renamed）
2. **交叉修改清单**：每处交叉修改的文件 + 修改点 + 关联的 delta 变更
3. **一致性核验结果**：旧口径关键词清单 + 零残留确认
4. **待人工判断项**：无法确定是否连带修改的命中（或"无"）

归档命令负责把这个摘要展示给用户，并据此决定 git commit 的内容。

## Delta Spec 格式参考

```markdown
## ADDED Requirements

### Requirement: New Feature
系统 SHALL 做新事情。

#### Scenario: 基本场景
- **WHEN** 用户做 X
- **THEN** 系统做 Y

## MODIFIED Requirements

### Requirement: Existing Feature
#### Scenario: 要加的新 scenario
- **WHEN** 用户做 A
- **THEN** 系统做 B

## REMOVED Requirements

### Requirement: Deprecated Feature

## RENAMED Requirements

- FROM: `### Requirement: Old Name`
- TO: `### Requirement: New Name`
```

## 核心原则：智能合并

与程序化合并不同，这里应用的是**部分更新**：
- 加一个 scenario，只需在 MODIFIED 下包含它——不要复制现有 scenario
- delta 表达的是*意图*，不是整体替换
- 用判断力合理地合并变更

## 约束

- **全量读取后再合并**——先读 `specs/` 下全部主 spec，禁止只读 delta 目标 capability 就开始合并
- 做变更前先读 delta 和主 spec
- 保留 delta 未提及的现有内容
- **交叉影响不静默跳过**——识别出的命中要么连带修改、要么标"待人工判断"进摘要
- **一致性核验零残留才算完成**——旧口径关键词在 `specs/` 全局 grep 零命中前，合并不算结束
- 操作应是幂等的——跑两次结果一样
- **不做用户交互**——决策已在归档命令中完成，本 skill 只执行
