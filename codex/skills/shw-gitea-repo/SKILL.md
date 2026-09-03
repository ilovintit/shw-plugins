---
name: shw-gitea-repo
description: Gitea 仓库工程规范——分支设计模型（dev 主线制：dev 开发主线 + main 发布线 + test 可选部署源；Issue:分支:PR 1:1:1、feat|bug|hotfix 命名与生命周期、基点三禁令、dev→main 放行）与 PR 门禁 workflow 规范（.gitea/workflows/ 模板：快速层 + E2E/VRT/API 重型层全部在 PR CI 执行，CI 全绿才是合并门禁）。新项目初始化/存量导入时装门禁 workflow、设计分支模型、调整 CI 门禁、问分支怎么切/受保护分支怎么配/怎么放行发布时加载。
---

# Gitea 仓库工程规范（分支设计 + PR 门禁 workflow）

仓库的工程底座规范，一句话：**门禁唯一权威 = Gitea PR CI**——E2E / VRT / API 测试全部在 PR CI 真实执行，本地只写不跑；CI 全绿才是合并门禁。与姊妹 skill 分工：本 skill 管**仓库工程规范**（分支模型 + 门禁 workflow 定义）；`shw-gitea-flow` 管**流程编排**（Issue/label/Milestone/PR 关联）；`shw-gitea-ci` 管**CI 操作**（查 run、重试、盯门禁、合并）。

## 1. 分支设计模型（dev 主线制）

**永久分支（受保护）**：

| 分支 | 角色 | 保护规则 | 合并执行者 |
| --- | --- | --- | --- |
| `dev` | 开发主线——一切 Issue PR 的目标，roadmap 逐 Issue 接力发生地 | 禁止 force push、禁止直推；合并须经 PR + CI 全绿 | 交互模式 = 用户；roadmap/goal 编排模式 = **agent 自动**（无人值守循环的前提） |
| `main` | 发布线——永久可发布，tag 打在这里 | 同 dev 保护；只接受 dev→main 放行 PR 与 hotfix PR | **仅用户**——milestone 边界人工确认，agent 永不合并 main |
| `test`（可选） | 集成环境部署源 | 同 dev 保护 | `dev → test` 由部署流程触发 |

Settings → Branch → 对 dev 与 main 都开保护（勾选 status checks required = 门禁 jobs）。**dev 单 Milestone 纪律**：同一时点 dev 只承载一个进行中的 Milestone（roadmap 串行循环天然如此），否则 dev→main 无法按 Milestone 粒度放行。

**临时分支（Issue:分支:PR = 1:1:1，编号进分支名，无例外——线上紧急修复也必须先建 Issue，快来自流程轻（小活直通链同会话跑完），不来自绕过）**：

| 模式 | 用途 | 拉自 | 去向 |
| --- | --- | --- | --- |
| `feat/<N>-<slug>` | 功能开发 | dev | PR → dev |
| `bug/<N>-<slug>` | 缺陷修复 | dev | PR → dev |
| `hotfix/<N>-<slug>` | 线上紧急修复（修的是 main 上的线上代码） | main 直拉 | PR → main（用户合并）；合并后 **cherry-pick 回 dev**（防 dev→main 放行时冲突/丢失） |

**基点三禁令**（杜绝分支互相依赖互相合并的乱象）：

1. 临时分支一律从 **dev** 切（hotfix 例外从 main）——不从其他临时分支切（**禁堆叠**）
2. **禁止分支间互相 merge**——B 需要 A 未合并的代码时，等 A 合进 dev 再从新 dev 切（roadmap 逐 Issue 循环天然满足；B 天然包含 A 的代码）
3. **零交集的 Issue 才可并行**——多分支同时从 dev 切、各自独立 PR 进 dev，后合并者遇冲突自行 rebase dev

**生命周期纪律**：分支生于 apply 领单、死于合并（仓库开"合并后自动删除分支"）；不在 dev/main 直接开发；分支不跨 Sprint 滞留；同名分支前段合并删除后后段重开不算复用（如 docs 段合并后执行段重开 `feat/N-slug`）；分支落后 dev 时 **rebase dev**——不 merge dev 进分支（单人仓库保持线性历史、PR diff 干净）。

**放行与发布**：Milestone 全部 Issue 关闭 + `/review` 终审 🔴 清零后，运行 `/release`——收集 Issue/PR/CI 证据并自动建 **dev→main 放行 PR**（描述列 Milestone 内 Issue 清单）→ **用户确认合并**（agent 只建不合）→ 经用户确认后在 main 的合并 commit 上打 tag 发版。打 tag 发布后**线上验证通过才关 Milestone**（关闸归 Milestone 口径，见 shw-gitea-flow §5）。

## 2. PR 门禁 workflow 规范（`.gitea/workflows/`）

**设计原则**：

- **agent 本地零测试**：写代码 → 编译/类型检查（秒级）→ 推送 → CI 出结果。本地跑测试会端口占用/进程打架（并行开发多个不关联模块时尤甚）——CI 干净环境是唯一裁判
- **一个 PR 一次门禁 + 合并补跑**：`on: pull_request` 触发 PR 门禁，快速层与重型层全在其中，全部 required——本地"我觉得没问题"不算数；另加 `on: push`（branches 同受保护分支集）让合并/直推进 dev/main 后补跑同一门禁，防 merge commit 本身翻车与保护失效直推裸奔
- **快速层**（lint/unit/typecheck/build）分钟级反馈，放第一个 job；**重型层**（E2E/VRT/API 接口测试）用 services 起依赖（数据库/redis），跑真实服务
- **VRT 基线永不自动更新**：CI 只做 diff，失败即门禁红——人工裁决后在本地更新基线随 PR 提交
- **并发取消**：同一 PR 新 push 取消旧 run，省 runner——分组键用 `github.event.number || github.sha`（push 事件无 number，须按 sha 分组，否则所有 push 挤同组互砍）
- 失败排查入口固定：`shw-gitea-ci` 查 run/读日志

**模板（按栈适配命令）**：

```yaml
name: PR Gate
on:
  pull_request:
    branches: [dev, main, test]
  push:
    branches: [dev, main, test]
concurrency:
  group: ci-${{ github.event.number || github.sha }}
  cancel-in-progress: true

jobs:
  fast:
    name: 快速层（lint/unit/typecheck/build）
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: <安装依赖>
      - run: <lint> && <typecheck>
      - run: <unit tests> && <build>

  heavy:
    name: 重型层（API/E2E/VRT）
    runs-on: ubuntu-latest
    needs: fast
    services:
      <database/redis 等，按项目实际>
    steps:
      - uses: actions/checkout@v4
      - run: <安装依赖 + 起应用服务>
      - run: <API 接口测试>
      - run: <E2E 端到端测试>
      - run: <VRT 截图 diff（不更新基线）>
```

## 3. 使用时机

- **/init /import**：给项目装 `.gitea/workflows/pr-gate.yml`（按栈适配命令）+ 建 dev 分支（从 main 切并推送）+ 输出分支保护设置指引（Settings → Branch → 保护 dev 与 main，勾选 required status checks = 上面两个 job）
- **调整门禁**：新增测试类型 / 换 runner / 改依赖 services——改模板同步本 skill 约定
- **日常疑问**：分支怎么切、受保护分支被拦怎么办、门禁里该跑什么——本 skill 是答案源
