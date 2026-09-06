---
name: shw-acceptance
description: 人工验收与反馈公共机制。定义 dev 整体验收、生产冒烟/观察、Bug 与新增需求分流、版本关闭证据；由 test-plan/bug/release/version-close 使用，不暴露独立 accept 命令。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# 人工验收与反馈

## 为什么不设 accept 命令

人工测试和真实使用是持续行为，不需要为“开始测试”制造状态命令。工作流只在必须使用结果作决策时收集证据：

- `/shw-release` 使用 dev 整体验收结果决定是否创建 dev→main PR；
- `/shw-version-close` 使用生产反馈和观察结果决定是否关闭 Milestone；
- 任何失败随时用 `/shw-bug` 形成可追踪工作。

## dev 验收

针对 dev 上完整版本候选，按测试计划覆盖跨 Issue、跨端、角色权限、迁移和回归。结果记录时间、环境、commit、步骤、结果和证据。失败建 Bug 并挂当前 Milestone，修复后重验受影响范围。

## 生产验证

部署后验证关键路径、真实依赖、日志/错误率/告警、数据一致性和回滚可用性。P0/P1 阻断版本关闭；非阻断项由用户决定是否进入下一 Version。

## 反馈分类

- 与当前 PRD/AC 不符：Bug。
- 要求新增能力或改变规则：产品需求，回产品定义。
- 当前版本承诺范围中的回归：挂当前 Milestone。
- 历史版本关闭后发现：不重开历史 Milestone，进入当前维护 Version 或 Hotfix。

Agent 不替用户宣告体验可接受，也不以“Pod Running”“CI green”代替人工验收。
