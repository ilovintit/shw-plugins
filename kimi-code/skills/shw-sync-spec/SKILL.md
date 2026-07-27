---
name: shw-sync-spec
description: 内部专用 - 把 change 的 delta spec 智能合并到主 spec。归档命令在用户确认同步后加载此 skill 执行。不做用户交互，只做合并工作。
---

# 把 delta spec 同步到主 spec

## 触发场景

归档命令（`/shw-archive`）中，**第二次代码审查通过后**，若检测到 change 有 delta spec 且**用户明确选择"同步"**，则加载本 skill 执行合并。

不做用户交互——决策（是否同步）已经由归档命令完成，本 skill 只负责执行合并。

## 工作流程

### 1. 获取 delta spec 文件列表

归档命令已经调过 `shw-spec` 的 `get_status`，把返回的 `artifactPaths.specs.existingOutputPaths` 作为 delta spec 文件列表传给本 skill。

若列表为空，直接返回"无需同步"，归档命令继续后续步骤。

### 2. 对每个 delta spec，应用变更到主 spec

每个 delta spec 文件包含这些章节：
- `## ADDED Requirements` - 要添加的新需求
- `## MODIFIED Requirements` - 对现有需求的变更
- `## REMOVED Requirements` - 要移除的需求
- `## RENAMED Requirements` - 要重命名的需求（FROM:/TO: 格式）

对返回的每个仓库本地 capability delta spec 路径：

**a. 读 delta spec** 理解预期变更

**b. 读主 spec**（位于 `specs/<capability>.md`，扁平文件，可能还不存在）

**c. 智能应用变更：**

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

**d. 若 capability 还不存在，创建新主 spec：**
- 创建 `specs/<capability>.md`
- 加一段简短的 Purpose 章节
- 用 agent 友好格式（表格 + 散文）加需求

### 3. 返回合并摘要

应用所有变更后，向归档命令返回总结：
- 哪些 capability 被更新
- 做了哪些变更（需求 added/modified/removed/renamed）

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

- 做变更前先读 delta 和主 spec
- 保留 delta 未提及的现有内容
- 操作应是幂等的——跑两次结果一样
- **不做用户交互**——决策已在归档命令中完成，本 skill 只执行
