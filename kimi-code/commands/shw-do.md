---
description: 微活直通执行——直接执行 Issue 内容（单文件单点、不碰逻辑结构），不进 change 族。适用：直接执行、快速修复、一行修改、微活。主 agent 直写代码 + 单轮自审 + 提示 /shw-wrap 收尾
argument-hint: <Issue 编号>
---

用**微活直通**执行一个 Issue：主 agent 自己动手改代码，最快路径交付，不建 proposal/design/tasks，不进 change 族。

你是**执行者**（主 Agent）：亲自读 Issue、亲自写代码、亲自自审。**不派任何子智能体**——微活是单点小改，派发隔离子智能体的协调开销是纯浪费。

**输入**：必填 Issue 编号（如 `/shw-do 17`）。**适用判据（真源 = shw-gitea-flow §6）**：微活 = 单文件单点修改、不碰逻辑结构（一行样式级改动、文案修正、小配置调整）；判定权在用户，模糊时保守——转小活链（/shw-explore 起步），不硬干。

---

## 步骤

### 1. 领单与建分支

- 经 gitea-mcp 读 Issue（正文 + 验收 checklist）；确认内容确实是微活量级——**不像微活 → 立即停下建议走小活链**（见膨胀即停闸）
- Issue 仍在 `backlog` 或 `status/待开发` → 打 `status/开发中`（已在其后状态则不动）；Milestone 在 Sprint 计划时由 /shw-milestone 挂好，本命令不挂单——计划外直进的 Issue 例外：提示用户确认所属 Milestone 后顺手挂上
- 进 worktree 后第一步：`git checkout -b feat/N-slug`（bug 用 `bug/N-slug`；线上紧急修复用 `hotfix/N-slug`——从 main 切，其余从最新 dev 切）——worktree 创建后在 detached HEAD 或 dev 上，必须先切到 issue 分支才能动手（见 shw-worktree「进 worktree 后第一步 = 固化 issue 分支」）
- **worktree 强制（无判定、无例外，见 `shw-worktree`）**：动手前一律先建/进 issue worktree。宿主有原生 Worktree 优先用原生入口；否则 fallback 为 `git worktree add ../<repo>-issue-N -b feat/N-slug origin/dev`，hotfix 基点为 main（fallback `-b` 已同时创建分支，进场确认即可）。**进场后用 `git branch --show-current` 判定**：已在 `feat/N-slug`（或 bug/hotfix 前缀）→ 直接开工；在 detached HEAD / `dev` / `main` → 先 `git checkout -b feat/N-slug origin/dev`（hotfix 用 origin/main）固化分支（见 `shw-worktree`「进 worktree 后第一步 = 固化 issue 分支」）。主目录只做 dev 基座，"孤立串行"不构成跳过理由，agent 不做例外自判（豁免仅用户明示，汇报注明）；发现已在主目录动了手 → 停手，把改动迁移进 worktree（stash / patch 搬运）再继续

### 2. 直接执行

**主 agent 直接写代码**——读相关文件、做单点修改、本地跑编译/类型检查级确认。

- 不建 `.changes/` 草稿、不写 proposal/design/tasks
- **不跑任何测试**——lint 与一切测试（单元/集成/API/E2E/VRT）归 PR CI；本地证明 = 编译/类型检查真实输出。微活豁免测试用例（不进 test 族），在 PR 描述注明豁免
- 实现遵循项目 AGENTS.md 约定，只改 Issue 范围内的内容

### 3. 膨胀即停闸（硬约束）

执行中发现**不止单点修改**——命中任一条即触发：

- 要动逻辑结构（改接口签名、抽函数、改调用链）
- 要跨多个文件
- 需要方案决策（多种做法要权衡）

→ **立即停下**（已做的改动保留在工作区），提示用户转小活链：

```
/shw-explore <N> → /shw-propose <N>（同会话）→ /shw-test-draft <N> → /shw-test-review <N> → /shw-apply → /shw-archive
```

**这是硬约束，不是建议。** 微活直通是 token 优化，不是绕过 change 族的捷径——硬干膨胀的微活，质量与追溯两头落空。

### 4. 单轮自审

加载 `shw-pr-review` skill 对本次变更做**单轮**审查（不做多轮循环）：

- 🔴 项 → 直接修复（主 agent 亲手修），修后重跑编译级确认
- 🟡 项 → 不强求清零，报告给用户裁决处置

### 5. 提示收尾

**本命令不提 PR、不合并、不关单。** 完成后提示用户：

```
微活已完成，运行 /shw-wrap <N> 收尾（回写 Issue + 提 PR + 自动合并）。
```

提 PR 与合并全部归 /shw-wrap——发 wrap 即验收授权。

---

## 约束

- **主 agent 直写，不派子智能体**——微活派发隔离子智能体是 token 浪费；读文件、写代码、自审修复全由你亲手完成
- **worktree 强制**——一切改动发生在 issue worktree 内；主目录动手即违规，先迁移再继续（见 `shw-worktree`）
- **不提 PR、不合并 PR**——两者都归 /shw-wrap（发 wrap 即验收授权）；本命令止步于"工作区改动完成 + 编译级自证"
- **不跑任何测试**——单元也一样；lint 与测试归 PR CI，本地证明 = 编译/类型检查输出，测试类声称的证明 = PR CI run 链接
- **膨胀即停是硬约束不是建议**——发现跨文件 / 动逻辑结构 / 要方案决策，立即停、转小活链，不硬干
- **单轮自审**——🔴 修复、🟡 报告用户，不做多轮收敛循环（那是 /shw-apply 的职责）
- **微活豁免测试用例须在 PR 描述注明**（由 /shw-wrap 提 PR 时落笔）
