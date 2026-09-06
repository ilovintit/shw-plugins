# 统一只读 Kubernetes MCP 客户端配置

**操作责任**：本文用户级配置、shell profile、插件安装目录和外部缓存的修改示例由用户或其安排的其他获授权 Agent 执行。当前项目 Agent 仅可读取并提供操作说明；需要外部修改时按 `shw-issue-gate` 停止并请用户介入。插件程序正常维护自身状态/后端缓存不授权 Agent 手改这些文件。

本文件是 `shw-k8s-observer` 的按需配置指南。它只注册组织已部署的远程 Streamable HTTP MCP，**不会**在插件中启动代理、转发器或 Kubernetes 服务。

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

在用户级 `~/.codex/config.toml` 添加或合并以下 TOML；不要把它写进插件的 `.mcp.json`，后者属于随版本更换的安装产物。

```toml
[mcp_servers.kubernetes]
url = "https://<your-kubernetes-mcp-host>/mcp"
bearer_token_env_var = "K8S_MCP_TOKEN"
```

将 `K8S_MCP_TOKEN` 放进启动 Codex Desktop/CLI 的稳定用户环境或受管密钥机制。CLI 可以从已加载上节 env 文件的 shell 启动；Desktop 不会继承某个后来打开终端中的临时 `export`，应在其启动环境配置后完全重启。不要在 TOML 内写明文 Bearer。

## 最小验证与排障

1. 重启或重新加载当前 Agent 工具，确认 MCP 条目 `kubernetes` 已连接。
2. 先查看服务实际公开的工具和参数，以其支持的只读方式确定目标 context 与 Namespace；无法确定 context 时停止，不回退到 `kubectl` 或本地 kubeconfig。
3. 确认工具面只提供只读查询、Events、rollout 状态和日志；若看到写、exec、attach 或 port-forward 能力，停止使用并报告基础设施侧。
4. `401` 表示缺少、错误或已吊销的 MCP token；`403` 表示入口或 Kubernetes RBAC 拒绝。两者都只向基础设施侧申请核对，不要扩大项目 Agent 权限。
