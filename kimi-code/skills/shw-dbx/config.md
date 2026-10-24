# 插件 DBX 接入

插件在 Kimi Code、Codex、Claude Code 中统一声明 `dbx`，入口为 `dbx-mcp/launch.cjs`。只需 Node.js 18+，无需逐宿主 npm 安装或手动注册 MCP。首次启动从官方 npm registry 获取固定版本原生程序，校验源码中固定的 SHA-512 后提取单个可执行文件；后续启动复核缓存 SHA-256。程序版本独立于 DBX Web 镜像版本，由 `dbx-mcp/backend-version.json` 固定。目前使用官方 `@dbx-app/mcp-server` 对应的 0.4.108 原生包（Apache-2.0，来源 https://github.com/t8y2/dbx），不在 SHW marketplace Git 树或 15 个自研 Release 二进制中复制上游二进制。

支持 macOS arm64/x64、Linux x64（glibc）、Windows x64/arm64。Linux musl 不在上游此包的支持范围。首次下载需要连通 registry.npmjs.org；下载失败或校验不符直接停止，不改用 latest，不执行安装脚本。当前下载器不读取系统代理变量，受限网络需要维护者提供可达网络。

## 一份稳定用户配置

维护者创建 `$XDG_CONFIG_HOME/shw-plugins/dbx.env`；未设置 XDG 时 Unix 为 `~/.config/shw-plugins/dbx.env`，Windows 为 `%USERPROFILE%/.config/shw-plugins/dbx.env`：

```dotenv
DBX_WEB_URL=https://dbx.example.com
DBX_WEB_PASSWORD=replace-with-web-login-password
```

URL 为 DBX Web 基础地址，不加 `/mcp`。密码是 Web 登录密码，不是数据库密码或原生 HTTP MCP Bearer。文件是字面量键值，可选单/双引号，不展开变量或执行 shell；只读取以上两个键。配置文件保存完整 URL/密码对，覆盖继承环境，不能只换地址并沿用旧密码。维护者应限制文件只对当前用户可读写。项目 Agent 不创建/修改该外部文件，不复制 Ansible secret、旧脚本或宿主配置中的凭据。

可以用 `SHW_DBX_PROFILE=alice` 选择同目录 `dbx.alice.env`，名称限字母数字、下划线和连字符；指定 profile 缺失时停止，不回退默认身份。Codex 清单显式转发所需环境；Kimi Code 从稳定宿主启动环境继承。三端同一用户默认读取同一份文件，无需每个 Agent 单独配置。

没有文件时可以继承完整的 `DBX_WEB_URL` / `DBX_WEB_PASSWORD`。Claude Code 也可通过原生 userConfig 的 `dbx_web_url` / `dbx_web_password` 提供，密码字段 sensitive；有稳定用户文件时仍以文件完整对为准。Kimi Code 和 Codex 清单不写 `${VAR}` 占位符。

用户配置不从项目目录读取。未配置时报告 `MISSING_DBX_WEB_CONFIG`，不会回退 Desktop 本地连接。启动器不接受额外 DBX headers、TLS 跳过验证或本地数据库目录环境设置；服务端权限以 DBX 实际配置为准，本插件不修改其读写策略。查询行为继续遵守 shw-dbx 的开发只读边界。

## 缓存与升级迁移

默认缓存为 `~/.cache/shw-plugins/dbx/<官方版本>/<平台>/`；Windows 优先 `%LOCALAPPDATA%/shw-plugins/dbx/...`，`XDG_CACHE_HOME` 可覆盖且必须为绝对路径。三端复用该缓存，插件升级不要求重新安装同版本 DBX。缓存写入由运行时完成，项目 Agent 不手改外部缓存。

已有用户级 `dbx` 注册可能与插件重复。维护者先记录原注册/配置，准备共享用户文件，确认插件入口可初始化与列出目标开发连接，再按宿主能力移除旧注册；项目 Agent 只读核对和提供路径，不直接改用户配置或自动删除旧入口。固定旧插件版本可回退，但旧版本仍需要原宿主 DBX 注册。

官方协议参考：https://github.com/t8y2/dbx/tree/main/packages/mcp-server 。Web 模式与原生 `/mcp` HTTP 模式不是同一个入口；本次使用官方 Web stdio 适配，不启用或配置云端 HTTP 服务。
