---
description: 每日或小批次将已验收 dev 候选集成到 main，执行唯一业务自动测试阶段。
argument-hint: [版本或已验收 Issue 范围]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-integration` 及其 references/candidate.md。确认已验收Issue/commit/制品范围，冻结dev SHA、main基点、预合并结果与基线revision，复用/建立集成PR。

按候选契约执行测试、分类差异、局部更新候选基线并重跑；目标/基线漂移重新计算检查。满足当前授权后正常merge commit，核验实际main结果及制品映射。合入main不等于正式发布；tag/审批另走 `/shw-release`。
