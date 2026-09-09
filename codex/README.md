# shw for Codex

> Codex 通用适配：skills + Gitea MCP + 插件 Worktree MCP。ZCode userConfig 深度能力不在 Codex 产物中复刻。

## 安装

1. 把发布仓库加为 Codex marketplace：

   ```bash
   codex plugin marketplace add ilovintit/shw-plugins
   ```

2. 安装插件：

   - CLI / 终端场景：`codex plugin add shw@shw-plugins-market`
   - Desktop：重启 ChatGPT desktop，在 Plugins Directory 中选择该 marketplace 并安装 `shw`

## 从旧版 shw-plugins 升级

v6.4.0 起 Codex 产物改名为 `shw`。旧版需先卸载再安装新版，否则两套 skills 并存：

```bash
codex plugin remove shw-plugins
codex plugin add shw@shw-plugins-market
```

## Gitea MCP 配置

插件自带 gitea-mcp shim；优先使用统一 env 文件：

1. 用户级：`$HOME/.config/shw-plugins/gitea.env`
2. 项目级：`${SHW_MCP_WORKDIR:-$PWD}/.shw-plugins/gitea.env`（同名变量覆盖用户级）

> **Codex 项目级路径注意**：Codex 将插件 MCP 的 cwd 锚定到插件安装根而非你的项目目录，`$PWD` 通常不指向用户项目。项目级特殊配置请**在启动 Codex 前设置 `SHW_MCP_WORKDIR` 环境变量**指向项目根（Codex env_vars 白名单已包含此变量），或使用用户级 env 文件。

用户级文件可写 `GITEA_*` 简单赋值；项目级只允许 host/token，不提交到 git：

```dotenv
GITEA_HOST=https://gitea.example.com
GITEA_ACCESS_TOKEN=<your-token>
```

shell 导出保留为兼容路径，但文件中的同名变量会覆盖它。**项目文件若把 `GITEA_HOST` 改成不同值而未同时配置项目 token，launcher 会丢弃旧 token**，避免凭据被发到新实例。首次调用会按插件内嵌版本拉起官方 gitea-mcp 后端；不要把真实 token 写进插件产物。
发布阶段 A 的对抗审查要求两个本机 profile：$CODEX_HOME/release-adversary-glm.config.toml 选择你已在本机配置的 GLM-5.3 provider/model，$CODEX_HOME/release-adversary-kimi.config.toml 选择你已在本机配置的 Kimi-K3 provider/model。插件不分发 provider 地址或凭证；缺少任一 profile 时必须停止放行。profile 只覆盖 model、model_provider 与推理强度，认证仍保留在用户的 Codex 配置或密钥系统，且不得写入项目、插件产物或 PR。

## Commands 与 Skills

Codex 插件清单没有原生 `commands` 字段。共享源码中的 `shw-*` command 已构建为去掉前缀、显式触发的 skill-backed prompt：

- 直接说“用 /work 完成 #123”，或用 `$roadmap` 调起版本执行 skill。
- 这些是 prompt 映射，不是伪造的 Codex 原生 slash command。

## Issue 工作区

默认由插件 worktree MCP 管理，配置见 skills/shw-worktree/config.md。一个会话负责完整 Issue，acquire 返回工作目录后所有操作都显式使用该路径；不需要 fork/Handoff。元数据操作不创建 worktree。用户主动选择的 Codex 原生工作区仍由 Codex 管理，本 MCP 不自动接管、删除它。

## Codex 临时 fork 任务清理

执行 command workflow 时若通过 Codex 原生 fork/create task 建立临时子任务，主任务在收集结果并完成独立验证后，应逐个检查任务状态，并归档本次工作创建且已经完成或明确不再需要的临时任务。仍在运行、等待用户输入、需要关注或由用户独立创建的任务不得归档。

任务归档只整理 Codex 任务列表，不等同于 Git worktree 清理；managed worktree 仍交给 Codex 生命周期管理。
