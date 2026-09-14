---
name: shw-gitea-ci
description: 使用官方 gitea-mcp 查询 PR status、Actions run/job/log，重试失败运行并按权限合并；work/roadmap/release/deploy 的 CI 证据与红绿循环使用。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# Gitea CI 取证

## 模式前置

本 Skill 不是所有项目的默认约束。先读取仓库根 `.shw/project.yaml` 的模式：无标识时不主动应用；`issue-main` 只保留 Issue 分支→main 的轻量闭环；`issue-dev` 只保留 Issue 分支→dev→main 的轻量闭环；只有 `managed` 才应用本 Skill 中的业务项目目录、分支、测试、发布、部署或公司规范要求。模式定义见 `shw-issue-gate/project-mode.md`。

配置方式见 `config.md`，不得把真实 token 写入仓库、日志或回复。

## 证据顺序

1. 读取 PR，取得当前 head SHA。
2. 读取该 SHA 的 commit status 与对应 workflow run。
3. 读取每个 required job；失败时读取真实日志，不根据 job 名猜原因。
4. 修复后核对最新HEAD的测试计划和实际执行模块/文件；Issue→dev仅相关检查，dev→main必须有本次全量检查运行记录，仅shw-test-spec/references/history-sync.md定义的同一发布PR纯历史同步例外可复用；其他旧结果或定向结果不能代替。
5. 全部 required checks success 才能宣称 CI 绿。

## 合并权限

加载 [项目目录与 Workflow 公共模板](references/project-template.md)。dev 手动全量测试是仅供整体调试的受控入口，必须先取得用户明确授权，不得由 Agent 自行触发；dev→main 才是正式全量测试位置。main 打 tag 不重复测试，直接执行发布流程。小程序体验版来源按是否存在真实 test 环境决定：无 test 用 dev，有 test 用 test；dev 始终保留本地开发者工具调试用途。

- 目标 dev：`/work` 或 `/roadmap` 可在 CI 全绿后合并并删除分支。
- 目标 main：永远不调用合并 API；只报告 PR URL、全量检查真实状态和风险，等用户 Web UI 合并。即使检查失败或未完成，用户仍可决定例外合并；Agent 不替用户点击、不把例外说成 CI 绿。
- Hotfix 即使紧急也遵守 main 人工合并。

## 发布证据

区分源 tag、发布 CI、Harbor/发布制品和生产部署。任一层成功不能替代其他层。

Agent 严禁 force merge、跳过/取消 checks、根据一次陈旧 `merged` 字段下结论，或在日志中回显 Actions secrets。用户通过 Web UI 例外合并 main 后，按 shw-test-spec 记录真实状态和接受风险，不把该授权外推到其他 PR。

## 测试范围与依赖

加载shw-test-spec核对选择器、分支方向与报告范围；Issue检查失败不能通过扩大到全量来兜底。全量仅限dev→main，且必须真实运行。CI镜像、Action及包依赖采用公司内部缓存；源缺失/认证失败时报告具体配置，不改公网源或在测试job重新下载整套工具链。自然语言规则仍由审查/人工验收验证，不用文案关键词断言。
