# shw-local-test

可选、独立、仅专用 Mac mini 安装的本地测试技能与端口 CLI 插件，版本 1.0.0。Python 3 标准库，无 MCP、后台 daemon 或自动测试。普通工作机器仍保持 SHW + MCP + Worktree 三包。

构建：在 scripts 运行 `npm run build -- --plugin local-test`，四宿主产物位于 dist/local-test/<host>。`--release` 输出独立 dist/local-test-release，包含各宿主 ZIP、marketplace 与 Kimi 根清单 和 SHA256SUMS，默认非 release 的 all 仍只构建三包；正式 all --release 将它作为可选独立包放入同一市场与 Release 附件，不复制进主包或云端。安装通过目标宿主支持的本地插件入口由用户执行；不编辑安装缓存或用户配置。

运行与状态边界见 [技能指南](skills/shw-local-test/README.md)。本机安装、两个业务项目并发、真实 Mac 回归与小程序/真机尚需用户指定范围后验收；构建和静态检查不能替代这些事实。
