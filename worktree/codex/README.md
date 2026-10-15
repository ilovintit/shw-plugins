# SHW Worktree

自 v10.0.0 起作为独立插件分发，与主 SHW 共享发行版本。使用已成功发布的市场条目或 Release 资产；本地构建位于 dist/worktree/{host}。不得上传覆盖已发布的同版本资产。

可独立安装的本地 Git 工作区能力。仅提供 `shw-worktree` 技能和 `worktree` MCP，不包含 Gitea、DBX、Kubernetes 或 SHW 产品工作流；无需安装主 SHW 插件。

构建：在 scripts 目录运行 `npm run build:worktree`，或 `npm run build -- --plugin worktree --tool codex`。目录为 `dist/worktree/{codex,kimi-code,claude-code}`。本地宿主选择对应插件目录；Kimi 目录包含独立 kimi.plugin.json。目录清单与二进制完整分发，不应只复制技能。

配置、授权及恢复流程见 `skills/shw-worktree/config.md` 和 `operations.md`。技能发现和 MCP 名称不能代替实际 inspect/acquire 结果。该工具不拦截 shell，也不扩大调用者授权。

## 从内置 Worktree 的 SHW 升级

先结束或安全暂停正在运行的工作区操作，记录已有 claim/路径。由用户或有配置授权的维护者停用旧 SHW 中的 worktree 注册，再安装拆分后的主 SHW 与本插件。不要同时启用旧内置注册和新插件；MCP id 仍为 worktree，工具协议、SHW_WORKTREE_ROOT、用户级 worktree.json、状态目录和仓库身份保持不变。插件重命名不意味着数据迁移，不复制、重置或删除旧状态。安装后只读 list/inspect 核对旧工作区与 claim，再继续操作。Claude 原插件 worktree_root 配置如有自定义值，需用户在新插件填同一值；本次不会代写宿主配置。

主 SHW 仅可选调用此能力；云端未安装时不应拉起本地 MCP。未安装或失败时仍须保护未知修改、检查所有权，不能伪造 claim 或绕过冲突。
