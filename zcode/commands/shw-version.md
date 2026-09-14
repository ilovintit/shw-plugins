---
description: 从当前产品真相选择一个可独立发布的版本范围，确认目标、非目标、质量门槛并创建 Gitea Milestone。
argument-hint: <版本号或版本主题>
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-version-planning`、`shw-product-docs` 和 `shw-gitea-flow`。

1. 核验产品基线已经 `/shw-product-review` 放行并进入 dev。
2. 从产品真相选择本版本用户价值、范围、明确非目标、依赖、风险、迁移、上线/回滚和完成判据。
3. 由用户裁决版本边界；Agent 负责指出范围膨胀、不可独立发布和隐藏依赖。
4. 创建或更新唯一 Gitea Milestone，描述中记录产品基线 commit、目标、非目标、发布门槛和状态 checklist。
5. 不在此时创建含糊的大 Issue；Issue 拆分统一交 `/shw-split`。

Version/Milestone 在生产验证完成前保持 open；tag 产生不等于版本完成。
