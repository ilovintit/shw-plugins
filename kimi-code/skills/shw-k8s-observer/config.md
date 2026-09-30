# 统一只读 Kubernetes MCP 客户端配置

**操作责任**：本文用户级配置、shell profile、插件安装目录和外部缓存的修改示例由用户或其安排的其他获授权 Agent 执行。当前项目 Agent 仅可读取并提供操作说明；需要外部修改时按 `shw-issue-gate` 停止并请用户介入。插件程序正常维护自身状态/后端缓存不授权 Agent 手改这些文件。

本文件是 `shw-k8s-observer` 的按需配置指南。它连接组织已部署的远程 Streamable HTTP MCP。Kimi Code 与 Codex 使用插件自带的 stdio 薄壳转接 HTTPS；Claude Code 保留直连。薄壳不提供 Kubernetes 服务、不监听本地端口。

## 通用约定

- MCP 条目名统一为 `kubernetes`；所有项目 Agent 都先使用该名称，再按服务端实际暴露的只读工具或参数确定可用 context。
- 地址使用基础设施侧提供的 HTTPS MCP URL（通常以 `/mcp` 结尾），不是健康检查 URL。
- 认证使用该 Agent 专属的 Bearer token；不得使用 kubeconfig、Rancher Token、ServiceAccount Token，也不得把 token 放进仓库、Issue、AGENTS.md、项目 `.mcp.json` 或插件目录。
- 配置只能放当前 Agent 的用户级配置或稳定的用户级密钥存放处。**禁止**引用 `plugins/cache/.../<version>/`、`dist/` 或任何插件安装绝对路径；升级插件后连接仍应保持有效。
- 令牌泄露、401/403 或 Agent 离职时，由基础设施侧吊销并重新签发该 Agent 的 MCP token；不要通过复制别人的 token 排障。

## Kimi Code

插件清单在 Kimi Code 中声明 `kubernetes` stdio 条目，走与 Codex 相同的薄壳转接，不声明 HTTP 条目。Kimi Code 的插件清单没有任何配置面板，也没有 `${VAR}` env 插值机制，因此地址与 token 不经清单传递——薄壳自行读取下面「Codex」一节描述的同一份用户级配置文件，先按该节完成一次配置即可。

清单不携带 `env` 块：Kimi Code 的清单 `env` 会直接覆盖父进程环境继承，写占位符会让它变成字面量并覆盖用户的真实环境变量。薄壳因此依赖父进程环境继承来解析 `HOME` / `XDG_CONFIG_HOME`。

**身份隔离的差异**：Codex 由清单显式转发 `SHW_K8S_PROFILE`，Kimi Code 没有等价机制，只能从启动 Kimi Code 的父进程环境继承。需要非默认身份时，必须让该变量存在于宿主的稳定启动环境中，而不是事后在别的终端里 export。无法确认继承生效时，按未配置处理。

### 未配置时的行为评估

未填写配置文件、或只填写 URL 与 token 之一，均视为 Kubernetes 未配置：不发起观测、不填假地址/token、不回退集群凭证。薄壳在缺文件、缺字段、权限不合法或 URL 不合法时明确失败，不伪造初始化成功，所以未配置是可观察的失败而不是静默降级。

Kimi Code 对不合法的 MCP 条目（例如 `cwd` 不以 `./` 开头或越出插件根）是**静默忽略**的，不会报错。因此验收必须逐条确认 `kubernetes` 条目实际在线，不能以清单存在推定连接可用。验收记录宿主版本、插件版本、配置文件状态与实际调用结果。

## Claude Code

插件会在 Claude Code 中直接声明远程 `kubernetes` MCP（HTTP 形态）。在插件配置中填入：

| 字段 | 填写内容 |
| --- | --- |
| `k8s_mcp_url` | 基础设施侧提供的 HTTPS MCP URL |
| `k8s_mcp_token` | 当前 Agent 的 MCP Bearer token（只填 token 本体） |

条目在运行时等价于 `Authorization: Bearer <token>`。地址和 token 都不编入插件发行物，也不依赖插件缓存路径。URL 与 token 未同时填写即视为未配置，处理方式与上一节相同。

## Codex

插件清单直接声明 `kubernetes` stdio 条目，并携带三平台二进制。安装此功能版本后无需再新增 `[mcp_servers.kubernetes]`。一次配置由用户或获授权维护者在稳定目录创建：

```dotenv
# ${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/kubernetes.env
K8S_MCP_URL=https://<your-kubernetes-mcp-host>/mcp
K8S_MCP_TOKEN=<your-agent-mcp-token>
```

文件权限必须为 `600`，目录建议 `700`，不得使用符号链接文件。只允许这两个字段、空行、整行 `#` 注释和可选成对单/双引号；不执行 `export`、变量展开、反引号或命令替换，不允许重复/未知字段。URL 必须为 HTTPS，不能含用户名、密码、query 或 fragment。只使用基础设施签发的 MCP Bearer 本体。

默认不需要终端 export，Desktop/CLI 都从用户目录读取。`XDG_CONFIG_HOME` 非空时必须为绝对路径。配置只在进程启动时读取，轮换后重启 MCP/宿主；升级不复制、改写或删除此文件。不会读取项目 `.env`、`.shw-plugins/` 或 `K8S_MCP_URL/TOKEN` 进程覆盖，地址和凭据不会跨来源拼接。

**身份隔离**：默认文件仅代表当前操作系统用户配置的一个审计身份。不同身份分别使用 `kubernetes.<profile>.env`，从宿主稳定启动环境传入 `SHW_K8S_PROFILE=<profile>`；profile 仅接受 1–64 位字母、数字、下划线、连字符，首位必须是字母/数字。缺 profile 文件即失败，不回退默认身份；不要复制其他身份 token。Desktop 需要维护者配置其稳定启动环境并完整重启，不能依赖后来打开终端的临时 export；需要同时运行多个身份时使用独立 OS 用户或独立 XDG 配置根。

**旧注册迁移**（维护者执行，项目 Agent 只读复核）：

1. 保留现有用户级配置的安全备份；把当前身份的 URL/token 写入上面的稳定文件并限制权限。不要把 token 发到对话或 Issue。
2. 安装包含本功能的插件版本。确认 `.mcp.json` 有 `kubernetes` 且引用随包 launcher；不得将 launcher 版本路径注册到用户配置。
3. 在 `/Users/<user>/.codex/config.toml`（或实际 `CODEX_HOME/config.toml`）移除旧 `[mcp_servers.kubernetes]` 及其子表；核对工作区 `.codex/config.toml` 等是否还有手工重复项。插件注册与旧注册没有可靠的自动覆盖优先级保证，不能靠同名碰运气。备份须留在用户受限目录，不提交仓库。
4. 完整重启 CLI 与 Desktop，分别确认仅有一套预期的 Kubernetes 工具来源；执行下面最小只读验证。记录宿主版本、插件版本、来源、调用结果及时间，脱敏。
5. 升级后再次核对仍读取同一配置并调用成功。回退旧插件时由维护者恢复旧用户级注册；不要让两条连接并存。

**诊断**：缺文件/字段、权限或 URL 不合法时进程明确失败，不伪造初始化成功。401/403 只报告状态码；远端正文、连接 URL 和凭据不作为诊断输出。所有重定向拒绝。单次请求至多 25 秒（低于宿主约 30 秒的工具调用预算），初始化 8 秒；断开/超时不自动重放工具调用。远端返回 404（会话过期、请求未执行）时，薄壳用原初始化参数内部重新握手并重试该请求一次，仍失败才要求重新连接初始化。宿主取消的请求不再回包。stdout 仅 MCP，stderr 是有时限的单条脱敏退出诊断。输入/单条响应上限 4 MiB、并发和输出队列各 32；重复请求 ID 或并发超限只拒绝该请求；宿主 5 秒内仍不消费输出时才结束会话，避免无限堆积。

协议支持 POST JSON/SSE、请求期间服务端通知/请求和宿主回复；不缓存工具及权限，不提供旧 HTTP+SSE transport 或自动重放恢复。只读授权继续由远端网关/RBAC提供，薄壳不是本地权限过滤器。

## 最小验证与排障

1. 重启或重新加载当前 Agent 工具，确认 MCP 条目 `kubernetes` 已连接。
2. 先查看服务实际公开的工具和参数，以其支持的只读方式确定目标 context 与 Namespace；无法确定 context 时停止，不回退到 `kubectl` 或本地 kubeconfig。
3. 确认工具面只提供只读查询、Events、rollout 状态和日志；若看到写、exec、attach 或 port-forward 能力，停止使用并报告基础设施侧。
4. `401` 表示缺少、错误或已吊销的 MCP token；`403` 表示入口或 Kubernetes RBAC 拒绝。两者都只向基础设施侧申请核对，不要扩大项目 Agent 权限。
