---
description: 初始化空项目的所选模式和当前流程，不生成历史门禁。
argument-hint: [项目说明与模式]
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

仅空项目使用，已有实质代码/文档/流程转 `/shw-update`。确认目标目录与选择issue-main、issue-dev或managed，不猜模式。读取 `shw-gitea-repo`、`shw-product-docs`、`shw-gitea-ci/references/project-template.md`；创建 `.shw/project.yaml` 与对应最小Agent规范。

轻量模式保留原生目录。managed只建立够用PRD/技术方案、Journal和适用部署声明，直接可体验实现，无独立原型。按 `shw-workspace` 保留可选提供者与所有权检查，不强制本地worktree工具。

测试与开发、集成、发布、部署解耦：单元、API、E2E、VRT、回归及冒烟均仅在用户明确要求后，于独立 `test` 分支的固定提交执行。普通 push/PR/tag/部署和推送 test 分支本身不触发测试；未测试不阻挡已授权发布。必要构建/编译、静态与配置检查、来源核对正常执行，不得借“检查”名义运行测试；构建成功不代表测试或人工验收通过。

Kubernetes项目按环境reference写真实开发目标、产品Deployment前缀、域名、Fleet路径与镜像来源；不猜shwkj-dev/shyun-dev属于哪类资源。按需加载GitOps/小程序/图标reference与固定镜像。用户配置、凭据、集群登记和项目外文件不由初始化擅改。

报告建立内容、必要构建证据及尚未具备的外部前置，进入当前切片产品定义。

项目配置字段与提供者选择见 `shw-workspace/references/project-settings.md`；加载对应schema核对真实值，能力缺失且无已验证独占工作区时停止写入，不绕占用检查。
