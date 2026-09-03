# SHW Plugins — Kimi Code 配置

## Kimi Code 配置（gitea MCP）

插件自带 gitea shim 网关（工具面随插件注入，后端按 pin 版本自动下载），网关继承启动 Kimi Code 的 shell 环境。**主路径：启动 Kimi Code 前在 shell 导出两个环境变量即可，零 mcp.json 配置**：

```bash
export GITEA_HOST="https://gitea.example.com"    # 你的 Gitea 实例地址，需含协议头（填你自己的实例）
export GITEA_ACCESS_TOKEN="<你的 token>"          # Gitea Web → Settings → Applications 创建
```

首次调用时 shim 会从 gitea.com 下载官方 gitea-mcp 后端（数秒，之后走用户级缓存）；机器无需安装 Go。

### 进阶：mcp.json 同名整体覆盖

项目需要连特殊 Gitea 实例（不同 host / token），或想显式指定命令时，在配置文件里写一个与插件清单同名的 `gitea` 条目，即可整体覆盖插件内置声明（Kimi 官方文档确认项目级 `.kimi-code/mcp.json` 覆盖用户级 `~/.kimi-code/mcp.json`；worktree 根 `.mcp.json` 若受支持则介于其间；三者均高于插件清单）。覆盖后该条目脱离 shim 自管，由你写的命令直接拉起后端。

编辑 `~/.kimi-code/mcp.json`（用户级，跨项目生效）或项目 `.kimi-code/mcp.json`（仅本项目），写入完整文件内容（可直接粘贴后修改）：

```json
{
  "mcpServers": {
    "gitea": {
      "command": "go",
      "args": ["run", "gitea.com/gitea/gitea-mcp@v1.7.0"],
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

> 上面的 JSON 是**用户自选直连后端形态**：机器需 Go 或自装二进制，不经 shim 管理。
