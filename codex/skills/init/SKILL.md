---
name: init
description: "Codex prompt workflow for init、/init. 初始化空项目或新项目——建立产品文档、Git/Gitea、CI、分支和部署声明骨架，然后进入产品定义。 Use only when the user explicitly asks for this named workflow."
---

# init

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `init`、`/init` 或要求执行该工作流时按下方原文执行。

**参数**：[项目说明]

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

把空目录或尚未形成实质产品内容的新项目初始化为当前生命周期工作流。执行前加载 `shw-gitea-flow`、`shw-gitea-repo`、`shw-product-docs`；涉及端口时再加载 `shw-port-manager`。

## 守卫

- 初始化入口允许从无 Git 仓库的已确认目标目录开始。若目标目录已位于 Git 仓库且仓库根存在 `.shw-workflow-ignore`，不得初始化或移除标记；说明冲突，只有用户针对本次任务明确要求覆盖后才继续。
- 若已有实质代码、历史文档或既有 Git 流程，停止使用本命令并转 `/update`。
- 不替用户决定产品范围、客户端入口、技术栈或部署环境。

## 执行

加载 `shw-gitea-ci/references/project-template.md`。空项目初始化时必须让用户选择 `issue-main`、`issue-dev` 或 `managed`，并生成 `.shw/project.yaml`；不检测、复用或迁移现有模式。公共 Taro UI/Go 库只能通过私有包源按版本引用，不创建公共组件 submodule。若目录已有实质代码、文档、Git 流程或模式标识，停止并提示使用 `update`。

1. 确认产品名称、目标用户、预期入口（管理端、用户端、移动端等）、仓库归属、技术栈和预期环境。
2. 按用户选择的模式初始化：`issue-main` 只建立 Issue 分支到 main 的项目约定；`issue-dev` 只建立 Issue 分支到 dev、再到 main 的项目约定；仅 `managed` 才建立完整 dev/main 业务项目发布线。main 只允许用户在 Web UI 合并。
3. 仅 `managed` 建立下列业务项目基础目录；`issue-main`/`issue-dev` 保留项目自身目录，不创建这些目录：
   - `docs/prd/`：产品级 PRD 真相；
   - `docs/design/`：由当前Agent按公司规范直接维护的产品/端入口、语义HTML页面与完整支持文件；确有实现映射需要时，可在入口目录增加由原型派生的 `ui-design.md`；
   - `docs/architecture/`：整体架构入口及按端/服务/领域拆分文档；
   - `docs/journal/`：过程记录；
   - `deploy/`：仅 Kubernetes 应用建立 Fleet/Kustomize/Helm 声明；插件/库/CLI 在架构说明分发与安装方式。
4. 写入带 `<!-- shw-workflow:lifecycle-v1 -->` 标记的项目 Agent 规范；`issue-main`/`issue-dev` 只写对应 Issue、worktree、PR、项目原生 CI 和证据边界，`managed` 才完整写入目录、测试、发布、部署和公司规范。
5. 仅 `managed` 建立标准 Gitea labels、分支保护、PR Gate、API/E2E/VRT 映射、CI 镜像和部署契约；轻量模式只记录项目自身 CI 与 Issue/PR 证据，不创建业务项目测试或部署约束。
6. 做构建级验证，提交初始化 PR；不直接合并 main。
7. 初始化完成后指向 `/product`，不自动创建首个功能 Issue 或 Version。

## 完成条件

目录、Agent 规范、Gitea 设施、CI 和分支模型均已取证；任何未完成项明确列出，不用空文件或 TODO 冒充产品定义完成。

CI依赖源按shw-test-spec/references/ci-cache.md固定：npm.shw.top/shared/NPM_TOKEN，gop.shw.top/gop/GO_TOKEN。仅原始Token由Gitea Secret提供，认证编码自动处理；只用Go标准库不强制Go Token。

## Kubernetes 开发环境初始化

加载 shw-release-flow/references/environments.md 与 shw-test-spec/references/ci-config.md。写入项目 Agent 规范：Issue 分支快速门禁→合入 dev→自动部署变化的 API/Web；小程序本地编译连开发 API。固定开发集群，记录唯一项目前缀、Namespace 和 xxx-api.shwkj.cn 等域名；dev 自管全部中间件，test/main 外接运维中间件，Fleet 管理应用 Deployment/Service/Ingress。所有环境 HTTP Ingress、前置 Nginx 卸载 SSL。不恢复 person/rdev 前置。根据已登记事实建立镜像更新闭环和统一 CI 输入；外部前置如未具备，明确交接而不猜值。

初始化必须把 CI 执行镜像与业务 Dockerfile builder/runtime FROM 的职责区别完整写入项目 Agent 规范：前者用插件固定清单，后者沿用项目要求的既有 library 镜像，不自动替换。同步写入 Harbor 公共四件套与环境逐字段覆盖、部署细节留在代码、dev/test/main→fleet/dev/test/prod 专用分支映射。

初始化还必须将 shw-issue-gate 的宿主自主运行边界写入项目 Agent 规范：内部会话/日志不等于 Agent 外部输出授权，不能为运行任务手改宿主状态或配置。插件/库/CLI 架构中记录固定版本制品获取、安装与回退步骤及未实测范围。

Kubernetes 应用必须完整写入 Fleet ConfigMap 契约：dev/test/生产均不创建或引用承载运行配置的 Kubernetes Secret/SecretList、`secretKeyRef`、`secretRef`、Secret volume 或 `secretName`，工作负载只用 `configMapKeyRef`/`configMapRef` 读取运行配置。dev 的 ConfigMap 和自建中间件账号密码由项目仓库/Fleet 全量维护；test/生产配置值按环境隔离并限制仓库与日志可见范围。镜像拉取认证由集群/基础设施预置：预置形式为节点级授权时声明无需额外字段，预置形式为 Namespace 内拉取凭据 Secret 时，工作负载用 `imagePullSecrets` 按名称引用该既有 Secret（不自建、不把内容写入仓库）。CI 凭据仍用 Gitea Secret，两者不得混写。

开发 K8S 初始化须加载 shw-backend-stack/references/middleware-cache.md 与 middleware-images.json；先盘点所需中间件/初始化镜像、匹配平台与拉取权限，完成内部预热后再写入 dev Fleet 声明。项目 Agent 规范必须写明“先缓存验证、后部署”，不引用公网或未验证的占位 digest。

包含微信小程序时加载 shw-release-flow/references/miniprogram/README.md、image.json、workflow/config示例及 shw-frontend-spec-mobile；按真实入口实体化项目构建脚本、配置和上传workflow，使用已验证的插件镜像，不现场安装SDK或依赖library/we-chat-ci。私钥只注入上传步骤，main/test触发与用户验收边界写入项目Agent规范，dev仍本地调试。项目Agent规范必须同时写明：打开微信开发者工具后全程使用微信 `automate-ci` 工具调试；Computer Use 可直接打开工具和截图，卡死时可直接关闭工具和触发重新编译；其他操作须先说明内容并逐次取得用户明确确认。

Taro 项目初始化同时按 shw-frontend-spec-mobile 配置分端输出：H5 为 dist/h5，微信为 dist/weapp；同步开发者工具 miniprogramRoot、自动化与上传路径、H5 部署/归档路径和按平台清理范围。将“项目正常调试时改代码保持打开、复用自动化连接和 watch，不反复关闭重开”写入项目 Agent 规范。

### 统一图标初始化（#195）

任何含前端入口的项目都加载 `shw-frontend-spec-common/references/icon-management.md`。建立受版本控制的 `deploy/icons/config.json`，每个真实端只声明业务语义名→**已由 `shw-plugins` 批准**的 Lucide 名称、font family/prefix、`IconFont` 产物位置；微信原生 TabBar 再声明输出目录、尺寸、普通/选中色与图标语义名。项目不安装 `lucide-static`、`svgtofont` 或复制图标构建脚本；CI 使用已验证的 `shw-ci-icons` 不可变 digest。新增图标需求必须提交 `shw-plugins`，不得修改或管理仅作快照存储的 `shw-forks/lucide`。发布字体仍由项目既有静态资源流程和 Gitea Secret 提供凭据，不能把凭据写入配置。页面只使用生成的字体图标组件；TabBar 的普通/选中 PNG 必须由同一映射生成。

### GitOps 发布程序初始化（#157）

Kubernetes 项目加载 shw-release-flow/references/gitops/README.md、image.json 和配置/workflow 示例；published 缺失时记录未具备条件，不写可运行结论。配置项目服务、完整构建影响输入、环境模板与已授权目标目录，业务构建输出绑定源码 SHA 的完整镜像记录。CI 调用固定 digest 的 shw-gitops，不复制程序或自行拼 sed/git push。把固定 SHA、完整新增/删除、旧 run 拒绝、普通追加历史、项目外只读和 Git 成功/Fleet 就绪区分完整写入 Agent 规范。生产接既有 release/tag 放行链；Fleet 路径登记由用户/基础设施侧完成。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
