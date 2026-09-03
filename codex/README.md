# shw-plugins for Codex

> Codex 通用适配：skills + Gitea MCP + 原生 Worktree 映射。ZCode userConfig 深度能力不在 Codex 产物中复刻。

## 安装

1. 把发布仓库加为 Codex marketplace：

   ```bash
   codex plugin marketplace add ilovintit/shw-plugins
   ```

2. 安装插件：

   - CLI / 终端场景：`codex plugin add shw-plugins@shw-plugins-market`
   - Desktop：重启 ChatGPT desktop，在 Plugins Directory 中选择该 marketplace 并安装 `shw-plugins`

## Gitea MCP 配置

插件自带 gitea-mcp shim；在启动 Codex 的环境中导出变量，插件用 `env_vars` 白名单透传。**CLI 会继承终端 shell；Desktop GUI 不继承某个终端里的临时 `export`**——请配置用户/启动环境，或先在已导出变量的终端启动 Desktop 后完全重启：

```bash
export GITEA_HOST="https://gitea.example.com"
export GITEA_ACCESS_TOKEN="<your-token>"
```

首次调用会按插件内嵌版本拉起官方 gitea-mcp 后端。不要把真实 token 写进插件产物。

## Commands 与 Skills

Codex 插件清单没有原生 `commands` 字段。共享源码中的 `/shw-*` command 已构建为同名、显式触发的 skill-backed prompt：

- 直接说“用 /shw-issue 整理这个需求”，或用 `$shw-issue` 调起同名 skill。
- 这些是 prompt 映射，不是伪造的 Codex 原生 slash command。

## Codex Worktree 结合

- **普通 Issue**：新建 Codex chat 时选择 **Worktree**，起点选 `dev`；**开工第一步在终端跑 `git checkout -b feat/<N>-<slug>` 固化分支**（detached HEAD / base 分支上不开发），保持 Issue:分支:Worktree 1:1。
- **Roadmap / Milestone**：使用 Codex **permanent worktree** 承载整个里程碑；**每次换 Issue 时第一步跑 `git checkout -b feat/<N>-<slug> origin/dev` 切新分支**——worktree 本身不重建，分支逐 Issue 轮转。
- **隔离环境**：在项目 Local Environment setup 中安装依赖（例如 `cd scripts && npm ci`）；被忽略但必需的本地文件用 `.worktreeinclude` 声明。
- **清理**：managed worktree 交给 Codex 生命周期管理，不要手动 `git worktree remove`；自建 fallback worktree 在 PR 合并后清理并删除分支。
