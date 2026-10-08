# SHW for ZCode

此包包含共享 skills/commands 和 Gitea、DBX、Kubernetes 的本地 stdio launcher。需要本机 Node.js；配置读取既有用户级 env 文件，不提供敏感 userConfig，不将凭据写入插件或项目。

配置分别见 skills/shw-gitea-ci/config.md、skills/shw-dbx/config.md、skills/shw-k8s-observer/config.md。工作区能力由另装的 shw-worktree 提供，主包不重复注册。未安装时仍按 shw-workspace 核对所有权并保护未知修改。

本地市场选择构建发布根 marketplace.json，安装 shw-plugins 与需要的 shw-worktree。目录清单遵循本机 ZCode 3.14.4 文档，安装和 MCP 连通需在用户授权的宿主验收中核实；本次构建不会注册、安装或修改用户配置。
