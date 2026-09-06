---
name: update
description: "Codex prompt workflow for update、/update. 全量升级并对齐存量项目——审计代码、Agent 规范、产品文档、Gitea、CI、测试与部署声明，修到符合当前生命周期工作流。 Use only when the user explicitly asks for this named workflow."
---

# update

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `update`、`/update` 或要求执行该工作流时按下方原文执行。

## Issue 工作区管理

文件修改前加载 shw-worktree，使用插件的 worktree MCP acquire 取得独立编号分支与绝对路径。当前会话全程执行，所有文件/命令明确指向返回路径；不为隔离工作区自动 fork 或调用 Handoff。保存本次 claim_id，暂停用 release，交付完成后按 Skill 调用 remove；查询和恢复使用 inspect/list/reconcile。
这是插件提供的协作工具，不拦截 shell/文件操作，也不改变 Codex 的任务环境绑定。用户明确选择的外部工作区不自动接管或删除。

**参数**：[Issue 编号]

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

部署审查先按 `shw-release-flow` 判定产品形态：以下 Harbor/Fleet/deploy 要求仅适用于 Kubernetes 应用；插件/库/CLI 改核分发、安装升级和回退证据，并记录不适用依据。

这不是“接入工作流”的轻量命令，而是存量项目的全量一致性迁移。执行前加载 `shw-docs-audit`、`shw-product-docs`、`shw-gitea-flow`、`shw-gitea-repo`、`shw-worktree` 和 `shw-verify`。

## 执行

1. 关联现有迁移 Issue；没有就先建一个 `chore` Issue，再进入独立 worktree。
2. 全量盘点：
   - 所有 Agent 指令文件及其冲突、重复和过时命令；
   - Git 分支、保护规则、Issue/label/Milestone/PR 纪律；
   - PRD 是否收敛为一份产品级当前真相；
   - 原型是否覆盖所有实际入口，并有产品级索引与跨入口主流程；
   - 技术文档是否有整体入口，并覆盖客户端、服务、领域、数据、接口、测试和部署；
   - 自动化测试、PR Gate、Harbor 镜像、`deploy/` 声明与 Fleet 目标；
   - 代码现实与文档声明是否漂移。
3. 输出逐项矩阵：现状证据、目标要求、差距、修复动作、是否需要用户裁决。
4. 自动修复机械性差距；涉及产品语义、删除历史文件、改变部署目标或安全边界时先取得用户裁决。
5. 缺少产品知识时不得编造：通过同一命令继续访谈并补齐；明确延期的缺口必须创建 Issue，不得写假完成文档。
6. 更新 Gitea 设施，提交 PR，等待 CI 并修复到绿；目标 dev 可按交付规则合并，main 永远不合。
7. 回写迁移报告：已修复、经用户确认保留、延期 Issue、验证证据。

## v7.1.2 tag 预检修复与迁移接续（#101、#103）

v7.1.1 源 tag 保留，但发布在本地附注/轻量 tag 对象冲突时失败，未推送公开制品。v7.1.2 接续原范围，从 v7.0.1 升级仍需完整执行下方 v7.1.0/v7.1.1 迁移。

检测：checkout 将本地同名 tag 转成事件提交引用，后续非强制 fetch 同名远端附注 tag 报 would clobber existing tag；不能把本地对象差异当作远端 tag 已变更。

修复：远端 tag 获取到独立预检引用，按剥离后的 commit 校验事件/HEAD/版本/main 合并记录，不覆盖本地或远端 tag、不跳过来源校验。CI 用真实 Git/远端 fixture 运行预检入口，覆盖附注/轻量 tag、重试及错误提交、版本、合并记录和 API 错误。

## v7.1.1 发布修复与迁移接续（#93、#97）

v7.1.0 源 tag 保留，但发布流水线在 checkout 元数据预检失败，未分发公开制品。v7.1.1 包含该版全部迁移与发布修复；从 v7.0.1 升级时仍须完整执行下方 v7.1.0 三项迁移，不能因版本跳过而遗漏。

检测：CI 容器初始无 Git，checkout 先于 Git 安装，回退为不带 .git 的源码 archive；仅构建成功不证明能执行发布提交校验。

修复：在 checkout 前提供 Git，并在检出后显式验证真实 Git 工作区及 HEAD；需要历史的发布流程使用完整 fetch。保留 tag/版本/main 来源校验，不通过跳过预检、重写既有 tag 或修改项目外 runner 环境绕过。项目 Agent 只改本项目已授权 workflow，外部基础镜像修改仍交用户介入。

## v7.1.0 项目外只读提示迁移（#88）

检测：项目 Agent 规范缺少项目外只读约束，或指引 Agent 自动修改用户级配置、shell profile、插件缓存、外部共享库或全局端口登记表；检查脚本、符号链接和委派是否被当作绕过方式。

修复：将 shw-issue-gate 的完整文件系统边界写入项目 Agent 规范，并同步冲突的项目指引；明确当前 Issue worktree 范围、用户介入交接及有限程序运行例外。项目外配置和环境缺陷只读取证后交用户安排，不能为完成 update 自动修复外部目录。完成后回读确认；不增加技术拦截。

## v7.1.0 Worktree MCP 迁移（#84）

用户已裁决采用插件自管 MCP + Skill。检测：原生 Worktree 强制优先、自动 fork/Handoff、手写索引、默认项目同级目录、roadmap 在同一受管目录跨 Issue 偷换分支。

修复：改为同一会话通过 worktree MCP acquire/inspect/list/release/remove/reconcile 管理，按返回绝对路径执行；配置放用户级根目录。不做宿主 hooks/沙箱/工具拦截。旧工作区只盘点归属，不自动采纳、移动或删除；已由宿主管理的仍交宿主处理。MCP 缺失时报告安装与配置问题；涉及项目外修改交用户介入处理，不悄悄回退或 fork。

## v7.1.0 一致性修复（#82）

检测：无条件 `git worktree add ../`、所有分支从 dev 切、CI 失败等用户、实现后才首次 CI、“任何外部状态均建工作区”、首发必须已有 tag、非 K8s 产品被要求 Harbor/Fleet、全端 IconFont、shared 平铺/中间件实现放 interfaces、未知异常默认 HTTP 200，以及旧 MCP pin 多源升级指引。

修复：按当前 flow/worktree/TDD/release-flow 全量重写对应工作流段；元数据操作按已有载体处理；标注产品部署适用性；前端选型按端规范、后端按锁定 lib 文档。不要把只有说明变更当作已完成宿主原生切换或真实安装验证。OpenCode 本地分发复制完整目录并固定 launcher 路径。

本仓库发布还必须核验 tag/版本/main 合并记录，发布 tag 不改写、旧版本重跑不回退最新分发。历史资料迁移仍先保留有效知识，不删除用户未授权历史。

## v7.0.0 迁移清单（#56）

检测任一旧命令或旧标记即进入迁移：`/shw-research`、`/shw-import`、`/shw-issue`、`/shw-do`、`/shw-wrap`、旧 change 族、旧 prd/proto/arch/test 命令族、`/shw-review`，或 `<!-- shw-workflow:v6 -->`。

修复动作：

- 替换为 16 个生命周期命令；旧入口不保留 alias 或兼容 wrapper；
- 移除 `.changes/`、`specs/` 等已退役流程说明，先迁移有效知识再删除文件；
- `/shw-research` 的纯读语义迁移到 `/explore`；
- 首次接入与插件升级统一迁移到本命令；
- 全量重写项目工作流段，不局部字符串替换；用户自定义的非工作流规范保留；
- 部署改为项目仓库声明 + Fleet 拉取，项目 Agent 只经统一多集群 MCP 读取 Kubernetes。

迁移必须幂等：再次执行时无新的机械性改动，并仍会重新审计语义漂移。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
