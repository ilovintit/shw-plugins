---
name: shw-apply
description: "Codex prompt workflow for shw-apply、/shw-apply. 领一个 change 执行到底——读 tasks.md 并行子智能体实现、自我审查收敛、提 PR（Closes #N）即止——合并归 /shw-archive Use only when the user explicitly asks for this named workflow."
---

# shw-apply

这是共享源码中同名 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `shw-apply`、`/shw-apply` 或要求执行该工作流时按下方原文执行。

**参数**：[change名]

用**并行子智能体调度**实现一个 change 的任务，交付到"PR 已提交（提完即止，合并归 /shw-archive）+ 验收全绿"。

你是 **协调者**（主 Agent）：负责高强度协调推理——读 change 与 Issue、拆解依赖关系、识别并行机会，实际实现通过子智能体调度委派给隔离子智能体并行执行。这保留你自己的上下文用于协调工作，让每个实现任务获得聚焦的执行环境。

**输入**：可选 change 名（如 `/shw-apply 12-unified-auth`）。省略时列 `.changes/` 下的活跃 change 让用户选；模糊或歧义时**必须问**，不猜。

---

## 步骤

### 1. 读 change 与领单

- 读 `.changes/<change名>/` 的 proposal.md / design.md / tasks.md
- proposal 顶部有 `Refs: #N` → 经 gitea-mcp 读关联 Issue（正文 + 验收 checklist + 评论时间线）；**Issue 仍在 `backlog` 或 `status/待开发` → 打 `status/开发中`**（已在其后状态则不动；Milestone 在 Sprint 计划时由 /shw-milestone 挂好，本命令不挂单——计划外直进的 Issue 例外：提示用户确认所属 Milestone 后顺手挂上）
- 建分支：有关联 Issue 用 `feat/N-slug`（bug 用 `bug/N-slug`；线上紧急修复用 `hotfix/N-slug`——从 main 切，其余一律从**最新 dev** 切）；无关联用 `feat/<change名>`；分支 PR 目标 = dev（hotfix 例外：目标 main，合并后 cherry-pick 回 dev）

### 2. 测试输入（用例已由 test 族前置）

测试用例已由 `/shw-test-draft` 起稿、`/shw-test-review` 对齐审查放行（工作区 `e2e/`、`tests/vrt/`、单元测试）。本命令**读取该 Issue 对应的已审用例**作为执行输入与验收门禁输入——RED 已在，apply 做 GREEN（实现让用例转绿）。**工作区无已审用例 → 提示先走 test 族**，停止（微小改动经用户确认豁免时在 PR 描述注明）。纯逻辑单元测试若无 test 族覆盖（流程外小修），按 `shw-tdd` 纪律在实现前补写。

### 3. 并行子智能体实现

**你（主 Agent）不写生产代码。** 本命令与 /shw-archive 属**执行段**——只依赖三件套固化产物，不依赖探索上下文，可委派给其他 agent/会话独立执行。

**方案失真回路**：执行中发现三件套与代码现实不符（方案假设的接口/结构不存在、切片边界错、tasks 步骤走不通）→ **停下**，回 /shw-explore → /shw-propose 修正三件套后继续，不擅改方案硬干；偏差按 `shw-work-journal` 落 `docs/journal/issue-N.md`。

**a. 识别独立任务组**（shw-issue-parallel）：触及不同模块/文件且无依赖 → 并行；输出是另一个的输入 → 串行；编辑同一文件 → 串行。

**b. 6 段式派发 prompt**（每段必须齐全，把所有独立派发放同一条消息真正并行）：

```markdown
## 1. TASK
[对应 tasks.md 某任务 / 验收 checklist 某条 AC。要极其具体。]

## 2. EXPECTED OUTCOME
- 创建/修改的文件：[精确路径]
- 功能：[精确行为]
- 验证：编译/类型检查通过（本地只做编译级确认；测试归 CI）

## 3. REQUIRED CONTEXT
[从 proposal/design/方案/PRD 提取该任务相关片段——只贴相关的，不全贴。]

## 4. MUST DO
[AGENTS.md 里适用于该任务的项目约定]

## 5. MUST NOT DO
[反模式。如：禁止 any / as any、不改其他模块、不加未要求的依赖、不跑 E2E/VRT]

## 6. VERIFY
[本地验证方式：build/typecheck 编译级确认；不跑任何测试——lint 与一切测试（单元/集成/API/E2E/VRT）在 PR CI]
```

**c. 收集结果**：核对 EXPECTED OUTCOME；子智能体声称完成必须有编译/类型检查真实输出，没有就打回。**任何子智能体都不跑测试**——功能正确性由 PR CI 判定；并行协同确认看编译级检查 + 改动文件清单是否冲突。

### 4. 自我审查与修复（循环到收敛）

加载 `shw-pr-review` skill 对本次全部变更做逐字符审查：

```
loop:
  1. 审查（首次 = 全部变更；复审 = 上次遗留 🔴 + 修复涉及的变更）
  2. 🔴 项 → 6 段式委派修复 → 回到 1
     🟡 项 → 逐条经用户裁决处置（修复，或豁免并记录理由），处置结果写入 PR 描述
     零 🔴 且 🟡 全部处置 → 跳出
```

连续 5 轮仍有 🔴 停下向用户汇报。**收敛是 apply 的责任。**

### 5. 提 PR（提完即止，不盯 CI）

- push 分支（按当前环境的网络写操作惯例执行；若运行环境有沙箱/权限分级，以能实际联网的方式推送），提 PR（**目标 = dev**，hotfix 例外目标 main）：描述写 `Closes #N`（有关联 Issue 时）+ checklist/tasks 勾选状态 + 🟡 处置记录（修复项 / 豁免项附理由）；**该 Issue 的已审测试用例随本分支提交**（测试 + 实现 = 同一 PR，CI 红绿即机器判定的 RED→GREEN）
- 提 PR 后有关联 Issue → 打 `status/待评审`（摘 `status/开发中`）
- **本流程到此收尾——不等 CI、不自动盯**：报告 PR 链接 + CI run 链接（所有测试在这里真实执行）。后续两种走向：
  - **日常交互模式**：你在 Gitea 看结果——失败手动叫 agent 排查（读 CI 日志修复再推）；全绿 → 你人工验收（人工测试就在分支的 worktree 现场做，见 shw-worktree）→ 运行 `/shw-archive`：核对 CI 全绿 → 你确认 → 合并（`Closes #N` 关单）→ 轨迹回写
  - **roadmap/goal 编排模式**：由编排层等 CI 红绿循环到全绿（见 shw-goal-drive），不经过本命令等待
- VRT 基线更新等边界裁决**不自动做**——CI diff 留评论说明，等用户裁决

### 6. 收尾

```
## Apply 完成

**Change：** <change-name>（.changes/ 下保留，待 /shw-archive 归档回写）
**PR：** <编号/标题>（已提交，CI 跑测试中：<run 链接>）
**关联 Issue：** #<N>（待验收后归档合并时由 Closes 关单）

下一步：CI 绿 → 你人工验收 → /shw-archive（含合并 PR，你确认后执行）；CI 红 → 叫我排查。
```

---

## 约束

- **你是协调者**——不自己写生产代码（读文件、勾任务、小协调修复 OK）
- **重型层运行无豁免**——E2E/VRT 编写可以、运行严禁；运行只发生在 CI 门禁，结果在 Gitea 看
- **证明级别匹配声称级别**——本地证明 = 编译/类型检查输出；一切测试类声称的证明 = PR CI run 链接
- **agent 本地不跑任何测试**——单元也一样：CI 干净环境跑，避免本地端口占用/进程打架
- **派发 prompt 必须包含全部 6 段**；派发前必须读 change artifact 与关联文档
- **默认并行，只有命名的依赖才串行**（shw-issue-parallel 核心原则）
- **合并纪律**——CI 全绿是合并前提；apply 提 PR 即止不合并，日常模式合并发生在归档环节（/shw-archive，用户确认后执行）；受保护分支（dev/main/test）按仓库规则，被拦等用户；agent 可合并目标 dev（含编排模式自动合并），**目标 main 永远仅用户**（dev→main 放行、hotfix）
