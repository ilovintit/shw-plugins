---
name: shw-k8s-rancher
description: 经 Rancher 只读访问公司 K8s 集群做问题排查（kubectl 只读白名单：get/describe/logs/events/top）。用户要排查 K8s 问题、查 Pod 状态/日志/事件、看资源水位（CPU/内存）、问服务为什么异常/5xx/超时/反复重启时加载。写操作（扩容/改配置/重启等）不由 agent 执行，输出 Rancher UI 操作指引由用户手动完成。
---

# K8s 只读排查（经 Rancher）

## 0. 状态闸门（第一节必执行：先判定走哪块，再往下）

本 skill 是一个生命周期状态机，分两块：

- **块 A**（本文件下方）：kubeconfig 可用时的 kubectl 只读排查手册（常态）
- **块 B**（子文件 rancher-setup.md）：未初始化 / token 过期时的 Rancher API 引导

**加载本 skill 后第一件事就是执行本节判定**——不许跳过、不许凭记忆假设"项目应该已初始化"：

```bash
# 判定 1：项目本地 kubeconfig 是否存在（路径相对项目根）
test -f .rancher/kubeconfig && echo "kubeconfig 存在" || echo "kubeconfig 不存在"

# 判定 2：文件存在时，探测认证是否有效（--request-timeout 防挂死）
kubectl --kubeconfig .rancher/kubeconfig --request-timeout=10s cluster-info
```

| 判定结果 | 动作 |
|---|---|
| kubeconfig 存在，且 `cluster-info` 正常返回集群信息 | 走**块 A**（下一节的只读排查手册） |
| kubeconfig 不存在（未初始化） | 走**块 B**：读同目录 rancher-setup.md 执行引导，完成后回块 A |
| `cluster-info` 报 `Unauthorized` / 401 / `You must be logged in to the server`（token 过期，TTL 约 30 天） | 走**块 B**：读同目录 rancher-setup.md 重新生成 kubeconfig（过期回边），完成后回块 A |

块 B 加载方式：读同目录的 @rancher-setup.md，按其流程执行，结束后回到本文件块 A。

生命周期状态机：

```
未初始化 ──执行 rancher-setup.md──→ 已初始化（块 A：kubectl 只读排查）
                ↑                          │
                └──── token 过期（回边）────┘
```

## 1. 块 A：kubectl 只读排查手册

### 1.1 命令约定

- 所有 kubectl 命令固定带 `--kubeconfig .rancher/kubeconfig`（项目本地路径，相对项目根）
- 多集群 kubeconfig 用 `--context <context名>` 切换目标集群；可用 `kubectl --kubeconfig .rancher/kubeconfig config get-contexts` 列出全部 context
- namespace 用 `-n <ns>` 限定；集群与 namespace 的取值见「注意事项」第 1 条

### 1.2 只读白名单 vs 禁止命令

**白名单（只允许这些）**：

| 白名单命令 | 用途 |
|---|---|
| `kubectl get ...` | 列资源状态：pods / deployments / svc / endpoints / pvc / ingress / events 等 |
| `kubectl describe ...` | 资源详情（含 Events 段，排查主力） |
| `kubectl logs ...` | 容器日志（`--previous` 看上次崩溃前日志、`--tail=N` 截尾、`-c` 指定容器） |
| `kubectl events ...` | 事件时间线（或 `kubectl get events --sort-by=.lastTimestamp`） |
| `kubectl top pods / nodes` | 实时 CPU / 内存用量 |
| 等价只读探测：`cluster-info` / `version` / `config get-contexts` / `config view` | 连通性、版本、上下文查看 |

**禁止的写面命令（一律不执行，任何理由都不执行）**：

| 禁止动词 | 类别 |
|---|---|
| `apply` / `create` / `replace` / `edit` / `patch` / `set` / `label` / `annotate` | 改资源配置 |
| `delete` | 删资源 |
| `scale` / `autoscale` | 改副本数 |
| `rollout`（restart / undo / pause / resume） | 发布面操作（含"重启"） |
| `exec` / `attach` / `cp` / `port-forward` | 进容器 / 建隧道 |

用户说"帮我重启 / 扩容 / 删掉重建"时：**不执行任何写命令**，走 1.7 节输出 Rancher UI 操作指引。

### 1.3 场景 1：Pod 反复重启 / 崩溃（CrashLoopBackOff）

```bash
# 1. 看 Pod 状态与重启次数
kubectl --kubeconfig .rancher/kubeconfig -n <ns> get pods
#    关注：STATUS=CrashLoopBackOff、RESTARTS 次数、AGE

# 2. 看详情与事件（崩溃原因通常在 describe 的 Events 段）
kubectl --kubeconfig .rancher/kubeconfig -n <ns> describe pod <pod-name>
#    关注：Last State 的 Exit Code / Reason（OOMKilled、Error）、Events 里的探针失败 / 镜像拉取失败

# 3. 看上次崩溃前的日志
kubectl --kubeconfig .rancher/kubeconfig -n <ns> logs <pod-name> --previous --tail=100

# 4. 看当前日志（容器能短暂起来时）
kubectl --kubeconfig .rancher/kubeconfig -n <ns> logs <pod-name> --tail=100
```

常见结论对照：

- `OOMKilled` → 内存 limit 不足（联动场景 3 看水位；需要调 limit 时走 1.7）
- 日志里有启动报错后退出 → 应用自身错误（代码 / 配置 / 依赖连不上）
- `ImagePullBackOff` → 镜像地址或拉取凭证问题（描述见 Events）

### 1.4 场景 2：服务 5xx / 超时

```bash
# 1. 后端 Pod 是否就绪（READY 列）
kubectl --kubeconfig .rancher/kubeconfig -n <ns> get pods -l <selector>
#    （不知道 selector 时先 describe svc 看它的 Selector）

# 2. Service 的 Endpoints 是否挂上后端
kubectl --kubeconfig .rancher/kubeconfig -n <ns> get endpoints <svc-name>
kubectl --kubeconfig .rancher/kubeconfig -n <ns> describe svc <svc-name>
#    Endpoints 为 <none> → 后端 Pod 未就绪，或 selector / 端口不匹配

# 3. 应用日志找 5xx / 超时堆栈
kubectl --kubeconfig .rancher/kubeconfig -n <ns> logs <pod-name> --tail=200

# 4. 事件佐证（重启 / 探针失败 / 驱逐）
kubectl --kubeconfig .rancher/kubeconfig -n <ns> get events --sort-by=.lastTimestamp
```

排查顺序：就绪状态 → Endpoints 挂载 → 日志 → 事件。5xx 常见根因是后端 Pod 未就绪（探针失败）导致 Endpoints 空、或应用内部报错（日志可见）。

### 1.5 场景 3：资源水位（怀疑资源不足）

```bash
# 1. 节点水位
kubectl --kubeconfig .rancher/kubeconfig top nodes

# 2. Pod 级用量（定位吃资源的 Pod；--containers 下钻到容器级）
kubectl --kubeconfig .rancher/kubeconfig -n <ns> top pods --containers

# 3. 节点分配率（requests / limits 占比，判断是否超卖 / 调度紧张）
kubectl --kubeconfig .rancher/kubeconfig describe node <node-name>
#    关注：Allocated resources 段（CPU / Memory 的 requests 与 limits 百分比）
```

结论模式：Pod 用量贴近 limit 且有 OOMKilled 历史 → 内存不足需调 limit（走 1.7）；节点 requests 占比过高 → 调度紧张；`top` 实际用量与 `describe` 分配额对照，区分"实际吃满"和"预留占满"。

### 1.6 场景 4：PVC / Ingress 排查

PVC 挂不上（Pending）：

```bash
kubectl --kubeconfig .rancher/kubeconfig -n <ns> get pvc
kubectl --kubeconfig .rancher/kubeconfig -n <ns> describe pvc <pvc-name>
# 看 Events：存储容量不足 / StorageClass 不存在 / 等待绑定
# （volumeBindingMode=WaitForFirstConsumer 时，需要有 Pod 使用它才触发动态创建）
```

Ingress 404 / 路由不通：

```bash
kubectl --kubeconfig .rancher/kubeconfig -n <ns> get ingress
kubectl --kubeconfig .rancher/kubeconfig -n <ns> describe ingress <ingress-name>
#    核对：每条路由的 backend service 名与端口、TLS 配置
kubectl --kubeconfig .rancher/kubeconfig -n <ns> get endpoints <svc-name>
#    再看后端 service 是否有就绪端点（同场景 2）
```

### 1.7 写操作纪律：排查结论需要变更时

排查结论需要变更（扩容副本 / 调资源 limit / 改环境变量 / 重启发布等）时，agent 的输出 = **变更建议 + Rancher UI 操作指引**，由用户在 Rancher UI 手动执行。**agent 绝不执行写命令。**

指引必须包含三要素：

1. **目标定位**：集群名、namespace（或 Rancher 项目名）、工作负载（Deployment 等）名称——从排查上下文已知，不带猜测
2. **建议动作与理由**：改什么、为什么（附排查证据，如 OOMKilled 次数、top 数据）
3. **UI 路径**：到目标位置的点击路径

常见变更对应的 UI 路径（菜单措辞随 Rancher 版本可能有差异，以实际界面为准）：

| 变更 | Rancher UI 路径 |
|---|---|
| 扩缩容副本 | 顶部集群切换到目标集群 → Workloads（工作负载）→ 目标工作负载 → 右上「⋮」菜单 → Scale / 缩放 |
| 改资源限制 / 环境变量 | 同上入口 → Edit / 编辑配置 → 调整后 Save（保存会触发重新发布） |
| 重启 / 重新发布 | 同上入口 → 右上「⋮」菜单 → Redeploy / Restart |

输出示例：

```
## 变更建议（需你在 Rancher UI 手动执行）

目标：集群 <cluster> / namespace <ns> / 工作负载 <deploy-name>
问题：Pod 持续 OOMKilled（RESTARTS 12 次），内存 limit 256Mi，top pods 实测峰值约 480Mi
建议：内存 limit 调整为 768Mi
UI 路径：Rancher → 切到集群 <cluster> → Workloads → <ns> → <deploy-name>
         → 右上「⋮」→ Edit → 资源限制 Memory 改 768Mi → Save
```

### 1.8 三层只读模型

只读保障是三层纵深，本 skill 明示如下：

| 层 | 机制 | 约束性质 |
|---|---|---|
| ① Rancher 只读账号 RBAC | 用户已建 Rancher **只读专用账号**，agent 用的 API key 与生成的 kubeconfig token 都继承该账号权限——即使误发写命令，也会被服务端 RBAC 拒绝 | 硬约束（服务端兜底） |
| ② 本 skill 只读白名单 | 1.2 节白名单 + 禁止表，agent 自律遵守 | 软约束（纪律） |
| ③ 写操作移交 UI | 需要变更时输出建议 + Rancher UI 指引，由用户手动执行 | 流程约束（人机分工） |

三层叠加的含义：②失守（agent 误发写命令）会被①拦下；③保证变更决策权始终在用户手里。**①是兜底不是试探的理由**——不要因为"反正会被拒"就去尝试写命令。

## 注意事项

1. **集群 / namespace 不硬编码**：从项目 AGENTS.md 的部署说明或问用户确认；多集群时先 `kubectl --kubeconfig .rancher/kubeconfig config get-contexts` 列出可用 context 再确认用哪个
2. **token 约 30 天过期**：认证失败（401 / Unauthorized）不是错误终态——按状态闸门回 rancher-setup.md 刷新 kubeconfig，不要报错放弃，也不需要用户重新配置 API key
3. **拿不准就 describe**：任何资源状态异常，先 describe 看 Events 段，事件是排查的第一证据源
4. **日志很长只看尾部**：`--tail=100` 起步，信息不够再加大
5. **用户要求写操作**：直接走 1.7 输出 UI 指引，不执行、不试探
