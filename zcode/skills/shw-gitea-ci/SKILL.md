---
name: shw-gitea-ci
description: 使用官方 gitea-mcp 查询 PR status、Actions run/job/log，重试失败运行并按权限合并；work/roadmap/release/deploy 的 CI 证据与红绿循环使用。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# Gitea CI 取证

配置方式见 `config.md`，不得把真实 token 写入仓库、日志或回复。

## 证据顺序

1. 读取 PR，取得当前 head SHA。
2. 读取该 SHA 的 commit status 与对应 workflow run。
3. 读取每个 required job；失败时读取真实日志，不根据 job 名猜原因。
4. 修复后核对最新HEAD的测试计划和实际执行模块/文件；Issue→dev仅相关检查，dev→main必须有本次全量门禁成功记录，不能拿旧结果或定向结果代替。
5. 全部 required checks success 才能宣称 CI 绿。

## 合并权限

- 目标 dev：`/shw-work` 或 `/shw-roadmap` 可在 CI 全绿后合并并删除分支。
- 目标 main：永远不调用合并 API；只报告 PR URL 和状态，等用户 Web UI 合并。
- Hotfix 即使紧急也遵守 main 人工合并。

## 发布证据

区分源 tag、发布 CI、Harbor/发布制品和生产部署。任一层成功不能替代其他层。

严禁 force merge、跳过 checks、根据一次陈旧 `merged` 字段下结论，或在日志中回显 Actions secrets。

## 测试范围与依赖

加载shw-test-spec核对选择器、分支方向与报告范围；Issue检查失败不能通过扩大到全量来兜底。全量仅限dev→main，且必须真实运行。CI镜像、Action及包依赖采用公司内部缓存；源缺失/认证失败时报告具体配置，不改公网源或在测试job重新下载整套工具链。自然语言规则仍由审查/人工验收验证，不用文案关键词断言。
