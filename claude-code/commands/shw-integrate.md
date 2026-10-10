---
description: 将已授权 dev 范围正常合入 main，不自动测试。
argument-hint: [版本或 Issue 范围]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-integration` 及 references/candidate.md。固定dev SHA、main基点与候选tree，审查差异、完成必要构建及来源核对。满足当前授权和实际非测试合并要求后正常merge，核验main结果及制品对应关系。

不要求先通过test或人工验收，不触发/等待测试、冒烟或基线晋升。未测试与未体验如实记录；合入main不等于已获生产发布授权，正式发布另走 `/shw-release`。
