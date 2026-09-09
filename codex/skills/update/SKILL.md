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

## 未发布（#132，基于 v7.2.1）的开发 K8S 与公共 CI 配置迁移

检测：person/rdev 运行依赖、远程同步/Docker 开发入口、PR 未合并即覆盖共享 dev、合入 dev 未自动部署 API/Web、小程序被当 Web 发布；缺项目前缀/域名清单、重复域名、test/main 继承 dev 中间件、Ingress TLS/强制 HTTPS 注解、prod 被当分支；公网 Action/镜像/传递下载与 CI 配置同用途异名。

修复：加载 shw-release-flow/references/environments.md 和 shw-test-spec/references/ci-config.md，全量盘点真实服务、共享依赖、部署路径、入口及配置。按用户已确认的固定开发集群与 main/test/dev 口径迁移，不重复裁决已确认事项；记录 dev push 到不可变镜像/digest、声明 revision、Fleet 与域名健康闭环。dev 自管全部中间件和持久化，test/生产仅部署应用并连接运维外部中间件；HTTP Ingress、外部 HTTPS 保留。项目 Agent 规范必须写入上述完整职责，不只给链接。

清理当前项目内已替代的 rdev/person 入口、CI 调用、活文档与环境样例；历史 Journal 保留历史身份，用户配置和其他仓库只读。统一变量/密钥先确认管理员已提供目标配置与正确权限，再改 workflow 引用并验证；外部尚未就绪列为待迁移，不制造断开的 CI。检查所有工作流、Action 内部脚本、Dockerfile 各 stage、Fleet/Helm 依赖的内部来源。插件自身不创建虚构 K8S 服务，保留真实制品发布链。

## v7.2.0 定向测试与内网缓存（#122，取代#112/#114的全量复用策略）

检测：API/E2E/VRT没有模块/文件选择器，空选择默认全测；Issue→dev执行全套或映射失败回退全量；dev→main复用历史结果跳过全测；本地任意入口跑完整测试；镜像仍在非ci-cache/公网，Action引用GitHub或存在内部下载，npm/Go有公网直连回退。

修复：引入shw-test-spec作为公共规范，复用现有test-plan/TDD/CI/验收入口，不新增日常命令。按模块组织用例并维护文件→模块影响映射；Issue只关联测试，未知范围明确失败，跨模块时细化到相关用例/文件；只有dev→main实际执行全量门禁。必要本地快速单测必须使用项目指定入口，不能替代CI。VRT基线、环境和阈值由项目确认，不自动改图/放宽阈值换绿。

所有实际使用的Docker镜像及services归公司Harbor ci-cache，Actions同步到Gitea actions组织并固定commit，npm/Go经公司已认证缓存。审计Action安装脚本、浏览器/字体/工具链下载链，优先预装和集中预热；普通test job禁止大量公网回源或静默direct回退。配套配置/镜像由维护者提供，项目Agent不写其他仓库/用户配置、不使用Ansible/Kubernetes写操作。删除旧CI结果复用跳过全量机制；保留一轮构建、结构/行为测试以及main人工合并和发布来源校验。

## v7.2.0 设计规范 Skill 命名（#120）

检测：活文档或命令仍加载shw-prototype-html，或把设计规范Skill误当新的日常命令/阶段。

修复：将活引用更新为shw-design-spec，保持原型目录组织、文件管理与验收职责，组件/视觉/交互继续引用公司前端规范。入口仍为/prototype，命令数与流程阶段不变；不复制目录成第二套Skill，历史Journal按历史记录保留。

## v7.2.0 公司规范驱动的 HTML 原型（#118，取代#95/#106/#116外部执行契约）

检测：项目仍强制调用OpenDesign或加载shw-opendesign；要求外部项目ID、模型/存储配置、MCP派发轮询或双存储导出；存在OpenDesign专属项目外写入例外；原型套用第三方视觉系统而忽略公司规范，或按Issue重复生成一套原型。

修复：prototype加载shw-design-spec，由当前宿主Agent直接在当前Issue工作区docs/design创建/增量修改HTML。公司frontend-stack/common/pc/mobile是技术栈、组件、主题与交互的规范来源，原型的可运行HTML表达不替代生产组件。目录按角色×端组织，产品/端index与语义页面、端内样式/脚本、素材、mock adapter/fixture分离；详情模拟仍按ID查独立数据，不用列表行冒充详情。不得重新加入文案关键词测试。

先记录旧目录基线和完整依赖，保留有效页面/状态/交互；已有外部工具完整导出可一次迁入，缺失文件由用户提供，不重新派发生成、不轮询、也不操作外部项目或用户配置。浏览器反馈直接改原文件，接受后清理被替代文件并复验。外部项目ID仅可保留为历史来源，不再作为运行前置。同步Agent规范、唯一PRD、原型索引和架构，移除外部设计执行要求及其文件系统例外，恢复正常工作区边界；不卸载用户已有工具/MCP。ui-design.md保持可选派生映射。#116默认模型、稳定项目与存储自治规则仅为被取代的历史，不继续作为插件执行契约。

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

CI依赖源按shw-test-spec/references/ci-cache.md固定：npm.shw.top/shared/CI_NPM_TOKEN，gop.shw.top/gop/CI_GO_TOKEN。仅原始Token由Gitea Secret提供，认证编码自动处理；只用Go标准库不强制Go Token。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
