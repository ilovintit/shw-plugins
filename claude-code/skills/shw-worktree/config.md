# Worktree MCP 用户级配置

**操作责任**：本文用户级配置、shell profile、插件安装目录和外部缓存的修改示例由用户或其安排的其他获授权 Agent 执行。当前项目 Agent 仅可读取并提供操作说明；需要外部修改时按 `shw-issue-gate` 停止并请用户介入。插件程序正常维护自身状态/后端缓存不授权 Agent 手改这些文件。

条目名为 `worktree`，本地 stdio 服务，无网络监听或独立常驻 daemon。Git CLI 必须可用；发行物自带 darwin arm64/amd64、linux amd64 二进制，运行不需要 Go。

配置在 MCP 启动时读取；修改后重新加载该 MCP。不能通过后开终端的临时 export 改变正在运行的实例。

## 根目录

优先级：非空 `SHW_WORKTREE_ROOT` → `${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/worktree.json` → `${XDG_DATA_HOME:-$HOME/.local/share}/shw-plugins/worktrees`。

用户配置示例（root 必须是绝对路径，也支持 `~/`）：

```json
{"root":"/absolute/path/to/worktrees"}
```

目录结构由服务端生成：

```text
<root>/
├── state.json                 # 程序维护的状态，0600
├── state.lock                 # 跨进程锁；不要手动删除
└── repositories/<repo-key>/issue-<N>/
```

repo-key 来自规范化 Git common-dir，同一仓库的多个 worktree 共用标识；不同独立 clone 各自管理。这是单机 Git 仓库级协作，不提供跨机器/跨 clone 的分布式占用。

状态与目录都放稳定用户目录，不放插件版本缓存或项目内部。已存在工作区时不要直接改 root 搬迁；先完成交付/安全清理，或保留原 root 的实例管理旧记录，新 root 只接新工作。

## 各宿主

- **ZCode**：可选插件设置 `worktree_root`；留空时使用上述用户配置/默认值。不需要每个项目各填一次。
- **Kimi Code**：插件已声明 launcher；用用户级 worktree.json 或启动环境的 SHW_WORKTREE_ROOT，不往 manifest 写未解析占位符。
- **Codex**：插件已声明 launcher，并只为它透传 SHW_WORKTREE_ROOT/XDG_CONFIG_HOME/XDG_DATA_HOME；推荐用户级 worktree.json。MCP 的 cwd 即使在插件目录，也不影响显式 repository 和统一 root。
- **OpenCode**：源码构建的完整 dist/opencode 必须包含 worktree-mcp/；合并 mcp 配置时将 worktree command 的脚本路径改为稳定安装目录下的绝对路径。root 可由环境或用户文件提供。

MCP 只使用用户已有 Git 连接方式 fetch origin，不索取 Gitea Token。它不替代项目运行入口、不自动复制 .env、不做宿主任务迁移。
