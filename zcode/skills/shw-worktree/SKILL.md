---
name: shw-worktree
description: roadmap 执行与 issue 开发的 worktree 纪律。铁律：主工作目录只是 dev 的常驻基座（pull/切源/查看），不承载任何 issue 开发；roadmap/milestone 主线（goal-drive）用常驻 worktree，一切 issue 开发（含小 issue/hotfix、含孤立串行）一律各自进 worktree——agent 无自判例外，豁免仅用户明示。宿主有原生 Worktree / Handoff / permanent worktree 能力时优先用原生入口；否则用 git worktree 兜底。roadmap/goal-drive/milestone 开始执行、issue 开发前选工作目录、多会话并行、worktree 创建/使用/清理时触发。
---

# roadmap 执行与 issue 开发的 git worktree 纪律

## 主目录铁律

主工作目录是 dev 的**常驻基座**：`git pull` 更新、新分支的切源点、查阅最新代码——仅此三事。**不承载任何 issue 开发，无论 issue 多小。** 开发一律在 worktree 里的分支上进行。宿主自带 Worktree 管理时，优先使用宿主入口，不额外手写 `git worktree add`；宿主没有原生能力时才用 Git worktree 兜底。

为什么无例外：dev 主线制下小 issue / hotfix 同样要开分支（1:1:1），分支就要有 checkout 的地方；"小"不改变这件事，只改变人的侥幸心理。而小 issue 天然多发并发——第二个小活到达时，任何"主目录例外"立即塌方。worktree 创建就是一条命令，成本永远低于冲突排查。

## 何时用什么（形态判定——worktree 本身一律强制）

**进 worktree 无判定、无例外**：凡是 issue 开发（无论微活/小活/大活、无论多小、无论当前是否孤立串行），动手前一律先建/进 worktree。需要判定的只是**形态**：

| 场景 | 形态 |
|------|------|
| **roadmap / milestone 主线**（goal-drive 长循环） | **常驻 / permanent worktree**——分支在内部逐 Issue 轮转，worktree 本身不重建，milestone 收尾清理 |
| **多个 Issue 并行**（多会话认领；多个小 issue / hotfix 并发是常态而非例外） | **每 Issue 一个 worktree / managed worktree**，合并即清 |
| **单个小 issue / hotfix（含孤立串行）** | **同样开临时 worktree**——一条命令或一次 Worktree 选择的事，不因"小"或"当前只有一条线"占用主目录 |

**为什么孤立串行也不豁免**：判定是漏风源头——"现在孤立"挡不住期间到达的第二条线（用户插活、并行会话、roadmap 启动都是常态），而自判"我这次例外"在真实多会话仓库里被反复滥用，会话全面挤在主目录原地切分支、共享现场互相摧毁。**agent 不做例外自判；唯一豁免通道 = 用户明示**（"就在主目录干"）——记录豁免并在最终汇报注明。

- 与 `shw-issue-parallel` 的分工：那是**同一分支上**子智能体并行做多个 AC，不产生多分支，与 worktree 无关。
- 为什么单目录切分会出事：`git checkout` 是整个工作目录的原子切换——两个会话共享一个目录时，B 一切分支，A 的工作现场即被摧毁（未提交改动丢失或污染）。这不是合并冲突，是现场被摧毁。

## 进 worktree 后第一步 = 固化 issue 分支

**进入 worktree ≠ 可以开工**。worktree 创建后可能停在 detached HEAD 或 base 分支（通常是 `dev`）上；这两种状态都不得直接开发。

**按入场方式分两支**：

- **fallback `git worktree add -b feat/<N>-<slug> origin/dev`**——`-b` 参数在创建 worktree 的同时**已经创建了分支**，进场时就在 `feat/<N>-<slug>` 上：用 `git branch --show-current` 确认后直接开工，**不需要再 `checkout -b`**（重复创建会报 already exists）。
- **宿主原生 Worktree / 已存在的 worktree / roadmap 常驻 worktree 换 Issue**——进场时可能停在 detached HEAD、`dev` 或上一个 Issue 的分支上：**第一件事**是 `git checkout -b feat/<N>-<slug>`（bug 用 `bug/<N>-<slug>`，hotfix 用 `hotfix/<N>-<slug>`）创建并切换；分支已存在则 `git checkout feat/<N>-<slug>`。

**通用判定法**（所有场景入口时跑一次）：`git branch --show-current` 输出 = `feat/<N>-<slug>`（或 bug/hotfix 前缀）→ 通过；输出为空（detached HEAD）或输出 `dev` / `main` / 其他分支 → 必须先切到 issue 分支。

**不做这步的后果**：commit 留在 base 分支或 detached HEAD 上，PR 无处挂靠，Issue : 分支 : PR 的 1:1:1 断裂。

## 核心模型

### Roadmap 主线：一个常驻 / permanent worktree 承载整个 milestone

- milestone 开始执行时建常驻 worktree（宿主有 permanent worktree 就用原生入口），goal-drive 的整个循环（explore → propose → apply → PR → 等 CI → 合并 → 下一 Issue）都在其中进行。
- 逐 Issue 接力 = worktree 内换分支：上个 PR 合进 dev 后 `git fetch && git checkout -b feat/13-slug origin/dev` 切下一个。
- dev 同一时点只承载一个进行中 Milestone，因此 roadmap 常驻 worktree 同一时刻至多一个。
- 期间用户插入的小 issue / hotfix：各自开临时 worktree，与主线、主目录互不相干。

### 多会话 / 多 issue 并行：一 Issue = 一 worktree = 一会话

git 硬约束：同一分支不能同时 checkout 进两个 worktree——与 Issue:分支 1:1 天然契合，一个分支只活在一个 worktree 里。

**宿主原生优先**：宿主的新会话可选 Worktree，起点选 dev；开工后立刻把 detached HEAD 固化为 `feat/<N>-<slug>`。原生 Handoff 负责 Local 与 Worktree 间安全移动；managed worktree 生命周期交给宿主，不要手删。Roadmap 用 permanent worktree；依赖由宿主的 local environment setup 安装。

**Git 兜底**（无原生 Worktree 能力时）：

```bash
git worktree add ../<repo>-issue-12 -b feat/12-slug dev
```

- fallback 目录命名：roadmap 主线 `../<repo>-milestone`，单 Issue `../<repo>-issue-<N>`，与归属对齐一眼可辨。
- 一律从 dev 切（dev 主线制，与 PR 分支同规矩）。

### 使用纪律（所有形态通用）

- **依赖各自安装**：node_modules / Go 构建缓存不跨 worktree 共享，新 worktree 先装依赖再 build；宿主有 local environment setup 时把安装动作配置在那里。
- **`.changes/` 草稿天然隔离**：各 Issue 的 proposal / design / tasks 互不踩，无需额外处理。
- **journal 按 Issue 分文件天然隔离**（`docs/journal/issue-N.md`）；唯 AGENTS.md 提炼是共享文件——收尾提炼前先重读最新版（多会话协同协议）。
- **落后 dev 时**：在 worktree 内 `git fetch && git rebase dev`，纪律与单目录模式一致。

### 清理

- **宿主 managed worktree**：交给宿主生命周期（归档 / 保留上限 / 快照恢复），不要在 shell 里手删；PR 合并后仍删除对应 feature 分支。
- **fallback 单 Issue worktree**：PR 合进 dev 后立刻——`git worktree remove ../<repo>-issue-12 && git branch -d feat/12-slug`。
- **fallback roadmap 常驻 worktree**：milestone 收尾（全部 Issue 关闭）后 remove；宿主 permanent worktree 在 milestone 收尾后由用户决定删除。

## 与本地服务 / 中间件的配合

- worktree 内会话本地零测试（测试全在 PR CI），本地只有 build / 编译级检查，worktree 间无共享需求。
- 手动测试窗口（起前端 + API）按 `shw-backend-stack` 口径：连共享中间件实例 + 按 Issue 逻辑隔离（分支号即隔离键，库名 / key 前缀带 issue 号）；多个 worktree 同时手测时端口按 `shw-port-manager` 查表登记。

## 常见错误（禁止）

- ❌ 在主工作目录切分支开发 issue（无论多小）→ 主目录只做 dev 基座；开发进 worktree。
- ❌ 以"当前只有一条会话线"（孤立串行）为由在主目录动手 → 判定即漏风，孤立串行同样开 worktree；豁免仅用户明示。
- ❌ 发现已在主目录动了手还继续写 → 停手，把已有改动迁移进 worktree（stash / patch 搬运）再继续，不在主目录扩大现场。
- ❌ 两个并行 issue 共用一个工作目录切分支 → 工作现场互相摧毁，必须各开 worktree。
- ❌ "就改一行"直接在主目录动手 → 侥幸是脏 dev 与现场互毁的起点；一条命令开 worktree 再改。
- ❌ 新 worktree 不装依赖就 build → node_modules 不共享，先 install（宿主 setup 优先）。
- ❌ PR 合并后不清理 → worktree 与分支堆积；fallback 单 Issue 合并即 remove，managed worktree 交宿主，对应分支仍要删。
- ❌ 每个 worktree 复制一套本地中间件 → 共享实例 + 按 Issue 逻辑隔离（见 `shw-backend-stack`），禁止本地起多套。
