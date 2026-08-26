# SHW Plugins — Kimi Code 配置

## Kimi Code 配置（gitea MCP）

Kimi Code 没有插件配置面板，`gitea` MCP 的连接信息通过 **mcp.json 同名条目覆盖**配置：在配置文件里写一个与插件清单同名的 `gitea` 条目，即可整体覆盖插件内置声明（优先级：项目 > worktree > 用户 > 插件）。

### 用户级配置（主路径，跨项目生效）

编辑 `~/.kimi-code/mcp.json`，写入完整文件内容（可直接粘贴后修改）：

```json
{
  "mcpServers": {
    "gitea": {
      "command": "go",
      "args": ["run", "gitea.com/gitea/gitea-mcp@v1.6.0"],
      "env": {
        "GITEA_HOST": "https://gitea.example.com",
        "GITEA_ACCESS_TOKEN": "<在此填入你的 token>"
      }
    }
  }
}
```

- `GITEA_HOST`：你的 Gitea 实例地址，**需含协议头**（如 `https://gitea.example.com`，填你自己的 Gitea 实例地址）
- `GITEA_ACCESS_TOKEN`：访问 token，在 Gitea Web → Settings → Applications 创建

### 项目级配置（连接特殊 Gitea 实例）

某个项目需要连不同的 Gitea 实例（不同 host / token）时，在该项目的 `.kimi-code/mcp.json`（或 worktree 根 `.mcp.json`）写同名 `gitea` 条目覆盖，条目格式与上面相同，只改 `env` 里的值即可。

> 兜底：在 shell 里 `export GITEA_HOST` / `GITEA_ACCESS_TOKEN` 也可用（插件清单不携带 env，不会覆盖 shell 变量）。
