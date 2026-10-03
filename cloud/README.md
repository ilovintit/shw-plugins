# SHW Cloud

从 `codex/skills` 构建 Agent Plugins 1.0 云端包，复用当前版本的全部 49 个工作流与参考文件，保持桌面发行物不变。云端包使用独立名称 `shw-cloud`，不会覆盖桌面 `shw`。

```bash
python3 cloud/build.py --archive /absolute/output/shw-cloud.zip
python3 -m unittest discover -s cloud -p 'test_*.py'
```

无连接配置时生成可安装的工作流插件；不会伪装成服务已连接。产品文档、计划和规范指导可以使用，Gitea 交付、K8S 观测、DBX 查询仍需宿主的真实连接。安装后通过 Plugin Creator 返回的私密插件链接使用。创建不等于安装、认证或端到端验收。

## 接入已有远程 MCP

先取得基础设施实际 HTTPS MCP 端点，确认 transport 为 Streamable HTTP，并通过受支持的 MCP 客户端发现工具、完成最小只读验证。验证后把不含凭据的 JSON 配置通过 `--connections /absolute/connections.json` 传给构建器：根对象仅有 `mcpServers`，服务名允许 `gitea`、`kubernetes`、`dbx`，每项仅有 `type: streamable-http` 与实际 `url`。不要把示例域名作为生产地址。

构建器不进行网络发现，语法检查不等于端点验证。认证通过宿主安全连接流程完成；当前构建器拒绝 token/header、stdio、placeholder 和本机地址，不依赖未经验证的云端环境变量插值。若服务仅支持宿主尚不支持的 Bearer 配置，需先解决连接能力，不能删认证或把密钥编进包。

Worktree 是本地文件系统服务，不直接改为 HTTP。云端任务使用用户已选定或授权的宿主隔离工作区；必须使用 Worktree MCP 的工作流需另行解决运行环境和文件访问，不能只填远端 URL。

## 发布维护

此仓库为 CI 生成的发布仓库。此转换器为新增适配入口；维护者需在私有源仓库及发布流水线纳入对应变更，避免未来发布覆盖。它从当次 `codex/` 产物构建，不手工复制维护 49 套规范。更新私密插件需读取既有插件与当前 release ID，使用 guarded update，不能重复 create。
