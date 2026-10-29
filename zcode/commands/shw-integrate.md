---
description: 准备 dev→main 集成 PR，完成检查后交用户手动合并并核验结果，不自动测试。
argument-hint: [版本或 Issue 范围]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-integration` 及其 references/candidate.md、`shw-gitea-flow/references/merge-authority.md`。固定 dev SHA、main 基点与候选 tree，审查差异、跟进必要构建及来源核对，完成准备后提供 PR 链接和检查证据，请用户手动合并。调用本命令不授权代合并，不能调用 merge/auto-merge 或改走网页/其他工具。合并拒绝时按人工边界反馈；用户合并后回读实际 main 结果及制品对应关系。

不要求先通过test或人工验收，不触发/等待测试、冒烟或基线晋升。未测试与未体验如实记录；合入main不等于已获生产发布授权，正式发布另走 `/shw-release`。
