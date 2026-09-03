---
description: 微活收尾一条龙——回写 Issue + 提 PR + 盯 CI + 全绿自动合并；用户发 wrap 即验收授权。触发词：收尾、回写、提 PR、合并
argument-hint: <Issue 编号>
---

微活收尾一条龙：读 Issue → 回写验收 checklist 与实施纪要 → 提 PR → 盯 CI → **全绿自动合并** → 删分支。适用于无三件套的微活链（一行样式、小修、流程外小改动）——一个命令跑完 change 族"提 PR + 合并 + 归档"的全部收尾动作。

**核心语义（用户裁决）**：**用户发 `/shw-wrap` 指令本身 = 验收授权。** wrap 提 PR 后**不等人工确认**——盯到 CI 全绿即自动合并（agent 可合 dev，永不合 main）。一行样式没有人工测试量，发 wrap 就是用户拍板。

**输入**：必填 Issue 编号。缺失或歧义时**必须问**，不猜。

---

## 步骤

### 1. 读 Issue 与核对现场

- 经 gitea-mcp 读关联 Issue（正文 + 验收 checklist + 评论时间线）
- 核对当前分支 = `feat/N-slug`（bug 用 `bug/N-slug`；hotfix 用 `hotfix/N-slug`——从 main 切，其余从 dev 切）；不在对应分支 → 停下向用户确认（`/shw-do` 在 worktree 干的活，先进该 worktree 目录 `../<repo>-issue-N` 再核对）
- **改动未 commit → 按 `shw-commit` 纪律先 commit**（本地 commit；push 由本命令步骤 3 统一执行）；工作区干净再往下走

### 2. 回写 Issue

- **勾验收 checklist**：已完成的逐条打勾（`- [x]`）；未到时点的待办保留不勾，并在纪要评论里逐条说明原因（如"待 CI 判定"）
- **实施纪要评论**（经 gitea-mcp 追加）：

  ````markdown
  ### YYYY-MM-DD 实施：<一句话概述>

  - **交付清单**：<改动文件/要点，一到三行>
  - **验证证据**：<本地编译级检查输出摘要 + 说明功能正确性归 PR CI 判定>
  - **commit 链**：<本分支 commit 列表（短 SHA + 标题）>
  ````

### 3. 提 PR

- push 分支，提 PR：**目标 = dev**（hotfix 例外：目标 main，合并后 cherry-pick 回 dev）
- 描述必含：
  - `Closes #N`
  - **测试豁免注明**：微活无测试用例，经用户 wrap 授权豁免 test 族，正确性由 PR CI 现有门禁判定
- 提完打 `status/待评审`

### 4. 盯 CI → 全绿自动合并

- 经 `shw-gitea-ci` 的口径查 PR 对应 CI run，等待出结果
- **PR 已被合并**（用户在 Gitea 界面手动合并等场景）→ 跳过合并动作，补完回写与删分支后正常收尾
- **CI 全绿 = 合并前提（不是提了 PR 就合）**：全绿 → **立即自动合并**（squash/merge 按仓库规则），随后删除远端分支；`Closes #N` 随合并自动关单
- **清理 issue worktree**：本次活干在 `../<repo>-issue-N`（/shw-do 强制形态）→ 合并删分支后从主仓库路径清理：`git -C <主目录> worktree remove ../<repo>-issue-N && git -C <主目录> branch -d feat/N-slug`（`git -C` 使清理不依赖会话当前目录——会话仍挂在 worktree 内时同样成立，清理后本会话工作目录即失效，属预期收尾）；remove 不可行（有未迁移文件等）→ 收尾报告列出待清理路径与命令，交用户处置
- hotfix（目标 main）**不适用自动合并**——PR 提完报告链接，等用户手动合并；合并后按裁决 cherry-pick 回 dev

### 5. CI 红 → 停

CI 红 → **停下**，报告：

```
## CI 失败，已停止

**PR：** <编号/标题>（<PR 链接>）
**Run：** <run 链接>
**失败摘要：** <失败 job/步骤 + 关键报错行>

等你发起排查；我不自动重试。
```

不进入自动修复-重推循环；排查与重推由用户驱动（叫 agent 读 CI 日志修复）。

---

## 转链闸

动手前先查 `.changes/` 下是否有本 Issue 关联的三件套草稿（proposal.md / design.md / tasks.md）——**有 → 说明走错了链**：该活是 change 族大活，微活不该有三件套。停下向用户说明，提示改走 `/shw-archive`，**不静默归档、不继续 wrap**。

## 与 /shw-archive 的边界

- **wrap** = 微活链的**合并 + 归档位**：合并前一条龙（回写 → 提 PR → 盯 CI → 合并），无三件套、无 `.changes/` 清理（微活不产三件套）
- **archive** = change 族的**归档环节**：在 PR 已合并之后做执行轨迹回写 + 清理三件套草稿，合并动作本身不归它发起
- 两者在**"合并时点 = 用户验收后"**上对齐：wrap 的授权载体是用户发出 wrap 指令；archive 的前提是用户已确认交付（apply 流程中"你合并"即用户裁决）

## 收尾报告

```
## Wrap 完成

**Issue：** #<N>（checklist 已回写 + 实施纪要已评论）
**PR：** <编号/标题>（已合并，CI 全绿：<run 链接>）
**合并：** dev ← <分支名>（已删分支；`Closes #N` 自动关单）
**测试豁免：** 微活无测试用例（已在 PR 描述注明）

CI 红 → 见上方停止报告，等你排查。
```

---

## 约束

- **CI 全绿是自动合并的唯一前提**——只发 wrap 而 CI 未全绿（含还在跑）不合；两要素齐备（用户已发 wrap + CI 全绿）才自动合并
- **目标 main 永远仅用户合并**——hotfix PR 提完即止，agent 不合 main（dev→main 放行同理）
- **不跑测试**——微活无测试用例，本地只做编译级检查；一切测试归 PR CI
- **CI 红不自动重试**——不进入修复-重推循环，停下报告等用户驱动
- **合并后清理 worktree**——单 Issue worktree 合并即 remove（见 `shw-worktree` 清理节）；不可行时收尾报告列待清理项，不静默遗留
- **转链闸不静默**——发现三件套草稿必停必提示，不代做 archive
- 编排模式例外：roadmap/goal 无人值守模式**不走 wrap**（编排层 CI 绿自动合，见 shw-goal-drive）；本命令是交互模式微活专用
- 盯 CI 只按 `shw-gitea-ci` 的口径查询与判定，不重复定义门禁细节
