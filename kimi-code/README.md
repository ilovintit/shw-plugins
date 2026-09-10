# SHW Plugins — Kimi Code 配置

## Kimi Code 配置（gitea MCP）

插件自带 gitea shim 网关（工具面随插件注入，后端按 pin 版本自动下载）。

### 主路径：env 文件（零 mcp.json 配置）

Launcher 依次读取以下两个 env 文件，同名变量由后者覆盖前者：

1. **用户级**：`${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/gitea.env`——跨项目生效，支持全部 `GITEA_*` 变量
2. **工作区级**：`${SHW_MCP_WORKDIR:-$PWD}/.shw-plugins/gitea.env`——仅当前项目，只支持 `GITEA_HOST` / `GITEA_ACCESS_TOKEN`

创建用户级文件（填入你的 Gitea 实例地址和 token）：

```bash
mkdir -p "$HOME/.config/shw-plugins"
cat > "$HOME/.config/shw-plugins/gitea.env" << 'ENVFILE'
GITEA_HOST=https://gitea.example.com
GITEA_ACCESS_TOKEN=<你的 Gitea Access Token>
ENVFILE
chmod 600 "$HOME/.config/shw-plugins/gitea.env"
```

- `GITEA_HOST`：Gitea Web 地址，**需含协议头**（如 `https://gitea.example.com`，填你自己的实例）
- `GITEA_ACCESS_TOKEN`：Gitea Web → Settings → Applications 创建

文件格式为简单 `KEY=value` 赋值（支持引号包裹值）；不执行 shell 命令；不要提交到 git。

> **注意**：Kimi Code 把插件 MCP 的 `cwd` 锚定到插件安装根，工作区级 `$PWD/.shw-plugins/gitea.env` 通常不指向你的项目目录。项目级特殊配置请使用下方 mcp.json 覆盖路径，或在启动环境设置 `SHW_MCP_WORKDIR` 指向项目根。

### 兼容路径：shell 导出

启动 Kimi Code 前在 shell 导出变量（env 文件中的同名变量会覆盖此路径）：

```bash
export GITEA_HOST="https://gitea.example.com"    # 你的 Gitea 实例地址，需含协议头
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
