---
description: 按依赖推进当前版本的可体验 Issue，复用单 Issue 交付核心。
argument-hint: <版本>
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-version-planning` 和 `shw-delivery`。检查已有Issue状态、PR和占用，再按依赖顺序推进，默认串行且每轮 Issue 交付一个分支/PR；仅复用当前范围匹配且未合并的 PR，重开原单后的修正使用新分支/PR。不要重复派工；每个 Issue 开始、拆分和审查时，按 `shw-delivery` 主动评估并优先使用子智能体推进 Issue 内独立任务，无需用户逐次提醒；遵守宿主限制、依赖串行和 `shw-issue-parallel` 的文件所有权要求，不自动扩展跨 Issue 并发。

每个切片代码与规格同变更，PR 合入模式目标分支后按 `shw-gitea-flow` 立即关闭对应已完成范围的 Issue 并回读，以实际合入事实推进开发依赖；不因待体验、待验收或待发布挂单。继续提供真实体验入口并记录反馈，后续实际问题新建关联修正 Issue 或重开原单，再用新 PR 交付。连续开发授权和关单不代表人工验收通过。已授权范围可每日/小批次集成，版本完成不是自动发布授权。

用户输入：$ARGUMENTS
