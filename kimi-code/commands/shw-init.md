---
description: 初始化空项目或新项目——建立产品文档、Git/Gitea、CI、分支和部署声明骨架，然后进入产品定义。
argument-hint: [项目说明]
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

把空目录或尚未形成实质产品内容的新项目初始化为当前生命周期工作流。执行前加载 `shw-gitea-flow`、`shw-gitea-repo`、`shw-product-docs`；涉及端口时再加载 `shw-port-manager`。

## 守卫

- 若已有实质代码、历史文档或既有 Git 流程，停止使用本命令并转 `/shw-update`。
- 不替用户决定产品范围、客户端入口、技术栈或部署环境。

## 执行

1. 确认产品名称、目标用户、预期入口（管理端、用户端、移动端等）、仓库归属、技术栈和预期环境。
2. 初始化 Git 与 Gitea 仓库，建立 `dev` 开发线和 `main` 发布线；main 只允许用户在 Web UI 合并。
3. 建立基础目录：
   - `docs/prd/`：产品级 PRD 真相；
   - `docs/design/`：由当前Agent按公司规范直接维护的产品/端入口、语义HTML页面与完整支持文件；确有实现映射需要时，可在入口目录增加由原型派生的 `ui-design.md`；
   - `docs/architecture/`：整体架构入口及按端/服务/领域拆分文档；
   - `docs/journal/`：过程记录；
   - `deploy/`：仅 Kubernetes 应用建立 Fleet/Kustomize/Helm 声明；插件/库/CLI 在架构说明分发与安装方式。
4. 写入带 `<!-- shw-workflow:lifecycle-v1 -->` 标记的项目 Agent 规范，明确 Issue、worktree、PR、CI、main 人工合并、Fleet 拉取部署和 Kubernetes 只读边界；完整写入 shw-issue-gate 的项目外只读、用户介入、真实路径和有限运行例外规则，并明确原型由当前Agent直接在docs/design持续维护、目录职责分离及公司前端规范优先，不能只写 Skill 链接。
5. 建立Gitea labels、分支保护和PR Gate；加载shw-test-spec，要求API/E2E/VRT具备模块/文件选择器，Issue只跑关联检查、dev→main实际全量，空选择不全测。CI执行镜像读取插件ci-images.json，原样缓存使用Harbor ci-cache，业务Dockerfile FROM仍由项目选择原有library镜像，Actions引用Gitea actions组织镜像，npm/Go配置公司缓存；缺少镜像或凭据由维护者补齐，不退回公网。默认CI，必要本地小单测走项目入口；不写机械文字断言或部署凭据。
6. 做构建级验证，提交初始化 PR；不直接合并 main。
7. 初始化完成后指向 `/shw-product`，不自动创建首个功能 Issue 或 Version。

## 完成条件

目录、Agent 规范、Gitea 设施、CI 和分支模型均已取证；任何未完成项明确列出，不用空文件或 TODO 冒充产品定义完成。

CI依赖源按shw-test-spec/references/ci-cache.md固定：npm.shw.top/shared/NPM_TOKEN，gop.shw.top/gop/GO_TOKEN。仅原始Token由Gitea Secret提供，认证编码自动处理；只用Go标准库不强制Go Token。

## Kubernetes 开发环境初始化

加载 shw-release-flow/references/environments.md 与 shw-test-spec/references/ci-config.md。写入项目 Agent 规范：Issue 分支快速门禁→合入 dev→自动部署变化的 API/Web；小程序本地编译连开发 API。固定开发集群，记录唯一项目前缀、Namespace 和 xxx-api.shwkj.cn 等域名；dev 自管全部中间件，test/main 外接运维中间件，Fleet 管理应用 Deployment/Service/Ingress。所有环境 HTTP Ingress、前置 Nginx 卸载 SSL。不恢复 person/rdev 前置。根据已登记事实建立镜像更新闭环和统一 CI 输入；外部前置如未具备，明确交接而不猜值。

初始化必须把 CI 执行镜像与业务 Dockerfile builder/runtime FROM 的职责区别完整写入项目 Agent 规范：前者用插件固定清单，后者沿用项目要求的既有 library 镜像，不自动替换。同步写入 Harbor 公共四件套与环境逐字段覆盖、部署细节留在代码、dev/test/main→fleet/dev/test/prod 专用分支映射。

初始化还必须将 shw-issue-gate 的宿主自主运行边界写入项目 Agent 规范：内部会话/日志不等于 Agent 外部输出授权，不能为运行任务手改宿主状态或配置。插件/库/CLI 架构中记录固定版本制品获取、安装与回退步骤及未实测范围。

开发 K8S 初始化须加载 shw-backend-stack/references/middleware-cache.md 与 middleware-images.json；先盘点所需中间件/初始化镜像、匹配平台与拉取权限，完成内部预热后再写入 dev Fleet 声明。项目 Agent 规范必须写明“先缓存验证、后部署”，不引用公网或未验证的占位 digest。

包含微信小程序时加载 shw-release-flow/references/miniprogram/README.md、image.json 和workflow/config示例；按真实入口实体化项目构建脚本、配置和上传workflow，使用已验证的插件镜像，不现场安装SDK或依赖library/we-chat-ci。私钥只注入上传步骤，main/test触发与用户验收边界写入项目Agent规范，dev仍本地调试。

### GitOps 发布程序初始化（#157）

Kubernetes 项目加载 shw-release-flow/references/gitops/README.md、image.json 和配置/workflow 示例；published 缺失时记录未具备条件，不写可运行结论。配置项目服务、完整构建影响输入、环境模板与已授权目标目录，业务构建输出绑定源码 SHA 的完整镜像记录。CI 调用固定 digest 的 shw-gitops，不复制程序或自行拼 sed/git push。把固定 SHA、完整新增/删除、旧 run 拒绝、普通追加历史、项目外只读和 Git 成功/Fleet 就绪区分完整写入 Agent 规范。生产接既有 release/tag 放行链；Fleet 路径登记由用户/基础设施侧完成。
