---
name: shw-delivery
description: Issue 交付执行内核。供 work 完成单个 Issue，供 roadmap 严格串行复用；整合旧 explore/propose/apply/archive/do/wrap 的调查、计划、实现、PR、CI、合并和回写能力。
---

# 单 Issue 交付内核

## 输入契约

输入必须只有一个 Issue，且具备范围、非目标、依赖、AC 与测试映射。任何缺口在写代码前补齐；需要产品裁决时停止询问。

## 流程

1. **取证**：完整读取 Issue/评论、产品文档、相关代码、依赖和历史 PR。
2. **差距与计划**：在会话内部列出现状、目标、改动点、测试和风险。旧 change 文件与用户命令不再存在；需要跨会话的关键事实写 Issue/Journal。
3. **隔离**：从最新 dev 创建 `feat/<N>-<slug>`、`bug/<N>-<slug>` 或 hotfix 分支，并进入 Issue worktree。
4. **测试先行**：按测试计划先写能在缺少实现时失败的断言；本地不运行测试，只做断言自审。
5. **实现**：做满足 AC 的最小完整改动，遵循适用技术栈、架构和代码规范。
6. **自审**：逐字符审查 diff，核对 AC、测试、文档、安全、兼容、部署和无关改动。
7. **验证与 PR**：本地只运行 build/typecheck；commit/push，创建目标 dev 的 `Closes #N` PR。
8. **CI 循环**：读取真实 job；失败则根因分析、修复并重新 push，直到 required checks 全绿。
9. **dev 收口**：合并 dev、确认 Issue closed、清理分支/worktree，回写真实证据与遗留。

Hotfix 的目标是 main，永远停在用户 Web UI 合并前；用户合并后同步回 dev。

## work 与 roadmap

- `/shw-work`：用户明确选择一个 Issue，执行本流程一次。
- `/shw-roadmap`：版本编排器按依赖顺序重复调用本流程，一次仍只有一个 Issue；不得并行多个 Issue。

禁止分支互 merge、堆叠 PR、绕过 CI、自动合并 main，或把测试/实现拆到两个 Issue。
