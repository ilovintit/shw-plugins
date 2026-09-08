---
name: shw-release-flow
description: 发布、Fleet 部署观测与版本关闭公共机制。统一 dev 验收放行、dev→main PR、用户合并、tag/CI、只读部署证据和生产收口；用于 release/deploy/version-close。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# 发布与生产收口

## 权限模型

```text
Agent：核验证据、创建 dev→main PR、打 tag、查 CI/Fleet/K8s
用户：在 Web UI 合并 main、裁决生产是否可关闭
Fleet：从项目仓库拉取声明并写 Kubernetes
基础设施 Agent：用 Ansible 维护 Rancher/Fleet/MCP 等基础设施
```

main 合并权不授予项目 Agent。项目 Agent 不持有 kubeconfig/Rancher Token，也不调用 Ansible。

## 放行

版本全部 Issue 进入 dev、CI 绿、dev 人工验收通过、终审阻断清零后，Agent 创建 dev→main PR并停止。用户合并后，Agent 重新取证 main HEAD，再打 tag并观察发布 CI。

发布放行必须在dev→main PR对当前候选实际执行全量门禁。此前Issue定向测试和旧全量结果都不能替代；同tree也不跳过。其他分支方向按shw-test-spec运行关联模块/文件，真实Hotfix/冲突内容先整合后验证。独立发布审查与人工验收仍保留。

## 发布基准与产品形态

- 首次发布：经远端确认没有稳定发布 tag，记录 `first-release`、candidate SHA，以空 Git tree 到候选的全量差异审查；不伪造历史 tag/workflow。
- 已有发布：选择已成功分发的最近稳定发布版本，记录远端 tag、commit 与发布工作流证据。只排序 tag 不足以证明成功发布；最高 tag 的流水线失败时先明确其处置。
- 审查、修复、人工验收、放行 PR 固定同一 candidate SHA；候选变化后重验受影响范围并重跑审查，不沿用旧放行。
- Kubernetes 应用：制品是镜像，部署证据来自项目 deploy/Fleet/工作负载。
- 插件、库、CLI：制品是包或发布仓库；部署阶段核验分发内容、版本、安装/升级与宿主使用结果，Harbor/Fleet 标记不适用及原因。不得为满足流程创建不存在的服务。

## 发布前本地跨供应商对抗审查

- 实施由 GPT 完成时，发布前审查必须分别由 **GLM-5.3** 与 **Kimi-K3** 执行；不得由实施者 GPT 单独给出放行结论，也不得以同一模型换角色替代两路审查。
- 两路审查都按上节的已有发布/首次发布基准覆盖候选的完整差异、Version/Issue验收、迁移、已知风险、回滚和发布链；各自独立产出发现项与严重性。
- 审查仅在本机执行。不得进入 CI、建设仓库 runner、提交供应商凭证、本机 profile 或原始审查报告。
- 各宿主 Agent工具自行通过自身的 provider/profile 与本地调度机制调用上述模型；共享工作流不假设某一工具的命令、profile 名或并发方式。
- 两份报告必须保留在受控本地证据中；放行 PR只摘要记录范围、发现、处置与复核结论，不复制凭证或敏感原文。任一路没有结果、执行失败或存在未清零阻断项，都必须停止放行，不得回退为单模型审查。

## 部署

仅对 Kubernetes 应用，项目仓库的 `deploy/` 是部署声明真相；各 Rancher Fleet 监控相应仓库/分支/路径。部署命令只经统一多集群只读 MCP 观察期望 revision、Bundle、工作负载、Events、日志和健康信号。任何写操作交 Fleet、用户或基础设施 Agent。

## 三层证据

1. 发布：main commit 与 tag 指向正确候选。
2. 制品：发布 CI 成功，镜像/包真实存在且 digest 可核对。
3. 部署/分发：Kubernetes 应用验证 Fleet revision、工作负载 digest 与健康；插件/库/CLI 验证真实包内容、版本、安装/升级和使用验收。

三层不得互相替代。

## 关闭

生产验证通过、阻断 Bug 清零、非阻断项有归属且用户确认后，才关闭 Milestone。tag、部署或观察时间到期都不会自动关闭。
