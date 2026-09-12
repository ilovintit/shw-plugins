---
name: shw-k8s-observer
description: 经统一多集群只读 Kubernetes MCP 观察 Rancher 管理的集群，用于 deploy、问题排查和生产验证；禁止项目 Agent 获取 kubeconfig/Token、调用 Ansible或执行任何 K8s 写操作。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# Kubernetes 只读观测

## 连接前置条件

- 统一入口的 MCP 条目名固定为 `kubernetes`。先确认该条目可用，并按服务端实际暴露的只读工具或参数确定 context；不得把 context 名、Namespace 或集群归属靠猜测补全。
- 条目没有注入、连接失败或没有可用 context 时，读取同目录 `config.md`，按当前 Agent 工具的**用户级配置**完成对应宿主配置与最小验证（Codex 插件薄壳读取稳定用户文件，其他宿主按指南直连）；不要临时修改插件安装目录、版本化缓存或项目文件。
- 该入口只能使用基础设施侧签发的 MCP Bearer token。不得索取、保存或替换为 kubeconfig、Rancher Token、ServiceAccount Token。

## 入口

只使用组织提供的统一多集群只读 MCP。先列出可用 context，再显式选择目标 Rancher/cluster、Namespace 和工作负载。MCP 不可用时停止调用，给用户或基础设施 Agent 精确检查指引；不得回退到本机 kubeconfig、Rancher Token 或 `kubectl`。

## 多 Rancher 与 Fleet 管理面

- Fleet 的 `GitRepo`、`Bundle`、`BundleDeployment` 等控制面资源位于各 Rancher 的 local/management 集群；业务工作负载位于下游集群。下游集群 kubeconfig 的 RBAC不能替代 Fleet 管理面权限。
- 基础设施侧为每套 Rancher 配置独立只读身份和管理集群 context，只授予目标 FleetWorkspace/Namespace 中必要 Fleet 资源的 `get/list/watch`；下游 context 另按业务 Namespace 最小授权。不得用无范围管理员 Token替代分层授权。
- 原始管理集群通常都名为 `local`。网关聚合配置必须把 cluster、user、context 一并改为可辨识的稳定名称，context 统一为 `<rancher>/<原 context>`，例如 `rancher-dev/local`；不得只改 context 而留下 cluster/user 重名覆盖。
- context 名与 Rancher归属由基础设施侧显式登记；Agent 不根据 URL、证书、原始 `local` 名或返回资源猜测归属。每次查询必须显式指定 context，不依赖合并文件的 `current-context`。
- 仓库 `tools/merge-kubeconfig/` 是基础设施维护者手动准备网关配置的离线工具，不授权项目 Agent读取、生成、合并、部署或持有真实 kubeconfig。Agent仍只使用 MCP Bearer。
- 当前公司内网网关部署明确要求聚合输出对全部 cluster 设置 `insecure-skip-tls-verify: true` 并移除 CA 字段。这会关闭服务端证书验证，只能在既有可信网络边界、独立最小权限身份、HTTPS入口与审计同时成立时使用；不得扩写为通用 Kubernetes 客户端默认。

## 允许能力

- list/get 工作负载、Pod、Service、Ingress 和允许的自定义资源；
- describe 等价详情；
- Events、rollout 状态、镜像与 digest；
- Pod 日志和已授权的指标。

## 永久禁止

- create、update、patch、delete；
- exec、attach、port-forward；
- Helm install/upgrade/rollback；
- 读取 Secret、ServiceAccount Token、RBAC 凭据；
- 修改 Fleet、Rancher 或 Kubernetes；
- 使用 Ansible；
- 请求、保存或输出 kubeconfig/Rancher Token。

## 排查顺序

1. 确认 context、Namespace、期望版本和时间窗口。
2. 查看 Fleet/Bundle 期望 revision 与同步状态。
3. 查看 Deployment/StatefulSet 条件、ReplicaSet/Pod 状态和镜像 digest。
4. 查看 Events，再按容器/时间范围读取日志；避免无边界拉取。
5. 对照健康检查、依赖和应用指标形成证据链。
6. 需要写操作时仅提出最小操作、风险、验证与回滚步骤，交有权限的人执行。

只读 MCP 本身仍需 Kubernetes RBAC、敏感资源拒绝、HTTPS、鉴权、审计和凭证轮换；不能只依赖 prompt 自律。
