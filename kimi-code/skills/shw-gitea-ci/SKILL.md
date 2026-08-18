---
name: shw-gitea-ci
description: 通过官方 gitea-mcp 查询项目的 Gitea Actions CI 状态、重试失败的 run、创建 Pull Request。push 代码后、完成任务后、需要确认代码是否正常时，或需要合并到 test/main 等受保护分支时调用。
---

# Gitea Actions CI 查询与开 PR

## 概述

代码 push 后，CI 是否通过是判断"代码是否正常"的客观证据——比"测试本地通过"更可信。本 skill 指导你通过**官方 gitea-mcp**（gitea.com/gitea/gitea-mcp）查询 Gitea Actions 状态、重试失败的 run、创建 Pull Request。

插件的 `gitea` MCP server 拉起的是官方 gitea-mcp（Go 实现，`go run` 固定版本拉起——`vX.Y.Z` 占位示例，实际固定版本见插件构建配置（config.md 有说明），版本随插件发版升级，插件不打包二进制），通过 `GITEA_HOST` / `GITEA_ACCESS_TOKEN` 环境变量连接目标 Gitea（取值来自插件 userConfig 配置）。

**核心原则**：声称"代码正常"之前，先确认 CI 通过。本地测试通过 ≠ CI 通过。

## 前置条件

```
1. 用户机器已安装 Go
   - gitea MCP server 通过 `go run` 拉起官方 gitea-mcp，首次运行需编译，启动慢属预期，不等同故障
2. ZCode 插件配置 userConfig 已配置 gitea_host + gitea_token 两项
   - 未配置时 gitea MCP 无法连接目标 Gitea，配置方法详见同目录 config.md
   - 配置入口：Settings → Plugin Management → shw-plugins
3. agent 工具的 MCP 菜单里 gitea server 处于 connected
   - 未连接时先检查上述两条（Go 缺失 / 配置缺失）
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

**触发**：用户要求把当前分支合并到 test / main 等分支，或发布流程需要跨分支合并。

**分支保护纪律（先判方向，再动手）**：
- 目标是 dev 等**允许直推的分支** → push 即完成，**不开 PR**
- 目标是 test / main 等**受保护分支** → **绝不尝试 `git push` 直推**（分支保护必拒，撞墙浪费轮次），唯一路径是创建 PR
- PR 创建后**由用户在 Gitea UI 审核合并**，agent 不自动合并（工具虽有 merge 能力，但合并决策归用户）

**流程**：
```
1. 确定源分支（head）与目标分支（base）：
   - 分支名从项目 AGENTS.md 的分支/发布约定读取，读不到就问用户
   - 不要硬编码分支名（不同项目的受保护分支集合不同）
2. 生成 PR 标题与描述：
   - 有 change 上下文：从 proposal / tasks / 变更说明归纳（标题=变更主题，描述=变更内容+影响面）
   - 无 change 上下文：从最近的 commit（git log）归纳
3. 调 pull_request_write(method=create, owner, repo, title, body, head, base)
4. 从返回中取 PR URL，按下方模板报告
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

PR 已创建，等待用户在 Gitea UI 审核（CI 状态见场景1-4）后合并。
```

## 注意事项

- **不要假设 CI 通过**——必须实际查询确认
- **日志很长时只贴尾部**——失败信息通常在最后 20-30 行
- **owner/repo 不确定时问用户**——不要猜错项目
- **CI 刚触发可能查不到**——push 后等 5-10 秒再查
- **多个 workflow 时**——默认查最近的，问用户是否要查特定的
- **分页用 page / per_page**——官方工具分页参数为 `page`（默认 1）/ `per_page`（默认 30）；`per_page` 上限受 Gitea 服务端 `[api].MAX_RESPONSE_ITEMS`（默认 50）约束，超出部分会被截断

## 与 shw-commit 的协作

shw-commit skill 完成本地 commit 后，按目标分支分流：
1. 目标是 dev（允许直推分支）→ push 即完成，不开 PR
2. 目标是 test / main 等受保护分支 → 移交本 skill 场景 5 开 PR（绝不 `git push` 直推）
3. push / 开 PR 之后的 CI 状态由场景 1-4 跟进

这形成闭环：改代码 → commit → push（dev）/ 开 PR（受保护分支）→ 查 CI → 确认正常/修复问题。
