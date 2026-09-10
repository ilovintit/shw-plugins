# 统一只读 Kubernetes MCP 客户端配置

**操作责任**：本文用户级配置、shell profile、插件安装目录和外部缓存的修改示例由用户或其安排的其他获授权 Agent 执行。当前项目 Agent 仅可读取并提供操作说明；需要外部修改时按 `shw-issue-gate` 停止并请用户介入。插件程序正常维护自身状态/后端缓存不授权 Agent 手改这些文件。

本文件是 `shw-k8s-observer` 的按需配置指南。它连接组织已部署的远程 Streamable HTTP MCP。Codex 使用插件自带的 stdio 薄壳转接 HTTPS；ZCode/OpenCode 保留直连，Kimi Code 保留用户级远程注册。薄壳不提供 Kubernetes 服务、不监听本地端口。

## 通用约定

- MCP 条目名统一为 `kubernetes`；所有项目 Agent 都先使用该名称，再按服务端实际暴露的只读工具或参数确定可用 context。
- 地址使用基础设施侧提供的 HTTPS MCP URL（通常以 `/mcp` 结尾），不是健康检查 URL。
- 认证使用该 Agent 专属的 Bearer token；不得使用 kubeconfig、Rancher Token、ServiceAccount Token，也不得把 token 放进仓库、Issue、AGENTS.md、项目 `.mcp.json` 或插件目录。
- 配置只能放当前 Agent 的用户级配置或稳定的用户级密钥存放处。**禁止**引用 `plugins/cache/.../<version>/`、`dist/` 或任何插件安装绝对路径；升级插件后连接仍应保持有效。
- 令牌泄露、401/403 或 Agent 离职时，由基础设施侧吊销并重新签发该 Agent 的 MCP token；不要通过复制别人的 token 排障。

## ZCode

插件会在 ZCode 中直接声明远程 `kubernetes` MCP。打开 **Settings → Plugin Management → shw-plugins → 插件配置**，填入：

| 字段 | 填写内容 |
| --- | --- |
| `k8s_mcp_url` | 基础设施侧提供的 HTTPS MCP URL |
| `k8s_mcp_token` | 当前 Agent 的 MCP Bearer token（只填 token 本体） |

条目在运行时等价于 `Authorization: Bearer <token>`。地址和 token 都不编入插件发行物，也不依赖插件缓存路径。

### 未配置时的行为评估

当前 ZCode 清单在 URL/token 留空时仍声明 HTTP 条目；配置字段非必填只表示可以保存空值，不能证明宿主会自动跳过连接，也不证明 Gitea/Worktree 一定不受宿主连接错误影响。未填写或只填写一项均视为 Kubernetes 未配置，不发起观测、不填假地址/token、不回退集群凭证。

本插件没有加入未经证实的“空值条件启用”表达式或改变已配置用户的默认连接。用户按当前 ZCode 的 MCP 管理能力处理未配置条目，确认普通技能和 Gitea/Worktree 可用；需要宿主级配置修改时由用户操作。验收分别记录空配置、仅 URL、仅 token、完整有效配置四种情况及宿主版本；此评估不声称这四种宿主运行情况已经实测。字段依据 [ZCode 官方开发教程](https://github.com/zai-org/zcode-plugins/blob/main/docs/PLUGIN_DEVELOPMENT_CN.md)，其可选字段与静态 enabled 示例不足以证明动态空值跳过语义。

## Kimi Code

在用户级 `~/.kimi-code/mcp.json` 的 `mcpServers` 内合并下列条目；不要覆盖已有服务器。此文件保存真实 token 时应限制为仅当前用户可读（例如 `chmod 600 ~/.kimi-code/mcp.json`）。

```json
{
  "mcpServers": {
    "kubernetes": {
      "type": "http",
      "url": "https://<your-kubernetes-mcp-host>/mcp",
      "headers": {
        "Authorization": "Bearer <your-agent-mcp-token>"
      }
    }
  }
}
```

Kimi Code 的插件清单不会内置这个远程条目：它没有安全的插件设置插值，写入占位符会把字面量或旧值带进安装产物。用户级配置不引用插件目录，因此更新插件不会破坏它。

## OpenCode

构建产物的 `opencode.json` 已提供远程 `kubernetes` 条目。仅将其中 `kubernetes` 条目合并到你的用户配置（Gitea 本地启动器须按安装说明单独使用稳定绝对路径），并在启动 OpenCode 前提供下列环境变量：

```dotenv
# ~/.config/shw-plugins/kubernetes-mcp.env（仅当前用户可读，不提交）
K8S_MCP_URL=https://<your-kubernetes-mcp-host>/mcp
K8S_MCP_TOKEN=<your-agent-mcp-token>
```

从 shell 启动时可先加载该文件：

```sh
set -a
. "$HOME/.config/shw-plugins/kubernetes-mcp.env"
set +a
opencode
```

生成的 OpenCode 条目会把这两个变量分别解析为远程 URL 和 `Authorization` 请求头；没有变量时应视为未配置，而不是改写为明文 token。

## Codex

插件清单直接声明 `kubernetes` stdio 条目，并携带三平台二进制。安装此功能版本后无需再新增 `[mcp_servers.kubernetes]`。一次配置由用户或获授权维护者在稳定目录创建：

```dotenv
# ${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/kubernetes.env
K8S_MCP_URL=https://<your-kubernetes-mcp-host>/mcp
K8S_MCP_TOKEN=<your-agent-mcp-token>
```

文件权限必须为 `600`，目录建议 `700`，不得使用符号链接文件。只允许这两个字段、空行、整行 `#` 注释和可选成对单/双引号；不执行 `export`、变量展开、反引号或命令替换，不允许重复/未知字段。URL 必须为 HTTPS，不能含用户名、密码、query 或 fragment。只使用基础设施签发的 MCP Bearer 本体。

默认不需要终端 export，Desktop/CLI 都从用户目录读取。`XDG_CONFIG_HOME` 非空时必须为绝对路径。配置只在进程启动时读取，轮换后重启 MCP/宿主；升级不复制、改写或删除此文件。不会读取项目 `.env`、`.shw-plugins/`、`K8S_MCP_URL/TOKEN` 进程覆盖或旧 OpenCode 的 `kubernetes-mcp.env`，地址和凭据不会跨来源拼接。

**身份隔离**：默认文件仅代表当前操作系统用户配置的一个审计身份。不同身份分别使用 `kubernetes.<profile>.env`，从宿主稳定启动环境传入 `SHW_K8S_PROFILE=<profile>`；profile 仅接受 1–64 位字母、数字、下划线、连字符，首位必须是字母/数字。缺 profile 文件即失败，不回退默认身份；不要复制其他身份 token。Desktop 需要维护者配置其稳定启动环境并完整重启，不能依赖后来打开终端的临时 export；需要同时运行多个身份时使用独立 OS 用户或独立 XDG 配置根。

**旧注册迁移**（维护者执行，项目 Agent 只读复核）：

1. 保留现有用户级配置的安全备份；把当前身份的 URL/token 写入上面的稳定文件并限制权限。不要把 token 发到对话或 Issue。
2. 安装包含本功能的插件版本。确认 `.mcp.json` 有 `kubernetes` 且引用随包 launcher；不得将 launcher 版本路径注册到用户配置。
3. 在 `/Users/<user>/.codex/config.toml`（或实际 `CODEX_HOME/config.toml`）移除旧 `[mcp_servers.kubernetes]` 及其子表；核对工作区 `.codex/config.toml` 等是否还有手工重复项。插件注册与旧注册没有可靠的自动覆盖优先级保证，不能靠同名碰运气。备份须留在用户受限目录，不提交仓库。
4. 完整重启 CLI 与 Desktop，分别确认仅有一套预期的 Kubernetes 工具来源；执行下面最小只读验证。记录宿主版本、插件版本、来源、调用结果及时间，脱敏。
5. 升级后再次核对仍读取同一配置并调用成功。回退旧插件时由维护者恢复旧用户级注册；不要让两条连接并存。

**诊断**：缺文件/字段、权限或 URL 不合法时进程明确失败，不伪造初始化成功。401/403 只报告状态码；远端正文、连接 URL 和凭据不作为诊断输出。所有重定向拒绝。单次请求至多 55 秒，初始化 8 秒；断开/超时不自动重放工具调用，会话过期要求重新连接初始化。stdout 仅 MCP，stderr 是有时限的单条脱敏退出诊断。输入/单条响应上限 4 MiB、并发和输出队列各 32；宿主不消费输出时结束会话，避免无限堆积。

协议支持 POST JSON/SSE、请求期间服务端通知/请求和宿主回复；不缓存工具及权限，不提供旧 HTTP+SSE transport 或自动重放恢复。只读授权继续由远端网关/RBAC提供，薄壳不是本地权限过滤器。

## 最小验证与排障

1. 重启或重新加载当前 Agent 工具，确认 MCP 条目 `kubernetes` 已连接。
2. 先查看服务实际公开的工具和参数，以其支持的只读方式确定目标 context 与 Namespace；无法确定 context 时停止，不回退到 `kubectl` 或本地 kubeconfig。
3. 确认工具面只提供只读查询、Events、rollout 状态和日志；若看到写、exec、attach 或 port-forward 能力，停止使用并报告基础设施侧。
4. `401` 表示缺少、错误或已吊销的 MCP token；`403` 表示入口或 Kubernetes RBAC 拒绝。两者都只向基础设施侧申请核对，不要扩大项目 Agent 权限。
