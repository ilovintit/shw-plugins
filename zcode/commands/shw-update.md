---
description: 全量升级并对齐存量项目——审计代码、Agent 规范、产品文档、Gitea、CI、测试与部署声明，修到符合当前生命周期工作流。
argument-hint: [Issue 编号]
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

部署审查先按 `shw-release-flow` 判定产品形态：以下 Harbor/Fleet/deploy 要求仅适用于 Kubernetes 应用；插件/库/CLI 改核分发、安装升级和回退证据，并记录不适用依据。

这不是“接入工作流”的轻量命令，而是存量项目的全量一致性迁移。执行前加载 `shw-docs-audit`、`shw-product-docs`、`shw-gitea-flow`、`shw-gitea-repo`、`shw-worktree` 和 `shw-verify`。

## v7.3.0（#155）：main 回灌纯历史同步

检测：main 合入 dev 未改变文件树，却因更新现有 dev→main PR 的 HEAD 再次运行完整构建/测试；或仅凭同tree就跳过首次发布、真实内容变化及失败检查。

修复：按 shw-test-spec/references/history-sync.md 实体化同一PR的纯同步证据核验。保留轻量判定和受保护状态，成功证据缺失/失败/运行中/查询异常仍执行全量；不跳过真实变更，也不创建伪成功检查。同步项目CI与Agent规范。

## v7.3.0（#147）：插件自包含小程序上传

检测：业务workflow依赖library/we-chat-ci、现场npm install miniprogram-ci、复制自定义上传脚本、提交上传私钥、打印配置/SDK原始响应，或把上传成功等同审核发布；错误地把新上传镜像改进业务Dockerfile FROM。

修复：加载shw-release-flow/references/miniprogram/README.md及image/config/workflow参考，按真实小程序入口迁移。插件维护程序/SDK/镜像，项目保留自己的编译入口、API配置、AppID与robot；私钥迁到CI Secret并临时注入，删除已替代的项目上传实现须同Issue验证。先验证编译与预检，再在项目授权范围完成真实上传验收；本插件CI不使用业务身份上传。原library仓库不改，dev本地调试与业务基础镜像职责不变。

## v7.3.0（#79）：审查身份与产物隔离

检测：发布只按 profile 名判断模型、缺本次运行时身份/候选关联、缺目标宿主时输出所有 MCP 配置、非 Codex 产物含 Codex 专属审查 CLI/profile/沙箱启动指令、把可保存空配置说成已证明自动跳过连接。

修复：同步 shw-release-flow 的实际 model/provider 证据规则，缺失或回退停止放行；MCP 生成目标必填且校验，非 Codex 全部文本产物检查专属运行指令。ZCode 空配置按 shw-k8s-observer/config.md 记录未配置与待宿主实测边界，不改用户配置、不虚构动态启用机制。

## v7.3.0（#142）：开发中间件预缓存

检测：dev 的 silo/PostgreSQL/RabbitMQ/Valkey 或初始化/迁移镜像直接引用公网、latest、未验证digest；只检查YAML存在而没有内部缓存和平台证据；把ci-cache限定为仅自动化测试可用。

修复：加载 shw-backend-stack/references/middleware-cache.md 和 middleware-images.json，盘点项目实际依赖。专用维护CI先提供原样上游缓存并记录平台/健康，业务项目再将verified内部digest写入dev声明。RabbitMQ缓存不强制项目引入队列或升级大版本；其他平台/镜像缺项先补齐。写入项目Agent规范，仍不直接操作K8S或修改其他仓库。

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

## v7.3.0（#91）：发布通道与宿主边界

检测：仅用更高 tag 是否存在判断 main 可覆盖、未核验当前公开 main 的来源、只按路径字符串判断工作区根是否在仓库内、发布记录查询用尽后报普通不存在、把宿主内部运行状态当作 Agent 项目外写授权、缺固定版本安装/回退步骤。

修复：当前公开通道须匹配稳定 tag、制品版本及源提交记录，未知来源或观测期间变动拒绝覆盖。受管根按物理目录身份判断包含关系，保留符号链接防护；查询明确排序和 PR_LOOKUP_LIMIT。完整同步 shw-issue-gate 的宿主自主运行边界，按发行 README 补齐三宿主固定版本步骤，区分官方支持、CI fixture 和真实安装验收，不代用户修改安装环境。

## v7.3.0（#90）：Worktree 异常恢复

检测：缺失目录只能手改索引/另建分支处理、reconcile 一条坏记录中止整份报告、未区分残留状态快照与业务数据、慢 fetch 时指引删除全局锁。

修复：同步 shw-worktree/operations.md 的缺失目录原分支恢复、半成目录保留、逐项异常报告和有界 Git/持锁诊断。索引仍只由程序维护；不自动迁移既有外部工作区，不 force 或按时间抢占。更新插件后按原 Issue/claim 重试，丢失未提交文件仍需用户自行恢复。

## v7.3.0（#134）：Codex Kubernetes MCP 一次配置

检测：Codex 仍要求额外手工注册远程 kubernetes；存在旧用户级/项目级同名条目；规范无条件禁止任何本地转接、将配置写在插件版本目录或项目目录；身份混用、从不同来源拼接 URL/token。

修复：按 shw-k8s-observer/config.md 同步项目规范与安装指引。Codex 使用插件自带 stdio 薄壳，稳定用户文件为 `${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/kubernetes[.<profile>].env`，不同身份隔离，其他宿主保留现行直连。项目 Agent 只读盘点并给维护者列出实际绝对路径、备份/迁移/去重步骤；不得修改用户配置、安装缓存或远端网关。CLI/Desktop 工具可见和真实只读调用分别记录，不能把构建或模拟服务通过写成实机验收。未配置时明确报错，不回退 kubeconfig/kubectl 或缓存工具权限。本变更从 v7.3.0 开始分发；v7.2.1 仍使用旧用户级直连注册。

## v7.3.0（#136）：CI 执行镜像与业务基础镜像分离

检测：把 shw-ci-* 写入业务 Dockerfile FROM/应用 Deployment、修改已有 library 仓库、创建插件 runtime 镜像、自建镜像推 ci-cache；旧 Harbor 域名、HARBOR_REGISTRY、环境四件套强制必填、按项目填写域名/Secret 引用/工具镜像版本后台变量；CI_NPM_TOKEN/CI_GO_TOKEN 旧名称；Fleet 直接监听或 CI 回写受保护业务分支。

修复：加载 shw-test-spec/references/ci-images.md、ci-config.md、ci-images.json 与 shw-release-flow/references/environments.md。只在 workflow 执行层使用插件公开工具镜像，路径/固定版本由插件维护；业务构建和运行 FROM 按项目原有 library 方案。默认 Harbor 使用 reg.shw.top，HARBOR_ADDR/PROJECT/USERNAME/PASSWORD 公共值加 PROD/TEST/DEV/CI 逐字段可选覆盖。域名、Namespace、Secret 引用、服务数量写项目代码；NPM_TOKEN/GO_TOKEN 可由组织 Secret 授权，不内嵌镜像。旧配置未就绪时明确过渡项，不静默断开 CI。

业务分支 main/test/dev 不变；Fleet 分别监听 fleet/prod、fleet/test、fleet/dev。项目 Agent 只改自身 Issue 工作区和已授权 Gitea，现有 library/业务项目迁移由对应项目执行，不跨仓库直接改写。基础镜像仓库构建成功和业务迁移通过分别验证；插件发布采用正式 tag 流程，本节不自行确定发行版本。

## v7.2.1 开发 K8S 与公共 CI 配置迁移（#132）

检测：person/rdev 运行依赖、远程同步/Docker 开发入口、PR 未合并即覆盖共享 dev、合入 dev 未自动部署 API/Web、小程序被当 Web 发布；缺项目前缀/域名清单、重复域名、test/main 继承 dev 中间件、Ingress TLS/强制 HTTPS 注解、prod 被当分支；公网 Action/镜像/传递下载与 CI 配置同用途异名。

修复：加载 shw-release-flow/references/environments.md 和 shw-test-spec/references/ci-config.md，全量盘点真实服务、共享依赖、部署路径、入口及配置。按用户已确认的固定开发集群与 main/test/dev 口径迁移，不重复裁决已确认事项；记录 dev push 到不可变镜像/digest、声明 revision、Fleet 与域名健康闭环。dev 自管全部中间件和持久化，test/生产仅部署应用并连接运维外部中间件；HTTP Ingress、外部 HTTPS 保留。项目 Agent 规范必须写入上述完整职责，不只给链接。

清理当前项目内已替代的 rdev/person 入口、CI 调用、活文档与环境样例；历史 Journal 保留历史身份，用户配置和其他仓库只读。统一变量/密钥先确认管理员已提供目标配置与正确权限，再改 workflow 引用并验证；外部尚未就绪列为待迁移，不制造断开的 CI。检查所有工作流、Action 内部脚本、Dockerfile 各 stage、Fleet/Helm 依赖的内部来源。插件自身不创建虚构 K8S 服务，保留真实制品发布链。

## v7.2.0 定向测试与内网缓存（#122，取代#112/#114的全量复用策略）

检测：API/E2E/VRT没有模块/文件选择器，空选择默认全测；Issue→dev执行全套或映射失败回退全量；dev→main复用历史结果跳过全测；本地任意入口跑完整测试；镜像来源未按原样缓存/自建执行镜像/业务基础镜像分类，或仍引用公网，Action引用GitHub或存在内部下载，npm/Go有公网直连回退。

修复：引入shw-test-spec作为公共规范，复用现有test-plan/TDD/CI/验收入口，不新增日常命令。按模块组织用例并维护文件→模块影响映射；Issue只关联测试，未知范围明确失败，跨模块时细化到相关用例/文件；只有dev→main实际执行全量门禁。必要本地快速单测必须使用项目指定入口，不能替代CI。VRT基线、环境和阈值由项目确认，不自动改图/放宽阈值换绿。

原样上游镜像缓存归公司Harbor ci-cache；插件自建执行镜像归library/shw-ci-*，业务Dockerfile基础镜像由项目选择原有library镜像，Actions同步到Gitea actions组织并固定commit，npm/Go经公司已认证缓存。审计Action安装脚本、浏览器/字体/工具链下载链，优先预装和集中预热；普通test job禁止大量公网回源或静默direct回退。配套配置/镜像由维护者提供，项目Agent不写其他仓库/用户配置、不使用Ansible/Kubernetes写操作。删除旧CI结果复用跳过全量机制；保留一轮构建、结构/行为测试以及main人工合并和发布来源校验。

## v7.2.0 设计规范 Skill 命名（#120）

检测：活文档或命令仍加载shw-prototype-html，或把设计规范Skill误当新的日常命令/阶段。

修复：将活引用更新为shw-design-spec，保持原型目录组织、文件管理与验收职责，组件/视觉/交互继续引用公司前端规范。入口仍为/shw-prototype，命令数与流程阶段不变；不复制目录成第二套Skill，历史Journal按历史记录保留。

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
- `/shw-research` 的纯读语义迁移到 `/shw-explore`；
- 首次接入与插件升级统一迁移到本命令；
- 全量重写项目工作流段，不局部字符串替换；用户自定义的非工作流规范保留；
- 部署改为项目仓库声明 + Fleet 拉取，项目 Agent 只经统一多集群 MCP 读取 Kubernetes。

迁移必须幂等：再次执行时无新的机械性改动，并仍会重新审计语义漂移。

CI依赖源按shw-test-spec/references/ci-cache.md固定：npm.shw.top/shared/NPM_TOKEN，gop.shw.top/gop/GO_TOKEN。仅原始Token由Gitea Secret提供，认证编码自动处理；只用Go标准库不强制Go Token。
