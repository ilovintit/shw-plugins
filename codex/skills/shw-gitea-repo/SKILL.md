---
name: shw-gitea-repo
description: Gitea 仓库工程规范。定义 dev/main/test 分支、Issue:分支:PR、PR Gate、受保护 workflow、项目内部署声明和 main 人工合并；init/update/work/release 使用。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# Gitea 仓库工程规范

## 分支

- `dev`：唯一开发主线，产品文档与日常交付 PR 的目标；Agent 可在 CI 全绿后合并。
- `main`：永久可发布线；只接受 dev→main 放行 PR或 Hotfix，永远由用户在 Web UI 合并。
- `test`：可选部署来源，不作为开发分支。
- feature/bug/chore 从最新 dev 创建；hotfix 从 main 创建并按 `shw-gitea-flow` 的同步记录回灌 dev。

禁止直接 push 受保护分支、堆叠交付 PR、feature 分支互 merge、force 绕门禁和多个 Issue 共用分支。

## PR Gate

- 测试策略统一由shw-test-spec定义：Issue→dev只跑改动相关模块/文件测试，禁止全测和未知映射时全量兜底；同仓库dev→main必须实际跑全量门禁，不复用定向或历史全量结果跳过。
- 其他PR方向（含Hotfix、main→dev同步）按实际改动选模块/文件；纯历史同步记录无适用测试，不为behind状态机械往返合并。
- 默认Gitea CI执行；开发中确有必要时经项目指定入口运行明确的小范围单测并记录，不替代CI。无选择器不能默认全跑。
- CI原样镜像缓存使用Harbor ci-cache，插件自建执行镜像使用library/shw-ci-*，不替换业务Dockerfile的builder/runtime基础镜像，GitHub Actions从Gitea actions组织镜像引用，npm/Go走公司缓存，普通job不静默公网回退或临时下载大工具链；详见shw-test-spec/references/ci-cache.md。
- 文档含义由内容审查与人工验收判断，不写固定关键词、句式或顺序断言；结构/安全与真实行为检查按适用范围保留。
- workflow、部署 Action 和 secret 使用点属于高敏感代码，必须受保护审查；PR 事件不注入部署凭证。
- Actions 使用固定版本或 commit，不跟随浮动分支。

## 部署声明

- Kubernetes 应用在自己的 `deploy/` 维护 Helm/Kustomize/Fleet YAML；不使用中央部署仓库。插件/库/CLI 按实际制品分发，记录镜像/Fleet 不适用依据。
- Fleet 的 GitRepo 由基础设施侧登记并固定 target namespace、仓库、分支和路径。
- 项目仓库不保存 kubeconfig、Rancher Token 或集群写凭证。
- Agent 只经 `shw-k8s-observer` 读取集群；部署写入由 Fleet 完成。

## 初始化检查

确认 labels、dev/main、分支保护、合并后删分支、Actions 和敏感文件忽略规则；按产品形态检查镜像/deploy/Fleet 或包分发/安装升级。无管理权限时输出需用户完成的精确设置和验证方法。

## 环境与公共配置

Kubernetes 应用执行 [环境契约](../shw-release-flow/references/environments.md)：dev push 驱动开发部署，PR 事件不发布；main/test/dev 分支不改名。初始化和升级同时加载 [CI 配置命名](../shw-test-spec/references/ci-config.md)，核对全部工作流与传递依赖的内部来源、凭据用途及迁移前置。
