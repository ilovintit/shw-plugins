# shw for Codex

> Codex 通用适配：skills + Gitea MCP + 原生 Worktree 映射。ZCode userConfig 深度能力不在 Codex 产物中复刻。

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

## Commands 与 Skills

Codex 插件清单没有原生 `commands` 字段。共享源码中的 `shw-*` command 已构建为去掉前缀、显式触发的 skill-backed prompt：

- 直接说“用 /work 完成 #123”，或用 `$roadmap` 调起版本执行 skill。
- 这些是 prompt 映射，不是伪造的 Codex 原生 slash command。

## Codex Worktree 结合

- **普通 Issue**：新建 Codex chat 时选择 **Worktree**，起点选 `dev`；**开工第一步在终端跑 `git checkout -b feat/<N>-<slug>` 固化分支**（detached HEAD / base 分支上不开发），保持 Issue:分支:Worktree 1:1。
- **Roadmap / Milestone**：使用 Codex **permanent worktree** 承载整个里程碑；**每次换 Issue 时第一步跑 `git checkout -b feat/<N>-<slug> origin/dev` 切新分支**——worktree 本身不重建，分支逐 Issue 轮转。
- **隔离环境**：在项目 Local Environment setup 中安装依赖（例如 `cd scripts && npm ci`）；被忽略但必需的本地文件用 `.worktreeinclude` 声明。
- **清理**：managed worktree 交给 Codex 生命周期管理，不要手动 `git worktree remove`；自建 fallback worktree 在 PR 合并后清理并删除分支。

## Codex 临时 fork 任务清理

执行 command workflow 时若通过 Codex 原生 fork/create task 建立临时子任务，主任务在收集结果并完成独立验证后，应逐个检查任务状态，并归档本次工作创建且已经完成或明确不再需要的临时任务。仍在运行、等待用户输入、需要关注或由用户独立创建的任务不得归档。

任务归档只整理 Codex 任务列表，不等同于 Git worktree 清理；managed worktree 仍交给 Codex 生命周期管理。
