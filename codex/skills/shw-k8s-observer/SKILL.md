---
name: shw-k8s-observer
description: 经统一多集群只读 Kubernetes MCP 观察 Rancher 管理的集群，用于 deploy、问题排查和生产验证；禁止项目 Agent 获取 kubeconfig/Token、调用 Ansible或执行任何 K8s 写操作。
---

# Kubernetes 只读观测

## 连接前置条件

- 统一入口的 MCP 条目名固定为 `kubernetes`。先确认该条目可用，并按服务端实际暴露的只读工具或参数确定 context；不得把 context 名、Namespace 或集群归属靠猜测补全。
- 条目没有注入、连接失败或没有可用 context 时，读取同目录 `config.md`，按当前 Agent 工具的**用户级配置**完成直连 HTTP 注册与最小验证；不要临时修改插件安装目录、版本化缓存或项目文件。
- 该入口只能使用基础设施侧签发的 MCP Bearer token。不得索取、保存或替换为 kubeconfig、Rancher Token、ServiceAccount Token。

## 入口

只使用组织提供的统一多集群只读 MCP。先列出可用 context，再显式选择目标 Rancher/cluster、Namespace 和工作负载。MCP 不可用时停止调用，给用户或基础设施 Agent 精确检查指引；不得回退到本机 kubeconfig、Rancher Token 或 `kubectl`。

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
