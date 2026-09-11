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

## 待发布（#177）：发布前双模型 review 改为用户可选

检测：release、Agent规范或产品/架构文档仍无条件要求 GLM-5.3 与 Kimi-K3 发布前审查；因本机 profile 存在就自动启动；把用户未明确选择视为执行；或把默认跳过写成 review 已通过。

修复：每次 release 阶段 A 明确询问用户本次是否需要双模型 review，默认跳过；用户回答“不”或未明确肯定时记录裁决与 candidate SHA 后继续。只有用户明确回答“要”时才完整沿用现有 GLM-5.3 + Kimi-K3 双模型方式、固定候选、运行时身份核验、报告留存及阻断项清零规则。用户另行手动安排的 GLM、Claude Code 或其他 review 只作为附加证据，不自动替代本次双模型选择。

## 待发布（#175）：Gitea runner 轻重资源池分流

检测：workflow 仍使用会随机落到任意资源池的 `ubuntu-latest` 兼容标签；Issue→dev 定向快速门禁、发布构建或镜像构建固定在重型池；dev→main 全量测试及其他重型测试仍在快速池或随机池；同一 PR workflow 未按可信目标分支区分快速与全量检查。

修复：加载 shw-test-spec/references/ci-config.md，按真实任务性质把 workflow 显式迁至 `ci-fast` 或 `ci-heavy`。Issue→dev、发布构建和镜像构建使用 `ci-fast`，dev→main 全量检查及其他重型测试使用 `ci-heavy`；大型缓存准备等维护任务按真实负载单独判断。保持受保护 job 名，核对所有项目 workflow、复用模板与生成产物，不修改 runner 主机或项目外配置。

## 待发布（#173）：仓库级工作流禁用与无项目会话

检测：先确认当前目录是否属于 Git 仓库，再只检查仓库根的 `.shw-workflow-ignore`。无 Git 仓库默认不进入 update；存在忽略标记时停止自动审计，不创建 Issue、不申请 worktree、不修改或删除标记。项目 `AGENTS.md` 若仍强制 SHW 生命周期，记录为需要该项目自行处理的冲突，不能由插件升级跨项目覆盖。

修复：只有用户针对本次任务明确要求覆盖忽略标记时才继续 update，并保留标记。需要退出 SHW 生命周期的存量项目，应在该项目自己的授权变更中提交仓库根 `.shw-workflow-ignore`，同时移除或改写 `AGENTS.md` 中冲突的 SHW 强制条款；不能只添加标记却保留更高优先级冲突指令。无项目普通会话无需创建任何标记文件。

边界：忽略标记只关闭 SHW 提示词工作流，不扩大宿主或远端权限。Ansible/运维仓库可在用户授权目标、动作和凭据使用方式后运行仓库内 playbook 修改远端目标；这不等于允许 Agent 直接写本机其他项目或用户目录。

## v7.4.x（#183）：多 Rancher Fleet 只读观测

检测：把 Fleet控制面资源误认为位于下游业务集群；只配置下游 kubeconfig却声称已核验 Fleet；多个 Rancher管理 context均保留 `local` 导致合并覆盖；项目 Agent直接持有 Rancher Token、kubeconfig或依赖默认 context；把关闭 TLS证书验证扩写成通用 Kubernetes默认。

修复：按 shw-k8s-observer 的多 Rancher边界拆分管理面与下游只读权限。基础设施侧为每套 Rancher显式登记稳定别名，管理 context只读目标 FleetWorkspace，业务 context只读目标 Namespace；聚合时同步重命名 cluster、user、context为 `<rancher>/<原名称>` 并清空默认 context。真实凭据、聚合配置和输出不进入业务仓库或 Agent上下文。当前公司内网 MCP网关确需跳过后端 TLS验证时，必须同时保留可信网络边界、最小权限、HTTPS鉴权和审计，并记录为部署例外而非通用建议。

## v7.4.2（#171）：Issue 清理后的本地分支与 dev 同步

检测：Issue PR 合入 `dev` 后只删除远端分支或 worktree，本地仍残留 Issue 分支；主 checkout 的本地 `dev` 长期落后 `origin/dev`；或清理通过 reset/force 覆盖本地来源分支的脏文件、分叉提交。

修复：交付收口先 fetch 并证明 Issue HEAD 已进入来源分支，再由 worktree MCP remove 做安全预检；只有本地来源分支可快进时，才删除受管 worktree 和本地 Issue 分支，随后把本地 `dev`（Hotfix 为 `main`）快进到对应 `origin/*`。远端 Issue 分支仍由 Gitea 合并/交付流程删除。脏、分叉、缺失、占用冲突或同步竞态均不 reset/force，保留可恢复现场并报告。

## v7.4.1（#169）：Taro 分端输出与调试会话复用

检测：H5/微信共用 dist 根目录、构建脚本清空其他端产物、miniprogramRoot/上传/H5部署仍指向旧目录，或正常改代码时关闭并重开已可调试的微信项目。

修复：按 shw-frontend-spec-mobile 将 outputRoot 配置为 dist/${process.env.TARO_ENV}，同步 dist/h5、dist/weapp 的全部消费路径和单平台清理范围；保留正常项目、自动化连接和 watch，断连先重连，卡死恢复沿用已确认权限。将完整约束写入项目 Agent 规范，分别核对两端构建产物及调试复用，未实测项明确记录。

## v7.3.0（#155）：main 回灌纯历史同步

检测：main 合入 dev 未改变文件树，却因更新现有 dev→main PR 的 HEAD 再次运行完整构建/测试；或仅凭同tree就跳过首次发布、真实内容变化及失败检查。

修复：按 shw-test-spec/references/history-sync.md 实体化同一PR的纯同步证据核验。保留轻量判定和受保护状态，成功证据缺失/失败/运行中/查询异常仍执行全量；不跳过真实变更，也不创建伪成功检查。同步项目CI与Agent规范。

## v7.3.0（#147）：插件自包含小程序上传

检测：业务workflow依赖library/we-chat-ci、现场npm install miniprogram-ci、复制自定义上传脚本、提交上传私钥、打印配置/SDK原始响应，或把上传成功等同审核发布；错误地把新上传镜像改进业务Dockerfile FROM。

修复：加载shw-release-flow/references/miniprogram/README.md及image/config/workflow参考，按真实小程序入口迁移。插件维护程序/SDK/镜像，项目保留自己的编译入口、API配置、AppID与robot；私钥迁到CI Secret并临时注入，删除已替代的项目上传实现须同Issue验证。先验证编译与预检，再在项目授权范围完成真实上传验收；本插件CI不使用业务身份上传。原library仓库不改，dev本地调试与业务基础镜像职责不变。

## v7.4.1（#162/#164）：微信开发者工具本地自动化边界

检测：项目Agent规范允许或默认由 Computer Use 直接操作微信开发者工具完成导航、交互、断言或调试；未声明 `automate-ci` 主控制路径；未区分打开/截图、卡死时关闭/重新编译的免确认操作与其他须逐次确认的操作。

修复：加载 shw-frontend-spec-mobile 与 shw-release-flow/references/environments.md。写明打开微信开发者工具后正常调试全程使用微信 `automate-ci` 工具；Computer Use 可直接用于打开工具和截图，卡死时可直接关闭工具和触发重新编译；除此之外必须先说明拟操作内容并逐次取得用户明确确认，才可执行 Computer Use 操作。

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

检测：把 shw-ci-* 写入业务 Dockerfile FROM/应用 Deployment、修改已有 library 仓库、创建插件 runtime 镜像、自建镜像推 ci-cache；旧 Harbor 域名、HARBOR_REGISTRY、环境四件套强制必填、按项目填写域名/ConfigMap名称/工具镜像版本后台变量；CI_NPM_TOKEN/CI_GO_TOKEN 旧名称；Fleet 直接监听或 CI 回写受保护业务分支。

修复：加载 shw-test-spec/references/ci-images.md、ci-config.md、ci-images.json 与 shw-release-flow/references/environments.md。只在 workflow 执行层使用插件公开工具镜像，路径/固定版本由插件维护；业务构建和运行 FROM 按项目原有 library 方案。默认 Harbor 使用 reg.shw.top，HARBOR_ADDR/PROJECT/USERNAME/PASSWORD 公共值加 PROD/TEST/DEV/CI 逐字段可选覆盖。域名、Namespace、ConfigMap 名称、服务数量写项目代码；NPM_TOKEN/GO_TOKEN 可由组织 Secret 授权，不内嵌镜像。旧配置未就绪时明确过渡项，不静默断开 CI。

业务分支 main/test/dev 不变；Fleet 分别监听 fleet/prod、fleet/test、fleet/dev。项目 Agent 只改自身 Issue 工作区和已授权 Gitea，现有 library/业务项目迁移由对应项目执行，不跨仓库直接改写。基础镜像仓库构建成功和业务迁移通过分别验证；插件发布采用正式 tag 流程，本节不自行确定发行版本。

## v7.2.1 开发 K8S 与公共 CI 配置迁移（#132）

检测：person/rdev 运行依赖、远程同步/Docker 开发入口、PR 未合并即覆盖共享 dev、合入 dev 未自动部署 API/Web、小程序被当 Web 发布；缺项目前缀/域名清单、重复域名、test/main 继承 dev 中间件、Ingress TLS/强制 HTTPS 注解、prod 被当分支；公网 Action/镜像/传递下载与 CI 配置同用途异名。

修复：加载 shw-release-flow/references/environments.md 和 shw-test-spec/references/ci-config.md，全量盘点真实服务、共享依赖、部署路径、入口及配置。按用户已确认的固定开发集群与 main/test/dev 口径迁移，不重复裁决已确认事项；记录 dev push 到不可变镜像/digest、声明 revision、Fleet 与域名健康闭环。dev 自管全部中间件和持久化，test/生产仅部署应用并连接运维外部中间件；HTTP Ingress、外部 HTTPS 保留。项目 Agent 规范必须写入上述完整职责，不只给链接。

清理当前项目内已替代的 rdev/person 入口、CI 调用、活文档与环境样例；历史 Journal 保留历史身份，用户配置和其他仓库只读。统一变量/密钥先确认管理员已提供目标配置与正确权限，再改 workflow 引用并验证；外部尚未就绪列为待迁移，不制造断开的 CI。检查所有工作流、Action 内部脚本、Dockerfile 各 stage、Fleet/Helm 依赖的内部来源。插件自身不创建虚构 K8S 服务，保留真实制品发布链。

## v7.4.0（#179）：Fleet 全环境 ConfigMap

检测：任一 dev/test/生产 Fleet 源或渲染结果包含 Kubernetes Secret/SecretList、`secretKeyRef`、`secretRef`、Secret volume、`secretName`、`imagePullSecrets`，或文档仍要求通过 Kubernetes Secret 注入运行配置；dev 自建中间件参数依赖 Fleet 外人工配置，未随项目声明完整维护。

修复：所有环境统一用 ConfigMap 和 `configMapKeyRef`/`configMapRef` 提供运行配置。dev 的 ConfigMap、自建中间件账号密码及初始化参数由项目仓库/Fleet 全量维护；其资源仅限开发集群项目范围、不向集群外开放，并允许清空重建。test/生产逐环境盘点现有值来源、引用消费者和切换顺序，先建立等价 ConfigMap、更新全部工作负载并验证连接，再由用户/基础设施侧处理旧 Secret；项目 Agent 不直接写 Kubernetes或擅自删除旧资源。镜像拉取能力由集群/基础设施预置，CI Secret 不迁入 ConfigMap。迁移后定向扫描源模板和 GitOps 渲染结果，确保没有残留 Secret 资源或引用。

## v7.4.0（#181）：dev→main 全量检查允许用户例外合并

检测：dev→main 未触发全量自动化；或分支保护把检查配置成用户也无法覆盖的绝对阻断；或工作流/Agent 在失败、未完成、测试维护滞后时自行合并 main；或用户已例外合并却被记录为 CI 绿、无风险。

修复：保留每个 dev→main 当前候选实际启动全量自动化，并保留失败/未完成的真实状态；main 始终仅由用户在 Web UI 合并，同时允许用户基于紧急性或已完成人工验证覆盖检查结果。不得授予 Agent/API main 合并权。为每次例外记录 PR/candidate SHA、实际 CI 状态和失败项、人工验证范围与证据、理由、风险、回滚及未修测试的后续 Issue/责任归属；release、deploy、version-close 延续该记录，不把生产可用反写为自动化通过。Issue→dev 仍须相关 CI 全绿后才由 Agent 合并。

## v7.2.0 定向测试与内网缓存（#122，取代#112/#114的全量复用策略）

检测：API/E2E/VRT没有模块/文件选择器，空选择默认全测；Issue→dev执行全套或映射失败回退全量；dev→main复用历史结果跳过全测；本地任意入口跑完整测试；镜像来源未按原样缓存/自建执行镜像/业务基础镜像分类，或仍引用公网，Action引用GitHub或存在内部下载，npm/Go有公网直连回退。

修复：引入shw-test-spec作为公共规范，复用现有test-plan/TDD/CI/验收入口，不新增日常命令。按模块组织用例并维护文件→模块影响映射；Issue只关联测试，未知范围明确失败，跨模块时细化到相关用例/文件；只有dev→main实际执行全量检查，并按#181保留用户例外合并权。必要本地快速单测必须使用项目指定入口，不能替代CI。VRT基线、环境和阈值由项目确认，不自动改图/放宽阈值换绿。

原样上游镜像缓存归公司Harbor ci-cache；插件自建执行镜像归library/shw-ci-*，业务Dockerfile基础镜像由项目选择原有library镜像，Actions同步到Gitea actions组织并固定commit，npm/Go经公司已认证缓存。审计Action安装脚本、浏览器/字体/工具链下载链，优先预装和集中预热；普通test job禁止大量公网回源或静默direct回退。配套配置/镜像由维护者提供，项目Agent不写其他仓库/用户配置、不使用Ansible/Kubernetes写操作。删除旧CI结果复用跳过全量机制；保留一轮构建、结构/行为测试以及main人工合并和发布来源校验。

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

CI依赖源按shw-test-spec/references/ci-cache.md固定：npm.shw.top/shared/NPM_TOKEN，gop.shw.top/gop/GO_TOKEN。仅原始Token由Gitea Secret提供，认证编码自动处理；只用Go标准库不强制Go Token。

### GitOps publisher 1.0.0（#157）

检测：CI 从旧 fleet/* 分支仅替换镜像、构建后 checkout 最新 dev、强推覆盖历史、自写发布脚本、镜像浮动标签、缺完整服务清单或来源记录；目标目录人工修改、Fleet 控制文件被生成器忽略、CI 镜像未固定 published digest。

修复：按 shw-release-flow/references/gitops/README.md 全量盘点部署源、渲染器、服务输入、现有 Fleet 路径及控制语义；保留已确认资源和数据。配置唯一应用部署源、完整镜像来源记录，使用固定已发布工具镜像从精确业务 SHA 生成资源，以普通追加提交推进已授权 fleet/* 目录。接入已登记同仓库或独立仓库，不自行创建/迁移外部项目或获取集群凭据。

旧未受管目录不能被程序直接覆盖：先在用户/基础设施侧确认路径/Helm 身份接管与资源保留方案，再切换，不自动删除旧资源。将来源一致性、完整新增/删除、旧 run/竞争拒绝、业务分支保护、Git 与 Fleet 验证边界完整写入项目 Agent 规范；不能只新增文档链接。镜像 published 缺失或项目依赖未支持的 Fleet 控制语义时准确交接，不伪称已迁移。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
