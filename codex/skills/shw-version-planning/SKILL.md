---
name: shw-version-planning
description: Version/Milestone 规划公共机制。把产品基线选择为可发布版本、按用户价值拆成多个 Issue、建立依赖顺序和验收测试映射；用于 version/split/test-plan/roadmap。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# Version 规划

## 载体

Version 在 Gitea 中由一个 Milestone 表达，不额外维护版本范围文件。Milestone 描述至少包含：

- 产品基线 commit；
- 版本目标与用户价值；
- 明确范围和非目标；
- 风险、依赖、迁移、回滚；
- dev 验收、发布、部署和生产关闭 checklist。

## 拆分原则

- 一个 Issue 是一个可独立实现、验证并进入 dev 的交付单元。
- 以用户或运营可观察结果切片，不按数据库/API/前端技术层机械拆分。
- Issue 必须包含范围、非目标、依赖、验收标准和测试层级。
- 依赖构成有向无环图；roadmap 按拓扑顺序严格串行。
- 用户决定范围、优先级和拆分边界；Agent 提供风险与建议。

## 测试映射

每条 AC 对应稳定 `TC:` 名称和测试层；每个测试反向指向 AC/PRD。自动测试由对应 Issue 的 work 分支先写，测试计划本身不制造跨 Issue 的代码 PR。

## 状态

```text
planning → ready → developing → dev-accepted
→ release-pending → released → observing → completed
```

状态记录在 Milestone 描述 checklist、Issue/PR、tag 和部署证据中，不创建仅为承载状态的 Release Issue。Milestone 只有生产验证通过后才能 closed。
