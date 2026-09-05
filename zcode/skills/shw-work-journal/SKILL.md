---
name: shw-work-journal
description: 长任务的过程记忆。按 Issue记录重要试错、被否方案、外部事实与恢复点，并把稳定结论提炼进产品/架构或项目 Agent 规范；work/roadmap/update 使用。
---

# 工作记忆

## 两层

- `docs/journal/issue-<N>.md`：过程性记录，仅写跨会话仍有价值的试错、裁决、阻塞、证据链接和恢复点。
- 权威层：产品现状进 PRD/原型/架构；长期开发纪律进项目 Agent 规范；Gitea状态进 Issue/PR/Milestone。

Journal 不是第二套需求或执行计划。旧命令链、临时任务清单、可从 Git 重建的普通步骤不应堆入。每次恢复先读 Issue、权威文档和 Git，再用 Journal 补足原因。

收尾时提炼稳定结论，删除已失效的临时恢复点；历史被否方案保留原因，但不得让它看起来仍是当前设计。
