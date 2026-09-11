---
name: release
description: "Codex prompt workflow for release、/release. 统一版本发布入口——核验 dev 候选与人工验收，创建 dev→main PR；用户 Web UI 合并后续跑以打 tag 并验证发布流水线。 Use only when the user explicitly asks for this named workflow."
---

# release

这是共享源码中 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `release`、`/release` 或要求执行该工作流时按下方原文执行。

**参数**：<Version 或 Milestone>

**项目外只读**：仅可修改当前项目已确认的工作目录（交付时为当前 Issue worktree）；外部路径禁止直接或间接写入。需要修改时先停止，报告路径、原因和拟修改内容，请用户介入并交其他获授权 Agent 或用户手动处理。完整边界及有限运行例外见 `shw-issue-gate`，执行前必须读取。

执行前加载 `shw-release-flow`、`shw-acceptance`、`shw-gitea-flow`、`shw-gitea-ci` 和 `shw-verify`。本命令吸收旧 release prepare/approve 和独立终审入口，但不取得 main 合并权。

## 可恢复的两阶段流程

### 阶段 A：放行 PR

1. 核验 Version/Milestone 范围、全部 Issue/PR、CI、迁移、已知问题、回滚方案和文档同步情况。
2. 收集用户已经完成 dev 整体验收的事实与证据；未验收或失败时停止，失败项经 `/bug` 回流。
3. 按 `shw-release-flow` 确定已有发布或 first-release 基准并固定候选，然后明确询问用户本次是否需要双模型 review，默认跳过。用户回答“不”或未明确肯定时，记录跳过裁决与 candidate SHA 后继续；不得宣称 review 已通过。只有用户明确回答“要”时，才在**本机**分别以 GLM-5.3 与 Kimi-K3 执行现有两路独立对抗审查；实施者 GPT 不得单独充当审查结论。宿主 Agent工具自行通过其 provider/profile 和本地调度机制完成两路审查，不进入 CI、不建设仓库 runner、也不提交本机凭证或 profile。按 shw-release-flow 核对本次两路运行时 model/provider 身份与候选关联；profile 名或正文自称不构成证据。两份报告都必须保留；全部阻断项清零、非阻断项有明确处置后才能继续。
4. 创建唯一 dev→main 放行 PR，正文列出版本范围、Issue、镜像/迁移、风险、回滚和验收证据；确认该 PR 已触发当前候选的全量自动化检查。
5. 停止并明确提示用户在 Gitea Web UI 审查和手动合并，同时报告全量检查的实时/最终状态。检查失败、未完成或测试用例维护滞后不剥夺用户的合并决定权；用户可基于紧急性或已完成人工验证直接合并。Agent 不调用 main 合并 API，也不跳过、取消或伪造检查。

### 阶段 B：合并后发布

用户合并后再次运行同一命令：

1. 验证 PR 确已合并，main HEAD 与批准的候选 commit 对齐；不采信口头状态。读取该候选全量自动化的真实结果；若非成功，确认这是用户 Web UI 的例外合并，并记录失败/未完成项、人工验证依据、原因、风险、回滚和未修测试的后续归属，不得写成 CI 通过。
2. 在 main 合并提交创建并推送版本 tag；若 token 无 tag 权限，输出精确人工操作而不伪造完成。
3. 跟踪发布 CI，分别核验源 tag、CI job、Harbor/发布制品等证据。
4. 输出发布事实并指向 `/deploy`；不把 tag 或镜像存在等同于生产部署完成。

## 权限底线

main 在任何模式下都只能由用户合并；不得请求为 Agent Token 增加 main 合并权限，也不得用 push、force 或变更保护规则绕过。

微信小程序制品使用 shw-release-flow/references/miniprogram/README.md 的插件自包含上传工具。核对本次源码、编译产物指纹、上传版本与目标AppID；SDK上传仅为代码上传，体验选择、审核和正式发布按用户授权办理，不能自动外推。

## Codex 本机跨供应商对抗审查

阶段 A 的第 3 步先由父任务询问用户本次是否需要双模型 review，默认跳过。用户回答“不”或没有明确肯定时，不启动下列 CLI，记录裁决与 candidate SHA 后继续。只有用户明确回答“要”时，父任务才在本机并发启动两个只读 Codex CLI 子智能体。它们不是 Codex 原生 child task：后者会继承 GPT，无法保证供应商独立性。

### 1. 固定候选

审查前从当前本机 dev 工作区固定候选，并确认工作区干净且 HEAD 等于 origin/dev：
父任务执行 git fetch origin dev 与 git fetch origin --tags，读取分支、工作区状态、HEAD、origin/dev；经 git ls-remote --exit-code --tags --refs origin 核对远端发布记录（退出码 2 仅表示无匹配 ref，可进入首发判定；网络/鉴权失败必须停止，不能当作空 tag）：已有稳定 tag 时，按 shw-release-flow 选择发布 workflow 成功的基准并记录 base tag；远端没有任何稳定 tag 时记录 first-release，以 git hash-object -w -t tree /dev/null 得到空 tree 作为 base。两种路径均要求分支为 dev、工作区干净且 HEAD 与 origin/dev相同才记录 candidate SHA。不得用最近祖先 tag或仅本地 tag表推断发布基准，因为 main 放行 merge commit 可能不是 dev 的祖先。
候选校验失败时停止；不得从 feature、roadmap 或落后 dev 的 worktree 审查。两个子智能体都必须收到同一组 candidate SHA 与 base（已发布 tag 或首发空 tree），首次发布不得假造历史 workflow。
父任务用两个本机终端或 CLI session 并发启动下列命令，先让两者都开始再等待任一结果；不得串行等待第一条完成：

```bash
codex --profile release-adversary-glm --sandbox read-only --cd <candidate-root> exec "作为 GLM-5.3 发布对抗审查子智能体，只读审查候选 <candidate-sha> 相对 <base> 的完整差异。运行 git diff <base> <candidate-sha>，并独立核对 Version/Issue验收、迁移、已知风险、回滚、发布链和跨工具产物隔离。不得修改文件；只输出可复现的 P0/P1/P2 发现及文件证据。"
codex --profile release-adversary-kimi --sandbox read-only --cd <candidate-root> exec "作为 Kimi-K3 发布对抗审查子智能体，只读审查候选 <candidate-sha> 相对 <base> 的完整差异。运行 git diff <base> <candidate-sha>，并独立核对 Version/Issue验收、迁移、已知风险、回滚、发布链和跨工具产物隔离。不得修改文件；只输出可复现的 P0/P1/P2 发现及文件证据。"
```

- 两条 CLI 启动后，父任务先检查各自运行时头部或结构化会话元数据的 model/provider；GLM 路必须实际回显 GLM-5.3，Kimi 路必须实际回显 Kimi-K3。保留 session 关联号与同一 candidate SHA；别名只能使用已核实映射。命令行 profile 名及报告中的“我是某模型”均不是证明。任一路缺运行时身份、模型不符或回退到同一模型，立即停止放行并交用户修正本机路由，不能用旧会话头补证。
- 这两个 profile 分别固定为 GLM-5.3 与 Kimi-K3；它们是当前 GPT 实施者之外的独立审查者。默认持久 CLI session 是两份受控本机报告证据；profile 与供应商凭证只存在用户本机，插件、仓库、CI和 PR不得写入或分发它们。
- 父任务只负责固定候选、并发调度、等待两份完成报告并收敛结果；在放行 PR正文只汇总审查范围、发现项、严重性、修复或接受理由和复核结论。
- 这是本机 shell 调用，不进入 CI，也不建设仓库 runner。profile不存在、调用失败、缺少任何一份报告或存在未清零阻断项时，停止放行；不得用当前 GPT、同一供应商或同一模型回退代替。

## Codex 临时 fork 任务收尾

如果本命令通过 Codex 原生 fork/create task 建立了临时子任务，主任务在收集结果并完成独立验证后，必须逐个检查状态，并使用 Codex 原生任务归档能力归档本次命令创建且已经完成或明确不再需要的临时任务。不得归档仍在运行、等待用户输入、需要关注或由用户独立创建的任务；任务归档与 Git worktree 清理是两件事，不得用删除 worktree 代替归档任务。
