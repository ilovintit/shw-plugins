---
name: shw-worktree
description: Issue 文件变更的工作区管理。通过插件 worktree MCP 创建/复用、查询、释放、安全移除及恢复；同一会话使用返回路径完成交付，不自动 fork/Handoff，不拦截宿主工具。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# Issue 工作区

使用插件的 `worktree` MCP 管理工作区。根目录和用户级配置见 [config.md](config.md)，参数、错误与恢复见 [operations.md](operations.md)。索引由程序维护，Agent 不直接编辑。

## 开工

1. 先关联 Issue，按 `shw-gitea-flow` 判断普通交付或 Hotfix。纯调查及已授权的 Issue/Milestone 元数据操作不申请工作区。
2. 为当前会话生成并保留一个唯一 `claim_id`（例如随机 UUID；已有稳定会话 UUID 可复用）。不要用工具名或项目名充当句柄，也不把它提交到仓库/Issue/PR。
3. 调用 `worktree.acquire`：传仓库绝对路径、Issue 编号、kind、claim_id，可指定编号分支和简短 owner 标签。普通来源 dev，Hotfix 来源 main，由 MCP fetch 并固定基线。
4. 保存返回的工作区 ID、绝对路径、分支及 claim_id。当前会话继续工作；每次文件/命令操作明确使用该路径。遵循项目的运行入口，准备依赖和必要本地配置，不把凭据加入 Git。
5. 已有同一 claim 的工作区直接复用。返回占用冲突时先 inspect/list，不借用别人的句柄、不另建同 Issue 分支绕过占用。

用户明确要求使用外部或宿主工作区时尊重该选择；本 MCP 不自动接管其目录或分支，也不删除它。MCP 不可用时报告具体问题，不悄悄修改索引或 fork 新会话。

## 暂停与恢复

- 暂停且允许其他会话接手时，停止本会话的写操作/相关服务，再调用 `release`。文件和分支保留；下次通过 acquire 重新取得占用。
- 同一会话续跑使用原 claim_id；其他会话仅能申请已 released 的工作区。
- 断线不自动释放占用；出现创建/清理中断时先 `reconcile`，按返回原因重试 acquire/remove。句柄丢失时保留现场，不能改索引冒充原持有者。

## 交付与清理

1. 完成自审、PR、CI 和适用的合并/同步，核对 Issue 结果。清理前停止工作区里的服务与写操作。
2. `inspect` 核对文件和分支；调用 `remove(id, claim_id)`。MCP 会检查路径归属、Git 登记、脏文件并 fetch 来源分支证明 HEAD 已合入，再移除工作区和本地分支。
3. 有忽略文件时先查看清单（例如在该路径只读运行 `git ls-files --others --ignored --exclude-standard`），确认均可丢弃后才传 `discard_ignored: true`。这不豁免未跟踪/已修改文件保护。
4. squash/rebase 等导致 Git 祖先关系无法证明时，保留目录并报告；不要传假“已合并”标记或用 force 删除。
5. 远端分支和 Issue 状态仍通过原交付流程处理；MCP 不替代 Gitea。remove 成功后复查状态。

Roadmap 严格串行：逐 Issue acquire → 实现/交付 → remove；一个会话持续协调，工作区按 Issue 分开，不跨 Issue 偷换受管分支。

本插件提供工具和指引，不强制宿主遵守，不认证会话身份、不拦截文件/shell 操作。无需自动 fork 或原生 Handoff。
