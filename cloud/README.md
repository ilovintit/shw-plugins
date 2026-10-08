# SHW 账户云包维护

`node --import ./scripts/node_modules/tsx/dist/loader.mjs scripts/build.ts --release`

同一构建生成四个本地宿主双包，以及 `dist/release-assets/shw-cloud.zip`、逐文件 SHA256 清单 `shw-cloud.files.json`，两者均纳入 `SHA256SUMS`。构建使用既有 Node 工具链，无 Python 或额外安装依赖。转换器在 `scripts/cloud-package.ts`，以当前 Codex 输出为唯一技能源。

云包保留 `shw-cloud` 身份；根 manifest 与 legacy overlay 同步。默认无 MCP 声明，复用另行安装并认证的现有云 SHW MCP，不打包本地 launcher、worktree 技能或凭据。build-info 记录源码提交、脏状态与版本，不声称实际连接已验证。

Actions 上传归档不等于账户插件更新成功。账户更新须使用受支持的 Plugin Creator 流程，保留插件 ID，以当前 release ID 防冲突；比较旧文件清单与新 inventory，显式删除旧路径并回读验证。不得逆向上传 API、创建凭据或假称存在 Git 自动同步。

发布源仅复制本目录的 README、PACKAGE-README、runtime、plugin.template 四份维护资料，不复制临时输出。ZIP 是可审阅账户更新产物；账户安装与本地主包同时启用会产生重复规则，应按迁移文档切换。
