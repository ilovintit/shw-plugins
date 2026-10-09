# shw-mcp

独立 Gitea、DBX、Kubernetes 工具集，不包含工作流技能或工作区工具。与技能插件及 shw-worktree 组合安装；本地 MCP 可用时优先使用；云网关用于 Codex Cloud 等没有本地工具的执行环境，不对同一操作重复调用两端。配置指南见 config/，凭据继续使用既有宿主配置和稳定用户文件；不要将真实凭据写入插件。
