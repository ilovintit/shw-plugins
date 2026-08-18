# Rancher 引导：生成 / 刷新项目本地 kubeconfig（块 B）

## 定位与触发

本文件是 shw-k8s-rancher 状态闸门的**块 B**，只在两种状态被加载：

- **未初始化**：项目根 `.rancher/kubeconfig` 不存在
- **token 过期**：块 A 的 kubectl 报 401 / Unauthorized（kubeconfig 内 token TTL 约 30 天，见下文「TTL 说明」）

目标：用**只读专用账号**的 API key 调 Rancher API，生成 kubeconfig 落盘到项目本地，让块 A 可用。**完成或刷新后回到 SKILL.md 块 A**。

## 铁律

```
1. 本流程只生成 / 刷新 kubeconfig，不做任何集群写操作
2. kubeconfig 内含 token：必须被项目 .gitignore 覆盖，绝不入库
3. CRD 形态的 .status.value 只在生成响应中返回一次——拿到立即落盘，不要只打印
4. 环境变量缺失时提示用户设置，不猜测值
```

## 参数：两个环境变量

| 变量 | 含义 | 形态 |
|---|---|---|
| `RANCHER_URL` | 公司 Rancher 服务地址，含协议、不带尾斜杠 | 如 `https://rancher.example.com` |
| `RANCHER_API_KEY` | **只读专用账号**的用户级 API key | Bearer token，具体形态以 Rancher 实际创建的 key 为准 |

两级配置：

| 级别 | 放哪 | 生效方式 |
|---|---|---|
| 全局（默认） | shell profile：`~/.zshrc` 里 `export RANCHER_URL=...` / `export RANCHER_API_KEY=...` | 新 shell 自动生效 |
| 项目特殊 | 项目 `.env` 或 direnv（`.envrc`） | direnv 需要 hook；`.env` 在使用前 `set -a; source .env; set +a` 加载（覆盖全局值） |

使用前检查：

```bash
echo "RANCHER_URL=${RANCHER_URL:-<未设置>}"
echo "RANCHER_API_KEY=${RANCHER_API_KEY:+<已设置>}"
```

任一未设置：提示用户按上表配置（全局放 shell profile，项目特殊放 `.env` / direnv），配好后再继续，**不猜测值**。

## 引导流程

### 第 1 步：列集群（确认目标）

```bash
curl -s "$RANCHER_URL/v3/clusters" \
  -H "Authorization: Bearer $RANCHER_API_KEY" \
  | jq -r '.data[] | "\(.id)\t\(.name)\t\(.state)"'
```

- 取 `id` 与 `name` 给用户确认目标集群；`.state`（就绪状态）辅助判断，字段以实际响应为准
- 若 `.data` 路径取不到内容，先看实际响应结构再取（`jq 'keys'` 或直接看 JSON），以实际响应为准
- 有多集群授权时优先一次生成全部（见「多集群」节）

### 第 2 步：生成 kubeconfig（两种端点形态，按公司 Rancher 实际版本二选一）

> **使用前现场核实**：Rancher v2.13+ 用形态一（Kubeconfig CRD）；旧版用形态二（generateKubeconfig action）。不确定公司版本时先用形态一，返回 404 / 不识别再降形态二，或问管理员确认。

#### 形态一：Rancher v2.13+ Kubeconfig CRD（支持一次多集群）

端点 `POST $RANCHER_URL/apis/ext.cattle.io/v1/kubeconfigs`，body 参数：

| 字段 | 说明 |
|---|---|
| `spec.clusters` | 集群 id 数组；`["*"]` = 全部授权集群（多集群推荐）；或指定单集群如 `["c-m-xxxxx"]` |
| `spec.ttl` | token 有效期，**单位秒**（示例 `2592000` = 30 天）；实际生效受 Rancher 全局设置封顶，见「TTL 说明」 |

响应中的 kubeconfig 在 `.status.value` 字段，**只在这次响应里返回一次**（之后再查不会再给），立即提取落盘：

```bash
mkdir -p .rancher
curl -s -X POST "$RANCHER_URL/apis/ext.cattle.io/v1/kubeconfigs" \
  -H "Authorization: Bearer $RANCHER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"spec":{"clusters":["*"],"ttl":2592000}}' \
  | jq -r '.status.value' > .rancher/kubeconfig
chmod 600 .rancher/kubeconfig
```

#### 形态二：旧版 generateKubeconfig action（per-cluster，一次一个集群）

端点 `POST $RANCHER_URL/v3/clusters/<cluster-id>?action=generateKubeconfig`，响应中的 kubeconfig 在 `.config` 字段：

```bash
mkdir -p .rancher
curl -s -X POST "$RANCHER_URL/v3/clusters/<cluster-id>?action=generateKubeconfig" \
  -H "Authorization: Bearer $RANCHER_API_KEY" \
  | jq -r '.config' > .rancher/kubeconfig
chmod 600 .rancher/kubeconfig
```

- `<cluster-id>` 用第 1 步列出的目标集群 id
- 该形态单次只含一个集群（多集群场景见下节）

落盘后立即检查文件有效（非空、YAML 头正常）：

```bash
head -3 .rancher/kubeconfig   # 应看到 apiVersion: v1 / kind: Config 开头的 kubeconfig
```

### 第 3 步：.gitignore 检查（防 token / API key 入库，必执行）

```bash
# 1. 确认项目 .gitignore 覆盖 .rancher/
grep -n "^\.rancher/" .gitignore

# 2. 确认项目 .gitignore 覆盖 .env（RANCHER_API_KEY 可能写在项目 .env 里）
grep -n "^\.env$" .gitignore

# 3. 缺哪条补哪条（.gitignore 文件不存在时先创建）
echo ".rancher/" >> .gitignore
echo ".env" >> .gitignore

# 4. 验证：kubeconfig 与 .env 不得出现在未跟踪列表
git status --short
```

第 3 步验证若 `.rancher/kubeconfig` 或 `.env` 出现在 `??` 未跟踪条目里：说明 ignore 未生效（检查写入行拼写、检查全局 / 上级目录 gitignore），修好再继续。**kubeconfig 入库 = token 泄漏，`.env` 入库 = API key 泄漏，本步不可跳过。**（若用了项目级 `.env` 存放 `RANCHER_API_KEY`，`.gitignore` 必须先覆盖 `.env` 再继续，防止 API key 随源码提交入库。）

### 第 4 步：验证可用，回到块 A

```bash
# 认证探测
kubectl --kubeconfig .rancher/kubeconfig --request-timeout=10s cluster-info

# 查看生成的 context（多集群时应有多个）
kubectl --kubeconfig .rancher/kubeconfig config get-contexts
```

正常返回集群信息 → 引导完成，**回到 SKILL.md 块 A** 开始只读排查。

## TTL 说明（约 30 天，不可永久）

- kubeconfig 内 token 默认有效期约 30 天（形态一 `ttl` 传秒；实际生效受 Rancher 全局设置 `kubeconfig-default-token-ttl-minutes` 封顶——请求值超过封顶会被压到封顶值，**不能设成永久**）
- 过期表现：块 A 的 kubectl 命令报 `Unauthorized` / 401 / `You must be logged in to the server`
- 过期处理（回边）：**重新执行本文件流程**——第 2 步重新生成覆盖 `.rancher/kubeconfig` → 第 3 步快速确认 ignore 仍生效 → 第 4 步验证 → 回 SKILL.md 块 A。这不是报错放弃的理由，也**不需要用户重新配置 API key**（API key 本身不受该 TTL 影响，其有效期以 Rancher 侧账号 / key 设置为准）

## 多集群

- 形态一支持一次生成全部授权集群：`"clusters": ["*"]`，kubeconfig 内含多个 context（与集群对应），块 A 里用 `kubectl --kubeconfig .rancher/kubeconfig --context <context名>` 切换
- 只需要部分集群时也可列出明确 id：`"clusters": ["c-m-aaa", "c-m-bbb"]`
- 新增接管的集群（账号后来才拿到授权的）不在已生成的 kubeconfig 里——需要重新执行本文件流程生成一次
- 形态二是 per-cluster：排查另一个集群时，对目标 `<cluster-id>` 重新生成（覆盖 `.rancher/kubeconfig`）

## 常见失败

| 现象 | 处理 |
|---|---|
| curl 返回 401 | API key 错误 / 过期——提示用户到 Rancher UI 检查只读账号的 API key，重新生成后更新环境变量 |
| 形态一返回 404 / not found | 公司 Rancher 是旧版——改用形态二 |
| `jq` 取不到字段 | 去掉 jq 管道看原始 JSON 结构（或 `jq 'keys'`），以实际响应为准 |
| `cluster-info` 连不通 | 检查 `RANCHER_URL` 网络可达（VPN / 内网）、kubeconfig 中 server 地址是否可解析 |
