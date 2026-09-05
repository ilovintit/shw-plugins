---
description: 初始化空项目或新项目——建立产品文档、Git/Gitea、CI、分支和部署声明骨架，然后进入产品定义。
argument-hint: [项目说明]
---

把空目录或尚未形成实质产品内容的新项目初始化为当前生命周期工作流。执行前加载 `shw-gitea-flow`、`shw-gitea-repo`、`shw-product-docs`；涉及端口时再加载 `shw-port-manager`。

## 守卫

- 若已有实质代码、历史文档或既有 Git 流程，停止使用本命令并转 `/shw-update`。
- 不替用户决定产品范围、客户端入口、技术栈或部署环境。

## 执行

1. 确认产品名称、目标用户、预期入口（管理端、用户端、移动端等）、仓库归属、技术栈和预期环境。
2. 初始化 Git 与 Gitea 仓库，建立 `dev` 开发线和 `main` 发布线；main 只允许用户在 Web UI 合并。
3. 建立基础目录：
   - `docs/prd/`：产品级 PRD 真相；
   - `docs/design/`：原型索引及各端高保真原型；
   - `docs/architecture/`：整体架构入口及按端/服务/领域拆分文档；
   - `docs/journal/`：过程记录；
   - `deploy/`：项目自有的 Fleet/Kustomize/Helm 部署声明。
4. 写入带 `<!-- shw-workflow:lifecycle-v1 -->` 标记的项目 Agent 规范，明确 Issue、worktree、PR、CI、main 人工合并、Fleet 拉取部署和 Kubernetes 只读边界。
5. 建立 Gitea labels、分支保护和 PR Gate；部署凭证、Rancher Token、kubeconfig 不写入项目。
6. 做构建级验证，提交初始化 PR；不直接合并 main。
7. 初始化完成后指向 `/shw-product`，不自动创建首个功能 Issue 或 Version。

## 完成条件

目录、Agent 规范、Gitea 设施、CI 和分支模型均已取证；任何未完成项明确列出，不用空文件或 TODO 冒充产品定义完成。
