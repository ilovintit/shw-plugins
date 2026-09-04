---
name: shw-gitea-ci
description: 使用官方 gitea-mcp 查询 PR status、Actions run/job/log，重试失败运行并按权限合并；work/roadmap/release/deploy 的 CI 证据与红绿循环使用。
---

# Gitea CI 取证

配置方式见 `config.md`，不得把真实 token 写入仓库、日志或回复。

## 证据顺序

1. 读取 PR，取得当前 head SHA。
2. 读取该 SHA 的 commit status 与对应 workflow run。
3. 读取每个 required job；失败时读取真实日志，不根据 job 名猜原因。
4. 修复后确认新 run 对应最新 SHA，旧 run 不能证明当前代码。
5. 全部 required checks success 才能宣称 CI 绿。

## 合并权限

- 目标 dev：`/work` 或 `/roadmap` 可在 CI 全绿后合并并删除分支。
- 目标 main：永远不调用合并 API；只报告 PR URL 和状态，等用户 Web UI 合并。
- Hotfix 即使紧急也遵守 main 人工合并。

## 发布证据

区分源 tag、发布 CI、Harbor/发布制品和生产部署。任一层成功不能替代其他层。

严禁 force merge、跳过 checks、根据一次陈旧 `merged` 字段下结论，或在日志中回显 Actions secrets。
