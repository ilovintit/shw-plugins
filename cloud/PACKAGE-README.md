# SHW Cloud

这是现有 `shw-cloud` 私有账户插件的通用技能包。Codex 使用本包与**另行云安装的既有 SHW MCP 连接**；本机只需独立 `shw-worktree`。本包默认不另声明 MCP，不复制凭据，不创建第二条连接；MCP 工具是否可用以会话实际发现和最小只读调用为准。

升级时使用原插件 ID 的 guarded update。覆盖新同名技能与两个 manifest，并按新旧文件清单精确删除旧 `skills/shw-worktree/*` 和其他已退役文件；仅省略不会删除旧文件。旧 baseline/TDD/defaultPrompt 由同路径新规则替换。不得新建另一个同名插件。

用户停用旧本地主 SHW 后启用云技能，避免重复技能与基础 MCP；独立 worktree 保留 root/claim。Claude Code、ZCode、Kimi Code 使用各自本地主包和独立 worktree，不用本包替代本地能力。

所有技能的 cloud-runtime.md 由同一源生成。没有本地 stdio、二进制、依赖缓存或秘密。build-info 标记源 commit/dirty、版本和是否声明连接；打包不证明用户已安装或服务已认证。现有 Sites 连接与另一个 FastMCP/NextTerminal 地址属于不同服务身份，不得混用或因连接问题恢复网关开发。
