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
4. 修复后核对最新 HEAD 实际执行的工程构建、静态检查和适用单元/协议/安全检查；API/E2E/VRT 不属于 required checks。纯历史同步只按 `shw-test-spec/references/history-sync.md` 复用同一发布 PR 的工程检查。
5. 全部 required checks success 才能宣称 CI 绿。

## 合并权限

加载 [项目目录与 Workflow 公共模板](references/project-template.md)。工程 required checks、dev 合入后的非阻断回归报告、最终验收后的基线维护是三条独立路径。main 打 tag 不重复 API/E2E/VRT，也不等待其结果，只执行来源、制品与发布检查。小程序体验版来源按是否存在真实 test 环境决定：无 test 用严格的 dev/main uploader 与 workflow 对，有 test 用严格的 test/main 对；dev 始终保留本地开发者工具调试用途。

- 目标 dev：`/work` 或 `/roadmap` 可在 CI 全绿后合并并删除分支。
- 目标 main：永远不调用合并 API；只报告 PR URL 与适用工程/发布检查真实状态，等用户 Web UI 合并。API/E2E/VRT 差异、缺基线或未运行不是例外合并债务。
- Hotfix 即使紧急也遵守 main 人工合并。

## 发布证据

区分源 tag、发布 CI、Harbor/发布制品和生产部署。任一层成功不能替代其他层。

Agent 严禁 force merge、跳过/取消适用工程与发布检查、根据一次陈旧 `merged` 字段下结论，或在日志中回显 Actions secrets。用户通过 Web UI 合并 main 后仍回读验证，不把权限外推到其他 PR。

## 测试范围与依赖

Issue 工程检查失败不能通过扩大到全仓来兜底。已有基线比较可在独立回归入口覆盖全部适用基线，但其状态不汇入 required checks；报告失败仍要真实保存。基线写入口必须校验验收引用和不可变 source，普通 push/PR 不得获得自动重录权限。CI 镜像、Action及包依赖采用公司内部缓存；自然语言规则仍由审查/人工验收验证，不用文案关键词断言。
