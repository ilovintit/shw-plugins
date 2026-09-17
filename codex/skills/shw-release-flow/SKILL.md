---
name: shw-release-flow
description: 发布、Fleet 部署观测、最终人工验收与版本关闭机制；API/E2E/VRT 回归不作为发布门禁。
---

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

# 发布与生产收口

## 模式前置

本 Skill 不是所有项目的默认约束。先读取仓库根 `.shw/project.yaml` 的模式：无标识时不主动应用；`issue-main` 只保留 Issue 分支→main 的轻量闭环；`issue-dev` 只保留 Issue 分支→dev→main 的轻量闭环；只有 `managed` 才应用本 Skill 中的业务项目目录、分支、测试、发布、部署或公司规范要求。模式定义见 `shw-issue-gate/project-mode.md`。

## 权限模型

```text
Agent：核验证据、创建 dev→main PR、打 tag、查 CI/Fleet/K8s
用户：在 Web UI 合并 main、裁决生产是否可关闭
Fleet：从项目仓库拉取声明并写 Kubernetes
基础设施 Agent：用 Ansible 维护 Rancher/Fleet/MCP 等基础设施
```

main 合并权不授予项目 Agent。项目 Agent 不持有 kubeconfig/Rancher Token，也不调用 Ansible。

## 放行

版本全部 Issue 进入 dev、各 Issue 适用工程 CI 绿、用户完成 dev 人工测试，并完成本次适用发布审查后，Agent 创建 dev→main PR并停止。用户合并后，Agent 重新取证 main HEAD 与发布 PR 的工程/来源检查，再打 tag并观察发布 CI。

dev→main PR 对当前候选运行适用工程、来源与发布检查；API/E2E/VRT 不在其中，也不因失败、未完成或测试维护滞后进入“例外合并”债务。此前 Issue 或其他 PR 的结果不能替代当前候选检查；同一发布 PR 的纯历史同步只能按 `shw-test-spec/references/history-sync.md` 复用工程证据。Agent 不得代为合并、跳过、取消或伪造检查。人工测试决定是否提交 main，发布后的最终人工验收决定哪些行为可由 `/baseline` 固化。

## 发布基准与产品形态

- 首次发布：经远端确认没有稳定发布 tag，记录 `first-release`、candidate SHA，以空 Git tree 到候选的全量差异审查；不伪造历史 tag/workflow。
- 已有发布：选择已成功分发的最近稳定发布版本，记录远端 tag、commit 与发布工作流证据。只排序 tag 不足以证明成功发布；最高 tag 的流水线失败时先明确其处置。
- 审查、修复、人工验收、放行 PR 固定同一 candidate SHA；候选变化后重验受影响范围并重跑审查，不沿用旧放行。
- Kubernetes 应用：制品是镜像，部署证据来自项目 deploy/Fleet/工作负载。
- 插件、库、CLI：制品是包或发布仓库；部署阶段核验分发内容、版本、安装/升级与宿主使用结果，Harbor/Fleet 标记不适用及原因。不得为满足流程创建不存在的服务。

## 发布前本地跨供应商对抗审查

- 每次发布阶段 A 都必须询问用户本次是否需要双模型 review，默认选择为**跳过**。只有用户对本次候选明确回答“要”或等价肯定表达时才执行；回答“不”、等价否定表达或未明确选择时均跳过，不得因历史偏好或已有 profile 自动启动。
- 跳过时记录本次用户裁决与 candidate SHA，然后继续其余放行流程；不得把“跳过”表述为已完成审查或审查通过。用户以后手动安排的 GLM、Claude Code 或其他 review 可作为附加证据，但不自动改写本次双模型选择。
- 用户明确选择执行时，发布前审查分别由 **GLM-5.3** 与 **Kimi-K3** 执行；不得由实施者 GPT 单独给出放行结论，也不得以同一模型换角色替代两路审查。
- 两路审查都按上节的已有发布/首次发布基准覆盖候选的完整差异、Version/Issue验收、迁移、已知风险、回滚和发布链；各自独立产出发现项与严重性。
- 审查仅在本机执行。不得进入 CI、建设仓库 runner、提交供应商凭证、本机 profile 或原始审查报告。
- 各宿主 Agent工具自行通过自身的 provider/profile 与本地调度机制调用上述模型；共享工作流不假设某一工具的命令、profile 名或并发方式。
- 用户选择执行且实际审查启动后，先读取宿主产生的运行时会话头/结构化元数据，分别核验实际模型为 GLM-5.3 与 Kimi-K3，记录 provider 标识、实际 model、会话关联号和 candidate SHA。profile 名、启动参数或模型在正文中自称身份都不能替代运行时证据；代理/别名必须有已核实的模型映射，不能仅据代理名称推断供应商。
- 运行时元数据缺失、与预期不符、静默回退到同一模型或报告不能对应本次候选时停止放行；不为补证修改用户配置。按项目外边界交用户处理模型路由，随后重新执行两路审查。放行 PR 只记脱敏身份与结论，不带端点/凭据或原始日志。
- 两份报告必须保留在受控本地证据中；放行 PR只摘要记录范围、发现、处置与复核结论，不复制凭证或敏感原文。任一路没有结果、执行失败或存在未清零阻断项，都必须停止放行，不得回退为单模型审查。

## 部署

仅对 Kubernetes 应用，项目仓库的 `deploy/` 是部署声明真相；各 Rancher Fleet 监控相应仓库/分支/路径。部署命令只经统一多集群只读 MCP 观察期望 revision、Bundle、工作负载、Events、日志和健康信号。任何写操作交 Fleet、用户或基础设施 Agent。

## 三层证据

1. 发布：main commit 与 tag 指向正确候选。
2. 制品：发布 CI 成功，镜像/包真实存在且 digest 可核对。
3. 部署/分发：Kubernetes 应用验证 Fleet revision、工作负载 digest 与健康；插件/库/CLI 验证真实包内容、版本、安装/升级和使用验收。

三层不得互相替代。

## 关闭

最终人工验收与生产验证通过、阻断 Bug 清零、非阻断项有归属且用户确认后，才关闭 Milestone。基线已维护则记录 baseline ID/PR；尚未维护则建立独立 Issue、范围和责任并如实标记未受保护，不因基线缺失推翻验收或回开历史版本。tag、部署、回归报告或观察时间到期都不会自动关闭。

## 开发与测试环境

Kubernetes 应用必须加载 [环境与开发部署契约](references/environments.md)。Issue PR 工程门禁合入 dev 后自动部署变化的 API/Web，并在目标 revision 就绪后独立比较已有基线；该报告非阻断。dev/test 观测按分支 revision，不以生产 tag 为前置；main 保持工程/发布检查与用户人工合并。

## 微信小程序发布工具

发布模板遵循 `shw-gitea-ci/references/project-template.md`：`dev` 始终供本地开发者工具调试；无 test 环境时 uploader channels、workflow branches 和 job if 统一为 dev/main，dev 同时发布体验版；有 test 环境时三处统一为 test/main，由 test 发布体验版，main/tag 发布正式版。两种模式不能混用。main/tag 完成工程、来源、版本和制品校验后发布，不等待 API/E2E/VRT。

微信小程序入口必须加载 [插件自包含上传契约](references/miniprogram/README.md)。新接入项目使用插件维护的shw-ci-wechat固定镜像和workflow模板，不依赖原library/we-chat-ci；每个真实入口独立配置AppID/路径/Secret。编译、预检、上传由固定程序契约衔接，上传不等于审核或正式发布；dev本地调试不变。

## GitOps 发布工具

Kubernetes 应用的 CI 发布使用 [固定 GitOps 程序](references/gitops/README.md)：精确源码 SHA、完整镜像记录、完整声明与普通 fleet/* 提交由统一 CLI 实现。项目只维护配置和构建入口，固定已验证镜像 digest；发布程序不操作 Kubernetes，生产放行与部署就绪证据仍按本 Skill。
