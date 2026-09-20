---
name: shw-delivery
description: Issue 交付执行内核。供 work 完成单个 Issue，供 roadmap 严格串行复用；整合旧 explore/propose/apply/archive/do/wrap 的调查、计划、实现、PR、CI、合并和回写能力。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# 单 Issue 交付内核

## 模式前置

本 Skill 不是所有项目的默认约束。先读取仓库根 `.shw/project.yaml` 的模式：无标识时不主动应用；`issue-main` 只保留 Issue 分支→main 的轻量闭环；`issue-dev` 只保留 Issue 分支→dev→main 的轻量闭环；只有 `managed` 才应用本 Skill 中的业务项目目录、分支、测试、发布、部署或公司规范要求。模式定义见 `shw-issue-gate/project-mode.md`。

## 输入契约

输入必须只有一个 Issue，且具备范围、非目标、依赖与人工可判定的 AC。工程测试映射只在适用时需要；API/E2E/VRT 基线不作为开发前置。任何必要缺口在写代码前补齐；需要产品裁决时停止询问。

## 流程

1. **取证**：完整读取 Issue/评论、产品文档、相关代码、依赖和历史 PR。
2. **差距与计划**：在会话内部列出现状、目标、改动点、测试和风险。旧 change 文件与用户命令不再存在；需要跨会话的关键事实写 Issue/Journal。
3. **路由与隔离**：按 `shw-gitea-flow` 的交付路由表锁定 source/target/合并责任；经 `shw-worktree` 调用插件 worktree MCP acquire，保存返回路径/分支/claim_id；当前会话继续处理。
4. **工程验证设计**：判断 `shw-tdd` 是否适用；适用时先提交最小工程断言并取得目标行为缺失的 CI RED，不适用时记录原因和人工 AC。禁止用 API/E2E/VRT 基线制造开发 RED。
5. **实现**：做满足 AC 的最小完整改动，遵循适用技术栈、架构和代码规范。
Issue required checks 只包含与改动相关的工程构建、静态检查及适用单元/协议/安全测试，不运行全仓兜底，也不等待 API/E2E/VRT。已有回归基线比较在合入 dev 后由独立非阻断入口执行。

6. **自审**：逐字符审查 diff，核对 AC、测试、文档、安全、兼容、部署和无关改动。
7. **验证与 PR**：本地默认只运行 build/typecheck；commit/push，更新同一 PR，目标及关联语法按路由表。
8. **CI 循环**：读取真实 job；失败则根因分析、修复并重新 push，直到 required checks 全绿。
9. **交付收口**：按路由表完成合并与必要同步，删除远端 Issue 分支；调用 worktree remove 清理工作区和本地 Issue 分支，并把本地来源分支快进到最新 `origin/dev`（Hotfix 为 `origin/main`）。确认 Issue closed，回写真实证据与遗留；本地来源分支脏或分叉时不 reset/force，保留现场并报告。

Hotfix 的目标是 main，永远停在用户 Web UI 合并前；用户合并后同步回 dev。

## work 与 roadmap

- `/shw-work`：用户明确选择一个 Issue，执行本流程一次。
- `/shw-roadmap`：版本编排器按依赖顺序重复调用本流程，一次仍只有一个 Issue；不得并行多个 Issue。

禁止 feature 分支互 merge、堆叠交付 PR、绕过工程 CI或自动合并 main。最终验收后的基线维护必须是独立 chore Issue/PR；这不是拆分功能实现，而是记录已确认行为。

## 合入 dev 后的开发部署

Kubernetes 应用合并后按 shw-release-flow/references/environments.md 跟踪本次 dev commit 的部署判定、镜像、Fleet 和服务健康。API/Web 有变化必须更新；仅小程序等无工作负载影响的变更记录依据。CI 门禁通过和 Issue 合并分别取证，不把它们当开发环境已更新；部署失败记录并处理或关联 Bug，外部前置交基础设施侧。
