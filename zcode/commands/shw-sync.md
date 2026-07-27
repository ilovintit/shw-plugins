---
description: 把 change 的 delta spec 同步到主 spec
argument-hint: [change名]
---

把 change 的 delta spec 同步到主 spec。

这是 **agent 驱动**的操作——你会读 delta spec 并直接编辑主 spec 应用变更。这允许智能合并（如：添加 scenario 不需要复制整个 requirement）。

**输入**：可选地指定 change 名（如 `/shw-sync add-auth`）。若省略，检查能否从对话上下文推断。若模糊或歧义，你**必须**询问用户可选的 change。

**步骤**

1. **若未提供 change 名，提示选择**

   调用 **shw-spec** 的 `list_changes` 工具（传入 projectRoot）获取可选 change。用向用户提问让用户选。

   显示有 delta spec 的 change（在 `specs/` 目录下）。

   **重要**：不要猜或自动选 change。始终让用户选。

2. **解析 change 上下文**

   调用 **shw-spec** 的 `get_status` 工具（传入 projectRoot + changeName），获取 change 的 artifact 状态和路径。

3. **找 delta spec**

   用 `get_status` 返回的 `artifactPaths.specs.existingOutputPaths` 作为 delta spec 文件列表。

   每个 delta spec 文件包含这些章节：
   - `## ADDED Requirements` - 要添加的新需求
   - `## MODIFIED Requirements` - 对现有需求的变更
   - `## REMOVED Requirements` - 要移除的需求
   - `## RENAMED Requirements` - 要重命名的需求（FROM:/TO: 格式）

   若没找到 delta spec，通知用户并停止。

4. **对每个 delta spec，应用变更到主 spec**

   对返回的每个仓库本地 capability delta spec 路径：

   a. **读 delta spec** 理解预期变更

   b. **读主 spec**（位于 `specs/<capability>.md`，扁平文件，可能还不存在）

   c. **智能应用变更**：

      **ADDED Requirements：**
      - 若需求不存在于主 spec → 添加它
      - 若需求已存在 → 更新它以匹配（视作隐式 MODIFIED）

      **MODIFIED Requirements：**
      - 在主 spec 里找到需求
      - 应用变更——可能是：
        - 添加新 scenario（不需要复制现有 scenario）
        - 修改现有 scenario
        - 改需求的描述
      - 保留 delta 未提及的 scenario/内容

      **REMOVED Requirements：**
      - 从主 spec 移除整个需求块

      **RENAMED Requirements：**
      - 找 FROM 需求，重命名为 TO

   d. **若 capability 还不存在，创建新主 spec**：
      - 创建 `specs/<capability>.md`
      - 加一段简短的 Purpose 章节
      - 用 agent 友好格式（表格 + 散文）加需求

5. **显示摘要**

   应用所有变更后，总结：
   - 哪些 capability 被更新
   - 做了哪些变更（需求 added/modified/removed/renamed）

**Delta Spec 格式参考**

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

**核心原则：智能合并**

与程序化合并不同，你可以应用**部分更新**：
- 加一个 scenario，只需在 MODIFIED 下包含它——不要复制现有 scenario
- delta 表达的是*意图*，不是整体替换
- 用判断力合理地合并变更

**成功时的输出**

```
## Spec 已同步：<change-name>

更新了主 spec：

**<capability-1>**：
- Added 需求："New Feature"
- Modified 需求："Existing Feature"（加了 1 个 scenario）

**<capability-2>**：
- 创建了新 spec 文件
- Added 需求："Another Feature"

主 spec 已更新。该 change 仍活跃——实现完成后归档。
```

**约束**
- 做变更前先读 delta 和主 spec
- 保留 delta 未提及的现有内容
- 不清楚时问澄清
- 边做边展示改了什么
- 操作应是幂等的——跑两次结果一样
