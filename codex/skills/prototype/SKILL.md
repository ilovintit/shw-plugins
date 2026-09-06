---
name: prototype
description: "Codex prompt workflow for prototype、/prototype. 新建或更新产品原型文档族——按管理端、用户端、移动端等入口拆分高保真原型，并维护统一索引与跨端主流程。 Use only when the user explicitly asks for this named workflow."
---

# prototype

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `prototype`、`/prototype` 或要求执行该工作流时按下方原文执行。

## Issue 工作区管理

文件修改前加载 shw-worktree，使用插件的 worktree MCP acquire 取得独立编号分支与绝对路径。当前会话全程执行，所有文件/命令明确指向返回路径；不为隔离工作区自动 fork 或调用 Handoff。保存本次 claim_id，暂停用 release，交付完成后按 Skill 调用 remove；查询和恢复使用 inspect/list/reconcile。
这是插件提供的协作工具，不拦截 shell/文件操作，也不改变 Codex 的任务环境绑定。用户明确选择的外部工作区不自动接管或删除。

**参数**：[产品定义 Issue 或入口范围]

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-product-docs`、`shw-frontend-spec-common`、对应端规范、`shw-docs-review` 和 `shw-worktree`。

1. 关联产品定义 Issue并读取唯一 PRD；PRD 未覆盖的产品决定先回 `/product`。
2. 枚举系统全部真实入口、角色和跨入口旅程，不假设一个系统只有一个原型。
3. 维护：
   - `docs/design/index.html`：产品级入口、角色、导航和跨端主流程索引；
   - `docs/design/<entry>/index.html`：每个管理端、用户端、移动端或其他独立入口的高保真可交互原型；
   - 必要的共享静态资源，禁止复制出互相漂移的业务规则。
4. 每个入口覆盖页面层级、字段、权限、正常/空/加载/错误状态、确认/撤销/返回、响应式与关键交互闭环。
5. 跨端动作必须能从产品级索引追踪，例如用户提交后管理端审核、管理端配置后客户端生效。
6. 用户逐入口验收交互逻辑后，经 docs review 更新同一产品定义 PR；不强迫多个入口塞进一个巨型 HTML 文件。

纯后端产品可在索引中明确“不适用及证据”，不得生成虚假界面。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
