# Fleet 与多 Rancher context

仅调查 Fleet 管理面或排查 context 映射时读取；项目 Agent 不修改网关配置，不获取集群凭据。以下基础设施部署背景不扩大操作权限。

## 多 Rancher 与 Fleet 管理面

- Fleet 的 `GitRepo`、`Bundle`、`BundleDeployment` 等控制面资源位于各 Rancher 的 local/management 集群；业务工作负载位于下游集群。下游集群 kubeconfig 的 RBAC不能替代 Fleet 管理面权限。
- 基础设施侧为每套 Rancher 配置独立只读身份和管理集群 context，只授予目标 FleetWorkspace/Namespace 中必要 Fleet 资源的 `get/list/watch`；下游 context 另按业务 Namespace 最小授权。不得用无范围管理员 Token替代分层授权。
- 原始管理集群通常都名为 `local`。网关聚合配置必须把 cluster、user、context 一并改为可辨识的稳定名称，context 统一为 `<rancher>/<原 context>`，例如 `rancher-dev/local`；不得只改 context 而留下 cluster/user 重名覆盖。
- context 名与 Rancher归属由基础设施侧显式登记；Agent 不根据 URL、证书、原始 `local` 名或返回资源猜测归属。每次查询必须显式指定 context，不依赖合并文件的 `current-context`。
- 仓库 `tools/merge-kubeconfig/` 是基础设施维护者手动准备网关配置的离线工具，不授权项目 Agent读取、生成、合并、部署或持有真实 kubeconfig。Agent仍只使用 MCP Bearer。
- 当前公司内网网关部署明确要求聚合输出对全部 cluster 设置 `insecure-skip-tls-verify: true` 并移除 CA 字段。这会关闭服务端证书验证，只能在既有可信网络边界、独立最小权限身份、HTTPS入口与审计同时成立时使用；不得扩写为通用 Kubernetes 客户端默认。

