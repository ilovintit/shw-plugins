---
description: dev/test/生产部署协调与只读观测——核对 Fleet 同步、镜像、rollout、健康检查和回滚条件，不直接操作 Kubernetes。
argument-hint: <Version 或环境>
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-release-flow`、`shw-k8s-observer`、`shw-gitea-ci` 和 `shw-verify`。

## 部署模型

- Kubernetes/Fleet 声明位于各项目仓库 `deploy/`；不建设中央部署仓库。
- 两套 Rancher 的 Fleet 分别监控被授权的项目仓库、分支和路径，并把资源限制到目标 Namespace。
- 项目 Agent 不使用 Ansible、不持有 kubeconfig/Rancher Token、不直接写 Kubernetes。
- 集群信息只经统一多集群只读 MCP 获取；MCP 不可用时只给用户或基础设施 Agent 操作指引。

## 执行

1. 按 `shw-release-flow` 及其 references/environments.md 判定产品形态和环境：dev/test 核对对应分支 commit 与实际制品，不要求生产 tag；生产核对 Version、main 合并记录、tag 与实际制品对应。
   - 插件/库/CLI：验证分发仓库或包的内容/版本、安装升级和用户使用证据；记录 Harbor/Fleet 不适用及原因，完成分发验证后走第 5–6 步。
   - Kubernetes 应用：继续核对 Harbor 镜像与部署声明，再执行第 2–4 步。
2. 识别目标 Rancher、cluster context、Namespace、Fleet GitRepo/Bundle 与期望 revision。
3. 通过只读 MCP 查看 Fleet 同步、Deployment/StatefulSet、Pod、Events、镜像 digest、rollout 和应用健康信号。
4. 若 Fleet 尚未同步，持续观测合理窗口；需要 pause/unpause、rollback、修改资源或手工操作时，输出精确步骤交用户/基础设施 Agent，不自行执行。
5. 记录每个环境的期望版本、实际版本、时间、健康结果和异常证据。
6. 失败经 `/shw-bug` 回流；成功只表示部署与冒烟证据成立，不自动关闭 Version。

禁止把“镜像已推送”“Fleet 已拉取”或“Pod Running”单独当成部署成功。
