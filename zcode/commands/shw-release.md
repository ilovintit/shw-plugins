---
description: 发布放行链固化——收集版本/Milestone 放行范围与 CI 证据，核对双模型终审，自动创建 dev→main 放行 PR；用户确认合并后，经确认在 main 合并 commit 打 tag 并跟踪 release workflow 与发布仓库结果
argument-hint: [版本号或Milestone（可选，缺省取当前Milestone；也可指定版本区间）]
---

发布放行链固化命令：把「终审核对 → 收集放行范围 → 建 **dev→main 放行 PR** → 用户确认合并 → main 合并 commit 打 tag → 跟踪发布 workflow → 核对发布仓库」收敛为一条可重复执行的流程。

**边界**：本命令管到 **tag 发布与发布产物核对**；发布后的线上验证、Milestone 收口与关闭归 Milestone 关闭闸口径，不在本命令内提前执行。

**输入**：版本号（`vX.Y.Z`）、Milestone 名，或明确的版本区间（如 `v1.2.0..dev`）。缺省时取当前/最近 Milestone 并向用户确认；无法唯一确定时问清后再动，不猜。

---

**步骤**

1. **确定版本与放行范围**

   - 读取 `scripts/build.ts` 的 `PLUGIN_META.version`（版本号唯一来源）；输入版本与之不一致 → 停止并提示先走发布版本 chore Issue + PR 合入 dev
   - Milestone 缺省时，经 gitea MCP 读取当前/最近 Milestone；有多个候选时列出让用户选择
   - 确定基线：上一个发布 tag（或用户指定的 `<refA>..<refB>`）→ dev HEAD
   - 经 gitea MCP 收集并核对：
     - 放行范围内已关闭 Issue：编号、标题、验收 checklist 状态、关联 PR
     - 已合并 PR：编号、标题、目标分支、合并 commit、关联 Issue
     - 每个 PR 的 CI run 与结论（PR Gate run 全绿即为门禁证据；pr-gate 已裁剪 push 触发，dev HEAD 无独立 CI run，以放行范围内全部 PR 的 pull_request run 为准）
   - 放行范围内的交付 Issue 未关闭、交付 PR 未合并或 CI 未全绿 → 输出证据表并停止，先回到对应工作流修复；Milestone 仅因线上验证/收口等关闭闸事项保持 open 时不阻断，但必须记录为发布后事项

2. **核对对抗终审**

   - 在当前会话、关联 Issue 评论或放行记录中查找 `/shw-review` 的「对抗终审放行」结论，且范围必须覆盖本次 release 基线
   - 未找到可核对的终审结论 → 停止并提示先运行 `/shw-review <同一放行范围>`
   - 结论中 🔴 未清零，或 🟡 未逐条处置（修复或记录理由豁免）→ 停止，先按终审结论修复并复审
   - 终审通过后，向用户复述：版本、范围、Issue/PR/CI 摘要、终审结论摘要，确认后进入放行 PR

3. **创建 dev→main 放行 PR**

   - 核对 dev 已包含版本号变更，且 main 尚未包含本次 dev HEAD
   - 已存在本次版本的开放放行 PR → 核对并按最新 dev 状态更新描述，不重复创建
   - 经 gitea MCP 创建 **dev→main** 放行 PR，标题建议：`release: vX.Y.Z 放行（dev → main）`
   - PR 描述必须包含：
     - 版本号与基线（`<上一发布tag>..<dev HEAD>`）
     - Issue 清单及逐项关联 PR、CI 状态（例：`#18 ×PR #24 ×CI ✅`）
     - 变更摘要（按模块/文档归纳，不复制完整 diff）
     - `/shw-review` 终审结论摘要（红黄处置与豁免遗留）
     - 发布核对清单：版本号唯一来源、Issue/PR/CI、终审、放行 PR、用户合并、tag、release workflow
   - 建好后输出 PR 链接与合并提示：**main 只由用户确认合并；agent 只建不合，任何模式下都不执行合并**

4. **等待并核对用户合并**

   - 用户在 Gitea 界面完成合并后，经 gitea MCP 或 `git fetch origin main` 核对：
     - 放行 PR 状态为 merged
     - 合并 commit 位于 origin/main
     - main 合入后无独立 CI run（pr-gate 已裁剪 push 触发）——放行 PR 的门禁 green 即为合入前的 CI 证据
   - 用户明确表示暂不合并 → 停在本阶段，保留放行 PR；不催促、不代合并

5. **经用户确认后打 tag**

   - 取放行 PR 的 main 合并 commit，向用户展示待执行动作：`git tag vX.Y.Z <merge-commit>` + `git push origin vX.Y.Z`
   - **必须获得用户对版本号与 commit 的明确确认**；确认前只展示命令，不创建、不推送、不覆盖 tag
   - 确认后在该合并 commit 上打 tag 并推送；本地或远端同名 tag 已存在时核对指向——指向一致则继续，指向不一致则停止交用户裁决，绝不 force 更新
   - tag 推送失败 → 保留现场并报告，不重试覆盖

6. **跟踪发布 workflow 与发布仓库**

   - tag 推送后检查 Gitea Actions `release.yml` 是否被 `vX.Y.Z` 触发，跟踪到终态：
     - 成功 → 核对发布仓库 main 与 `vX.Y.Z` tag 均已更新，并检查发布根的关键清单（marketplace / Kimi manifest / Codex marketplace / 三工具产物目录）是否存在
     - 失败 → 输出 run 链接与失败日志摘要，停止；已推送 tag 不移动，修复后按新版本与新的发布 chore Issue 重新走放行
   - 发布成功后输出结果核对清单，提示用户按安装渠道抽查更新；线上验证与 Milestone 关闭继续交给 Milestone 关闭闸口径处理

7. **输出放行记录**

   ```markdown
   ## ✅ vX.Y.Z 发布链完成

   **范围：** <上一发布tag>..<dev HEAD>（N 个 Issue、M 个 PR）
   **终审：** /shw-review 放行结论已核对（🔴 清零、🟡 已处置）
   **放行 PR：** #<PR>（用户已合并，CI ✅）
   **tag：** vX.Y.Z → <main merge commit>（已推送）
   **release workflow：** <run 链接>（✅）
   **发布仓库：** main 与 tag 已更新，关键产物核对通过
   **后续：** 线上验证与 Milestone 收口按关闭闸继续
   ```

---

**约束**

- **main 铁律**：agent 永不合并 dev→main PR；任何模式下 main 合并都由用户完成
- **tag 铁律**：agent 永不擅自打 tag 或推送 tag；必须先向用户确认版本号与 main 合并 commit，且绝不覆盖既有 tag
- **证据优先**：Issue、PR、CI、终审、合并、tag、workflow 全部以仓库/Issue 系统事实为准，不编造、不用推测补证据
- **只做放行链**：不替代 `/shw-review`，不修复终审发现，不执行线上验证，不提前关闭 Milestone
- **失败不绕行**：任一核对失败即停止并报告；不得通过重打、移动 tag 或跳过门禁继续发布
