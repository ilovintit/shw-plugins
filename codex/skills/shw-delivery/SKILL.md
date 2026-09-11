---
name: shw-delivery
description: Issue 交付执行内核。供 work 完成单个 Issue，供 roadmap 严格串行复用；整合旧 explore/propose/apply/archive/do/wrap 的调查、计划、实现、PR、CI、合并和回写能力。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# 单 Issue 交付内核

## 输入契约

输入必须只有一个 Issue，且具备范围、非目标、依赖、AC 与测试映射。任何缺口在写代码前补齐；需要产品裁决时停止询问。

## 流程

1. **取证**：完整读取 Issue/评论、产品文档、相关代码、依赖和历史 PR。
2. **差距与计划**：在会话内部列出现状、目标、改动点、测试和风险。旧 change 文件与用户命令不再存在；需要跨会话的关键事实写 Issue/Journal。
3. **路由与隔离**：按 `shw-gitea-flow` 的交付路由表锁定 source/target/合并责任；经 `shw-worktree` 调用插件 worktree MCP acquire，保存返回路径/分支/claim_id；当前会话继续处理。
4. **测试先行**：按 `shw-tdd` 提交复现断言到同一草稿 PR，取得目标行为缺失的 CI 红色证据；不把 typo 或依赖失败当行为复现。
5. **实现**：做满足 AC 的最小完整改动，遵循适用技术栈、架构和代码规范。
关联检查范围由shw-test-spec定义：只跑本Issue相关模块/文件，不运行全测或未知范围全量兜底。

6. **自审**：逐字符审查 diff，核对 AC、测试、文档、安全、兼容、部署和无关改动。
7. **验证与 PR**：本地默认只运行 build/typecheck；commit/push，更新同一 PR，目标及关联语法按路由表。
8. **CI 循环**：读取真实 job；失败则根因分析、修复并重新 push，直到 required checks 全绿。
9. **交付收口**：按路由表完成合并与必要同步，删除远端 Issue 分支；调用 worktree remove 清理工作区和本地 Issue 分支，并把本地来源分支快进到最新 `origin/dev`（Hotfix 为 `origin/main`）。确认 Issue closed，回写真实证据与遗留；本地来源分支脏或分叉时不 reset/force，保留现场并报告。

Hotfix 的目标是 main，永远停在用户 Web UI 合并前；用户合并后同步回 dev。

## work 与 roadmap

- `/work`：用户明确选择一个 Issue，执行本流程一次。
- `/roadmap`：版本编排器按依赖顺序重复调用本流程，一次仍只有一个 Issue；不得并行多个 Issue。

禁止 feature 分支互 merge、堆叠交付 PR、绕过 CI、自动合并 main，或把测试/实现拆到两个 Issue。

## 合入 dev 后的开发部署

Kubernetes 应用合并后按 shw-release-flow/references/environments.md 跟踪本次 dev commit 的部署判定、镜像、Fleet 和服务健康。API/Web 有变化必须更新；仅小程序等无工作负载影响的变更记录依据。CI 门禁通过和 Issue 合并分别取证，不把它们当开发环境已更新；部署失败记录并处理或关联 Bug，外部前置交基础设施侧。
