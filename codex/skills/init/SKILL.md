---
name: init
description: "Codex prompt workflow for init、/init. 初始化空项目的所选模式和当前流程，不生成历史门禁。 Use only when the user explicitly asks for this named workflow."
---

# init

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `init`、`/init` 或要求执行该工作流时按下方原文执行。

**参数**：[项目说明与模式]

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

仅空项目使用，已有实质代码/文档/流程转 `/update`。确认目标目录与选择issue-main、issue-dev或managed，不猜模式。读取 `shw-gitea-repo`、`shw-product-docs`、`shw-gitea-ci/references/project-template.md`；创建 `.shw/project.yaml` 与对应最小Agent规范。

轻量模式保留原生目录。managed只建立够用PRD/技术方案、Journal和适用部署声明，直接可体验实现，无独立原型。按 `shw-workspace` 保留可选提供者与所有权检查，不强制本地worktree工具。

开发阶段必须执行类型检查、适用 lint/静态检查及本次改动涉及的单元与单模块 API 快速测试；全量 E2E、VRT、全量 API 等长周期回归集中到 dev→main 集成。必要构建、部署正常执行，tag 不新增测试阶段；检查通过不能代替人工验收。

Kubernetes项目按环境reference写真实开发目标、产品Deployment前缀、域名、Fleet路径与镜像来源；不猜shwkj-dev/shyun-dev属于哪类资源。按需加载GitOps/小程序/图标reference与固定镜像。用户配置、凭据、集群登记和项目外文件不由初始化擅改。

报告建立内容、必要构建证据及尚未具备的外部前置，进入当前切片产品定义。

项目配置字段与提供者选择见 `shw-workspace/references/project-settings.md`；加载对应schema核对真实值，能力缺失且无已验证独占工作区时停止写入，不绕占用检查。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
