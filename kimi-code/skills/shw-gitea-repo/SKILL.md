---
name: shw-gitea-repo
description: Gitea 仓库工程规范。定义 dev/main/test 分支、Issue:分支:PR、PR Gate、受保护 workflow、项目内部署声明和 main 人工合并；init/update/work/release 使用。
---

# Gitea 仓库工程规范

## 分支

- `dev`：唯一开发主线，产品文档与日常交付 PR 的目标；Agent 可在 CI 全绿后合并。
- `main`：永久可发布线；只接受 dev→main 放行 PR或 Hotfix，永远由用户在 Web UI 合并。
- `test`：可选部署来源，不作为开发分支。
- feature/bug/chore 从最新 dev 创建；hotfix 从 main 创建并回灌 dev。

禁止直接 push 受保护分支、堆叠 PR、分支互 merge、force 绕门禁和多个 Issue 共用分支。

## PR Gate

- PR 到 dev/main 必跑 build/typecheck、lint、单元、集成/API、适用的 E2E/VRT和安全检查。
- 测试只在 CI 运行；本地只做构建/类型检查。
- workflow、部署 Action 和 secret 使用点属于高敏感代码，必须受保护审查；PR 事件不注入部署凭证。
- Actions 使用固定版本或 commit，不跟随浮动分支。

## 部署声明

- 每个项目在自己的 `deploy/` 维护 Helm/Kustomize/Fleet YAML；不使用中央部署仓库。
- Fleet 的 GitRepo 由基础设施侧登记并固定 target namespace、仓库、分支和路径。
- 项目仓库不保存 kubeconfig、Rancher Token 或集群写凭证。
- Agent 只经 `shw-k8s-observer` 读取集群；部署写入由 Fleet 完成。

## 初始化检查

确认 labels、dev/main、分支保护、合并后删分支、Actions、Harbor 构建、deploy 路径和敏感文件忽略规则。无管理权限时输出需用户完成的精确设置和验证方法。
