# T3 Code 接入（本机 0.1.4 / 2026-10-29 核对）

## 安装

T3 当前没有独立统一插件市场/安装入口。在运行 agent 的机器上分别安装 Codex、Claude Code、Pi 对应的 SHW 与 shw-mcp；shw-worktree 按需选装。T3 使用各 provider 的安装与配置，不会把一个宿主的插件转换给另一个。核对 Codex CODEX_HOME、Claude CLAUDE_CONFIG_DIR、Pi 实际配置及项目作用域；远程连接使用远端安装。不修改用户配置或复制安装缓存。更新后在命令面板执行 Restart agent session，保留对话，下条消息重新加载。

配置复用不等于 MCP 进程共享，stdio 后端仍可能分别启动；本次不引入共享 Hub。通过来源/schema 发现工具，不写死宿主前缀，不重复注册同用途本地与云端服务。

## 默认工作区

Settings → Threads → New threads，将 Default workspace 选为 New worktree（defaultThreadEnvMode=worktree）。先选择 All projects 和目标 environment 配机器默认；具体项目有覆盖时另行设定或重置继承。优先级：项目覆盖 → environment → 仓库 t3.json → 内置默认。

这是默认选择：用户仍可选 Current checkout、New thread in this worktree；非 Git scratch 不适用，新建项目首次线程也可能留在根目录。每轮写入仍核对实际绑定与占用，不以设置代替所有权。本指南不替用户修改配置或添加 t3.json。自动分支名在 Settings → Worktrees → Worktree branch naming 配合 Issue 编号约定，生成后核对实际结果。

## PR、功能验证和线程收起

创建、接管或推送 PR 后立即按当前 schema 用 T3 link_pull_request 关联完整 URL，每个 stack 层分别关联，失败报告；只读查看的 PR 不接管。需要等待检查/审阅才能继续已授权合并时，处理旧反馈后按宿主 watch_pull_request 观察并结束当前轮，唤醒后重读准确 HEAD 与门禁，不轮询或休眠。交回用户时 unwatch。关联/观察不授予合并权限。

T3 提供分支 diff、终端和 Pull requests 的评论、审阅、检查；Review guides 只辅助阅读。turn diff 只代表本轮，完整审查须比较基线。功能正常需要候选运行与体验证据：提供 SHA、运行/部署入口、角色与数据要求、步骤、预期和实际结果。未体验如实记录；检查绿、模型审阅、合并或 settled 均不代表业务验收通过。

Settings → Threads → Auto-settle → Auto-settle merged threads 可关闭合并自动收起（sidebarAutoSettleOnMerge，内置默认 true）。关闭后 closed PR 仍可能收起，闲置策略另算；单线程菜单 Auto-settle behavior → Disabled 可禁止该线程自动收起。Settle 保留对话，可 Un-settle，不等于删除工作区；发布制品跟进不因收起而视为完成。

测试/API/E2E/VRT/回归/冒烟仍仅用户明确要求后在专用 Mac mini 固定提交执行。必要构建/静态/来源核对正常执行；用户可安排合并前体验或按项目授权发布后体验，不新增全局验收门禁。

## 来源与验证边界

设置字段已只读核对本机发行代码；静态规则与构建不等于三宿主安装、真实 MCP 调用或人工体验。T3 升级后按当前界面/schema 重新确认。

- [配置继承](https://github.com/pingdotgg/t3code/blob/main/docs/user/project-settings.md#defaults-and-inheritance)
- [线程与 settle](https://github.com/pingdotgg/t3code/blob/main/docs/user/thread-sidebar.md)
- [审阅与合并](https://github.com/pingdotgg/t3code/blob/main/docs/user/source-control.md)
- [Claude 插件与配置](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-claude.md)
- [Codex 配置](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-codex.md)

## 合并后必须继续部署取证

共享开发环境按现有 dev 部署链运行，合入 dev 后跟进实际运行候选再交用户体验，不为每个 PR 切环境分支。PR watch 在合并后停止；它不能保证部署继续。存在后续部署时建议用户将本线程 Auto-settle behavior 设为 Disabled（Agent 不改配置），并保留候选、部署任务链接和恢复步骤。宿主停止运行后，恢复必须先查询部署结果继续原任务。实际环境版本与 Ready/发布状态未确认前，报告部署未确认，不通知可体验。技能不能保证宿主自动唤醒；缺少部署事件机制需明确说明。详见 shw-delivery 的合并后部署跟进契约。
