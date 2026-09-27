---
description: 为 Version/Milestone 整理人工验收范围、步骤、预期、数据、环境与反馈方式，并记录未来回归候选。
argument-hint: <Version 或 Milestone>
---

**项目外只读**：仅可修改当前项目已确认的工作目录；完整边界见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-test-spec`、`shw-version-planning`、`shw-acceptance` 和 `shw-gitea-flow`。

1. 读取 Milestone、全部 Issue checklist、PRD、原型状态和架构验收策略。
2. 为每条 AC 记录人工步骤、预期结果、角色、数据、环境、前置状态、重置方式与证据位置，并反向引用 AC/PRD/原型。
3. 标出适用工程构建、静态、单元、协议、安全和性能检查；它们与人工验收目的分开。
4. 可以记录将来值得用 API/E2E/VRT 保护的候选范围，但不提前生成用例、截图或自动化映射，也不把候选完备性设为开发/发布门禁。
5. 明确 dev 人工测试、用户 main 合并、发布后的最终人工验收、生产观察与失败反馈；最终验收通过后才由 `/shw-baseline` 选择已确认范围固化。
6. 把计划写回 Milestone/Issue。存在含糊验收判据时回 `/shw-split` 或产品定义；自动化缺口本身不阻止开发。

本命令不运行测试、不生成基线，也不创建“测试实现”大杂烩 Issue。
