# SHW Plugins — Kimi Code 配置

## Kimi Code 配置

Kimi Code 的插件清单**没有配置面板，也没有 `${VAR}` env 插值机制**，清单条目因此不携带任何 `env`——清单里的 `env` 会直接覆盖父进程环境继承，写占位符只会让它变成字面量并覆盖你的真实环境变量。地址与凭据全部走下面的配置文件与父进程环境继承。

插件声明三个 stdio MCP 条目，形态一致：

```json
{
  "gitea":      { "command": "sh", "args": ["./mcp-shim/launch.sh"],      "cwd": "./" },
  "worktree":   { "command": "sh", "args": ["./worktree-mcp/launch.sh"],   "cwd": "./" },
  "kubernetes": { "command": "sh", "args": ["./kubernetes-mcp/launch.sh"], "cwd": "./" }
}
```

> **安装后必须逐条确认三个条目实际在线**。Kimi Code 对不合法的 MCP 条目（例如 `cwd` 不以 `./` 开头或越出插件根）是**静默忽略**的，不会报错，所以"清单里有"不等于"连上了"。

### gitea：env 文件（主路径，零 mcp.json 配置）

Launcher 依次读取两个 env 文件，同名变量由后者覆盖前者：

1. **用户级**：`${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/gitea.env`——跨项目生效，支持全部 `GITEA_*` 变量
2. **工作区级**：`${SHW_MCP_WORKDIR:-$PWD}/.shw-plugins/gitea.env`——仅当前项目，只支持 `GITEA_HOST` / `GITEA_ACCESS_TOKEN`

创建用户级文件：

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

> **注意**：清单用 `cwd: "./"` 把入口锚定到插件安装根，因此工作区级 `$PWD/.shw-plugins/gitea.env` 通常**不**指向你的项目目录。需要项目级特殊配置时，用下方 mcp.json 覆盖路径，或在启动环境里设置 `SHW_MCP_WORKDIR` 指向项目根。

首次调用时 shim 会下载官方 gitea-mcp 后端（数秒，之后走用户级缓存）；机器无需安装 Go。

### gitea：shell 导出（兼容路径）

启动 Kimi Code 前在 shell 导出变量（env 文件中的同名变量会覆盖此路径）：

```bash
export GITEA_HOST="https://gitea.example.com"
export GITEA_ACCESS_TOKEN="<你的 token>"
```

### worktree：可选 root

`SHW_WORKTREE_ROOT` 只能从启动 Kimi Code 的父进程环境继承。留空时使用用户级 `worktree.json` 或默认用户数据目录，多数情况无需配置。

### kubernetes：用户级配置文件

Kubernetes MCP 走插件自带的 stdio 薄壳转接远程 HTTPS 网关，地址与 token **不经清单传递**，由薄壳自行读取：

```dotenv
# ${XDG_CONFIG_HOME:-$HOME/.config}/shw-plugins/kubernetes.env
K8S_MCP_URL=https://<your-kubernetes-mcp-host>/mcp
K8S_MCP_TOKEN=<your-agent-mcp-token>
```

文件权限必须为 `600`。URL 必须为 HTTPS 且不含用户名、密码、query 或 fragment；只使用基础设施签发的 MCP Bearer 本体，不要填 kubeconfig 或 Rancher token。未创建该文件时该条目连接失败并明确报错，不影响其他两个 MCP。

多审计身份使用 `kubernetes.<profile>.env`，并让 `SHW_K8S_PROFILE=<profile>` 存在于**启动 Kimi Code 的稳定环境**中——Kimi Code 没有清单级的环境转发机制，事后在另一个终端 export 不会生效。

### 进阶：mcp.json 同名整体覆盖

项目需要连特殊 Gitea 实例（不同 host / token），或想显式指定命令时，在配置文件里写一个与插件清单同名的 `gitea` 条目即可整体覆盖插件内置声明。覆盖后该条目脱离 shim 自管，由你写的命令直接拉起后端。

编辑 `~/.kimi-code/mcp.json`（用户级，跨项目生效）或项目 `.kimi-code/mcp.json`（仅本项目）：

```json
{
  "mcpServers": {
    "gitea": {
      "command": "go",
      "args": ["run", "gitea.com/gitea/gitea-mcp@vX.Y.Z"],
      "env": {
        "GITEA_HOST": "https://gitea.example.com",
        "GITEA_ACCESS_TOKEN": "<在此填入你的 token>"
      }
    }
  }
}
```

> 上面的 JSON 是**用户自选直连后端形态**：机器需 Go 或自装二进制，不经 shim 管理，`vX.Y.Z` 为占位示例，请填你要用的后端版本。
