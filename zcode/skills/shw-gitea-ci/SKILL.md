---
name: shw-gitea-ci
description: 通过官方 gitea-mcp 查询项目的 Gitea Actions CI 状态、重试失败的 run、创建与合并 Pull Request。push 代码后、完成任务后、需要确认代码是否正常时，或需要把分支经 PR 合入 dev/main 等受保护分支、放行 dev→main 时调用。与姊妹 skill 分工：本 skill 管 CI 操作与合并质量；流程设施与状态流转（Issue/label/Milestone）归 shw-gitea-flow；分支模型与门禁 workflow 定义归 shw-gitea-repo。
---

# Gitea Actions CI 查询与开 PR

## 概述

代码 push 后，CI 是否通过是判断"代码是否正常"的客观证据——比"测试本地通过"更可信。本 skill 指导你通过**官方 gitea-mcp**（gitea.com/gitea/gitea-mcp）查询 Gitea Actions 状态、重试失败的 run、创建 Pull Request。

插件的 `gitea` MCP server 拉起的是插件自带的 **shim 网关**（Go 静态二进制，随插件分发）：它常驻应答 `initialize` / `tools/list`，工具清单在编译期内嵌自 pin 版后端快照，会话启动毫秒级注入、与后端是否就绪解耦；`tools/call` 则由 shim 代理给后端官方 gitea-mcp（Go 实现，按 pin 版本自动下载 / 监督 / 对齐，放用户级缓存，绝不进插件目录）。pin 版本随插件发版升级：升级 = 改插件构建配置常量 + 发版，shim 自动对齐新版本后端。认证通过 `GITEA_HOST` / `GITEA_ACCESS_TOKEN` 两个环境变量寻址与认证目标 Gitea，shim 原样透传给后端——这是各 agent 工具共同的底层机制，配置入口因工具而异（见「前置条件」与同目录 config.md 第 1 节）。后端 gitea-mcp 本身没有任何内置默认值：这两个环境变量未配置时认证必然失败（`token is required` 等错误），不会"默认连上某个 Gitea"。

**核心原则**：

1. 声称"代码正常"之前，先确认 CI 通过。本地测试通过 ≠ CI 通过。
2. 🛑 **合并绝对禁令（交互模式）**：日常交互模式下合并决策权归用户，agent 不主动执行合并——`pull_request_write` 的 `merge` 与 `merge_when_checks_succeed` 两个 method 一律不调（后者是 auto-merge 变体，同属合并）；只给 PR 链接引导用户到 Gitea UI 手动操作。**两个例外**：①用户在对话中明确指令合并（"你把它合了"），可按用户指令执行一次（目标 main 的放行/hotfix PR 收到指令也先复述确认范围再执行）；②roadmap/goal 编排模式（`/shw-roadmap` 执行驱动、`shw-goal-drive` 编排打法）中，由编排层在 CI 全绿后执行合并——**仅限目标为 dev 的 PR**（无人值守循环的前提）；目标是 main 的 PR（dev→main 放行、hotfix）**任何模式下都仅用户合并**，agent 只建不合。除这两种情形外一律不合。
3. **PR 内容根基**：创建 PR 前先 `git fetch origin` 更新远端引用，以 `git diff origin/<base>...HEAD` 三点 diff 为事实基础，change 上下文只作动机补充。

## 前置条件

```
1. 无需安装 Go 或手动准备二进制——后端 gitea-mcp 由 shim 网关自动管理
   - 首次调用 gitea 工具可能触发后端下载（访问 gitea.com，时长取决于网络，数秒到数十秒；受 park 超时约束默认 55s），下载完成后常驻用户缓存，此后会话秒连；后端崩溃自动重拉
2. gitea MCP 的 GITEA_HOST / GITEA_ACCESS_TOKEN 已配置（入口按所用工具，细节见同目录 config.md 第 1 节对应小节）
   - 未配置时 gitea MCP 认证必失败（工具清单注入不受影响，调用才报错），配置探测见下方「首次使用探测」
3. agent 工具的 MCP 菜单里 gitea server 处于 connected
   - 未连接时先检查上述两条（后端下载不可达 / 配置缺失，排障见 config.md 第 4 节）
```

## 可用的 gitea 工具（CI 与 PR 相关）

官方 gitea-mcp 的工具是**合并式**的：一个工具通过 `method` 参数暴露多个操作，调用时 `method` 必传。下表按「工具 + method」列出本 skill 用到的条目。

| 工具 | method | 作用 | 关键参数 | 来源 |
|------|--------|------|---------|------|
| `actions_run_read` | `list_runs` | 列最近的 workflow run（查状态） | `owner`, `repo`, `status?`, `page?`, `per_page?` | 源码确认 |
| `actions_run_read` | `get_run` | 查某个 run 详情 | `owner`, `repo`, `run_id` | 源码确认 |
| `actions_run_read` | `list_run_jobs` | 列某个 run 的 jobs（定位失败 job） | `owner`, `repo`, `run_id` | 源码确认 |
| `actions_run_read` | `get_job_log_preview` | 读 job 日志尾部（失败原因） | `owner`, `repo`, `job_id`, `tail_lines?`(默认200), `max_bytes?`(默认65536) | 源码确认 |
| `actions_run_read` | `download_job_log` | 下载完整日志到本地文件（日志超长时） | `owner`, `repo`, `job_id`, `output_path?` | 源码确认 |
| `actions_run_write` | `rerun_run` | 重试失败的 run | `owner`, `repo`, `run_id` | 源码确认 |
| `pull_request_write` | `create` | 创建 PR | `owner`, `repo`, `title`, `body`, `head`, `base`, `labels?`, `draft?` | README+源码 |
| `list_pull_requests` | （无 method，直接调用） | 列仓库 PR（跟进 PR 状态） | `owner`, `repo`, `page?`, `per_page?` | README 原文；参数需人工复核 |

> - 来源标注：「源码确认」= 官方仓库 `operation/actions/runs.go` / `operation/pull/pull.go` 中 `tool.Enum(...)` 的字符串常量原文；「README+源码」= README 工具表原文 + 源码双重确认；「README 原文」= 仅 README 工具表确认，具体参数为通用约定推断。
> - `owner` / `repo` 从项目的 git remote 推断，或问用户。
> - `rerun_run` 是**写操作**：直接生效、无需审批，权限由 Gitea token scope 控制。
> - 需要更长日志时调大 `get_job_log_preview` 的 `tail_lines`，或用 `download_job_log` 拉全量日志文件。

## 首次使用探测

本会话首次要调 gitea 工具时，先调 `get_me`（轻量认证调用，只返回当前用户信息）探测配置状态，再决定是否进入业务：

- **返回正常用户信息** → host / token 已配置且有效，直接进入下方业务场景，本会话内不再探测
- **返回认证错误**（如 `token is required`）→ 判定为未配置，**立即停止后续 gitea 调用**（不要换别的 gitea 工具继续试，不要撞墙后才排障），给出当前工具的最短配置路径（入口因工具而异，按同目录 config.md 第 1 节对应小节指引用户补齐）

用户完成配置后，重新探测一次 `get_me`，通过后再进入业务场景。

## 使用场景

### 场景1：查最近 CI 状态

**触发**：你刚 push 代码，或用户问"CI 过了吗"、"代码正常吗"。

```
1. 调 actions_run_read(method=list_runs) 获取最近 N 条 run
2. 解析返回，关注 run 的 status（Gitea Actions 状态：success / failure / cancelled / running / pending / waiting）
3. 报告：
   ✅ "最近一次 CI（#123）成功通过" —— 若 status=success
   ❌ "最近一次 CI（#123）失败" —— 若 status=failure，进入场景2
   ⏳ "CI（#123）正在运行中" —— 若 status=running/pending/waiting，告知用户稍等
```

### 场景2：查失败原因

**触发**：CI 失败，或用户问"为什么 CI 挂了"。

```
1. 调 actions_run_read(method=get_run, run_id=...) 查 run 详情
2. 调 actions_run_read(method=list_run_jobs, run_id=...) 列出该 run 的 jobs
3. 找出状态为 failure 的 job，取其 job_id
4. 调 actions_run_read(method=get_job_log_preview, job_id=..., tail_lines=200) 读失败日志尾部
5. 报告：
   ❌ "CI 失败，原因：job 'test' 在 'npm test' 步骤失败"
   附上日志关键片段（最后 20-30 行；贴日志前先检查并抹掉其中的 token / 密码 / 密钥等敏感值，日志可能回显环境变量或配置）
   附上修复建议（如果错误明显）
```

### 场景3：push 后自动检查

**触发**：shw-commit skill 完成后（代码已 commit），如果用户 push 了代码。

**流程**：
```
push 完成 →
  等 5-10 秒（让 CI 触发）→
  调 actions_run_read(method=list_runs) 查最新 run →
  若 status=running/pending/waiting：
    告知用户 "CI 已触发，正在运行（#123）"
    问用户："要等它跑完吗？还是继续做别的？"
    若等：每 30-60s 轮询一次 actions_run_read(method=get_run)
  若 status=success：
    报告 "CI 通过，代码正常"
  若 status=failure：
    进入场景2查失败原因
```

### 场景4：重试失败的 run

**触发**：用户说"重试 CI"、"重新跑一下"。

```
1. 调 actions_run_write(method=rerun_run, run_id=...) 重跑整个 run
2. 等待几秒后调 actions_run_read(method=get_run) 确认 run 已重新启动
3. 告知用户 "已重新触发（#124）。写操作直接生效，权限由 Gitea token scope 控制"
```

### 场景5：开 Pull Request

**触发**：用户要求把当前分支合并到 dev / test / main 等分支，或发布流程需要跨分支合并（dev→main 放行）。

**分支保护纪律（先判方向，再动手）**：
- dev / test / main **均为受保护分支，一律开 PR**——绝不尝试 `git push` 直推目标分支（分支保护必拒，撞墙浪费轮次）
- **dev→main 放行 PR**：Milestone 完成后的发布动作——描述列 Milestone 内 Issue 清单，建好后**交用户确认合并**（发布决策是用户确认域，agent 只建不合）
- PR 创建后的合并执行按目标分档（见核心原则第 2 条）：目标 dev——交互模式等用户、编排模式 agent 全绿后合；目标 main——永远仅用户

**流程（七步，按序执行）**：
```
1. 目标分支判定：确定源分支（head）与目标分支（base）
   - 分支名从项目 AGENTS.md 的分支/发布约定读取，读不到就问用户
   - 不要硬编码分支名（不同项目的受保护分支集合不同）
2. 更新远端引用：git fetch origin
   - 禁止 git pull——feature 分支上 pull 会把 base merge 进工作区，污染分支历史
   - fetch 失败（网络不通 / 远端不可达）→ 终止流程并报告用户，不得用陈旧的远端引用继续
3. 取 PR 内容事实基础（三点 diff）：git diff origin/<base>...HEAD
   - 与 Gitea 服务端计算 PR diff 的方式一致，PR 内容以此为事实基础
4. 冲突预检：git merge-tree --write-tree HEAD origin/<base>
   - 需 Git ≥ 2.38（无副作用模式，不碰工作区与暂存区；有冲突时非零退出并列出冲突文件）
   - Git 版本不满足 → 跳过预检、继续流程，在 PR 报告注明"未预检（Git < 2.38）"
   - 检出冲突 → 不 create，报告冲突文件清单，建议用户 rebase 后再开
5. head 分支 push 到远端：git push -u origin <head>
   - 官方 gitea-mcp 要求 head 分支在远端存在；head 已在远端则跳过本步
6. 三段模板撰写 PR 内容：
   - 变更摘要 ← 第 3 步的 diff 事实
   - 动机与背景 ← change 上下文（proposal / tasks）或 git log
   - 影响面 ← git diff origin/<base>...HEAD --stat
   - diff 事实与 change 文档冲突时，以 diff 为准
7. 调 pull_request_write(method=create, owner, repo, title, body, head, base)
   - 从返回中取 PR URL，按下方模板报告，注明等待用户手动合并
```

## 报告格式

### CI 通过
```
## ✅ CI 通过

**Run：** #123（commit: abc1234 "feat: xxx"）
**状态：** success
**耗时：** 2m 34s

代码已通过所有 CI 检查。
```

### CI 失败
```
## ❌ CI 失败

**Run：** #123（commit: abc1234 "feat: xxx"）
**状态：** failure
**失败 Job：** test
**失败步骤：** npm test

### 错误日志（尾部）
\`\`\`
... 日志关键行 ...
\`\`\`

> 贴日志前先检查并抹掉其中的 token / 密码 / 密钥等敏感值（日志可能回显环境变量或配置），只保留与失败相关的行。

### 修复建议
<如果错误明显，给出具体修复方向；否则问用户>
```

### CI 运行中
```
## ⏳ CI 运行中

**Run：** #123（commit: abc1234 "feat: xxx"）
**已运行：** 1m 20s

要等它跑完吗？
```

### PR 已创建
```
## PR 已创建

**PR：** #45 feat: xxx（feature-xxx → test）
**地址：** https://<gitea_host>/<owner>/<repo>/pulls/45
**冲突预检：** 已预检，无冲突（若跳过则写：未预检——Git < 2.38 / 原因）

PR 已创建，等待用户在 Gitea UI 手动合并（CI 状态见场景1-4）。
```

## 注意事项

- **不要假设 CI 通过**——必须实际查询确认
- **日志很长时只贴尾部**——失败信息通常在最后 20-30 行
- **owner/repo 不确定时问用户**——不要猜错项目
- **CI 刚触发可能查不到**——push 后等 5-10 秒再查
- **多个 workflow 时**——默认查最近的，问用户是否要查特定的
- **分页用 page / per_page**——官方工具分页参数为 `page`（默认 1）/ `per_page`（默认 30）；`per_page` 上限受 Gitea 服务端 `[api].MAX_RESPONSE_ITEMS`（默认 50）约束，超出部分会被截断
- 🛑 **合并类 method 除两例外一律不调**——`merge` / `merge_when_checks_succeed` 均属合并操作（见核心原则合并纪律）：日常交互模式合并决策归用户，等用户在 Gitea UI 手动合并；例外 = 用户对话中明确指令合并、roadmap/goal 编排模式由编排层 CI 全绿后合并（**仅限目标 dev**；目标 main 任何模式都仅用户）
- **fetch 失败不开 PR**——`git fetch origin` 失败时终止开 PR 流程并报告用户，不得用陈旧的远端引用生成 PR 内容

## 与 shw-commit 的协作

shw-commit skill 完成本地 commit 后，按目标分支分流：
1. 目标是 dev（受保护）→ 移交本 skill 场景 5 开 PR（PR 目标 dev；编排模式 CI 全绿后 agent 合并，交互模式等用户手动合并）
2. 目标是 test / main 等受保护分支 → 同走场景 5 开 PR（目标 main 的放行/hotfix PR 永远等用户手动合并；绝不 `git push` 直推）
3. push 分支 / 开 PR 之后的 CI 状态由场景 1-4 跟进

这形成闭环：改代码 → commit → push 分支 → 开 PR → 查 CI → 确认正常/修复问题。
