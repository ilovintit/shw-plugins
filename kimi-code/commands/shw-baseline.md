---
description: 在当前集成 PR 内维护有验收依据的候选基线，合并通过后晋升。
argument-hint: <集成 PR> [已验收差异范围]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-integration/references/candidate.md`、`shw-test-spec` 和 references/execution.md。必须关联当前dev→main集成PR、冻结候选与人工验收范围；不是独立dev回归或最终发布后的基线维护入口。

只处理已验收预期变化对应的断言/候选基线。无旧基线先正常执行场景且确认候选已人工验收，再建立候选并复跑。不能全量接受快照、删除断言掩盖回归或直接写正式基线。候选/目标/基线漂移重算，成功合并且结果一致才晋升。
