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
5. 建立Gitea labels、分支保护和PR Gate；加载shw-test-spec，要求API/E2E/VRT具备模块/文件选择器，Issue只跑关联检查、dev→main实际全量，空选择不全测。CI镜像引用公司Harbor ci-cache，Actions引用Gitea actions组织镜像，npm/Go配置公司缓存；缺少镜像或凭据由维护者补齐，不退回公网。默认CI，必要本地小单测走项目入口；不写机械文字断言或部署凭据。
6. 做构建级验证，提交初始化 PR；不直接合并 main。
7. 初始化完成后指向 `/shw-product`，不自动创建首个功能 Issue 或 Version。

## 完成条件

目录、Agent 规范、Gitea 设施、CI 和分支模型均已取证；任何未完成项明确列出，不用空文件或 TODO 冒充产品定义完成。

CI依赖源按shw-test-spec/references/ci-cache.md固定：npm.shw.top/shared/CI_NPM_TOKEN，gop.shw.top/gop/CI_GO_TOKEN。仅原始Token由Gitea Secret提供，认证编码自动处理；只用Go标准库不强制Go Token。
