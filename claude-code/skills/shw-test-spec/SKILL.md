---
name: shw-test-spec
description: 人工验收后的 API、E2E、VRT 回归基线规范；分离已有基线比较与显式基线维护，保留独立工程检查。
---

**项目外只读**：仅修改当前 Issue 工作区；完整适用范围与边界见 `shw-issue-gate`，执行前必须读取。缓存、镜像、Action 与目标环境仍按已有授权处理，不编辑其他仓库或用户配置，不直接写 Kubernetes。

# 人工验收后的回归基线

## 定位

功能正确性由用户人工验收决定。API/E2E/VRT 只固化已经最终确认的行为，保护后续改动不意外破坏它们；三类测试不是开发前置、功能验证、Issue→dev 门禁、dev→main 发布门禁或 tag 发布门禁。

开发前不要求三类用例、自动化映射、CI RED 或截图基线；功能 Issue 不与后续基线维护 Issue/PR 强绑。构建、类型检查、静态检查、适用单元/协议/安全测试、代码审查、制品来源和部署健康仍按真实目的独立执行，不能把业务三类测试改名后继续设门禁。

## 两条独立路径

### 已有基线比较：只读、非阻断

- 代码合入 dev 且该 commit 对应目标就绪后，由独立回归入口比较全部已建立且适用的基线；无部署产品使用对应构建制品。
- 无基线报告 `unbaselined`，不阻断开发或发布，也不假报通过。报告不得写基线、删除断言、重录 expected 或自动提交。
- 结果不进入 PR required checks、发布聚合或等待条件，但必须真实保留差异和执行失败；不得用统一成功退出或 `continue-on-error` 抹平报告状态。
- 自动完整比较只允许在独立回归入口；模块/文件选择器供诊断和人工定向运行。报告必须区分 full/partial 与跳过原因。
- 候选 SHA、目标 revision/制品不一致时报告 `obsolete-target` 并跳过或重新调度，不能拿移动的 dev/main 或错误环境冒充候选证据。

### 基线维护：最终人工验收后显式执行

- 仅 `/shw-baseline <Version|tag|SHA> <create|sync>` 可进入写路径，并绑定不可变 `acceptedSourceSha`、发布制品/部署 revision、最终人工验收证据与 accepted scope。
- dev 测试、main 合并、发布成功和健康检查均不能替代最终人工验收。已有明确确认可引用；缺确认时停止写入并说明缺项。
- `create` 覆盖首次确认范围；`sync` 只更新本次明确获准变化及必要关联场景。未变范围沿用旧基线，未计划差异进入调查。
- 在对应版本的隔离环境/制品与受控数据上生成候选，审查后同目标复跑稳定性，再以独立 chore Issue、受管 worktree 和普通 dev PR 交付。基线 PR 只含测试/fixture/expected/元数据，不夹业务修复。
- 回归失败、执行错误或差异出现本身都不授权重录；不得为变绿放宽阈值、删断言或整体 actual 覆盖 expected。

## 状态与证据

报告至少区分 `unchanged`、`changed`、`expected-change-pending-acceptance`、`suspected-regression`、`unbaselined`、`execution-error`、`obsolete-target` 和 `partial`。预期/意外分类必须引用本次 Issue 与确认范围，不能因代码已改就认定预期。

每份报告记录候选 SHA、目标 revision/制品、基线 ID/revision、full/partial 范围、环境、run/job 与工件。API 提供断言差异，E2E 提供 trace/日志，VRT 提供 expected/actual/diff；环境失败与行为差异分开。artifact 使用当前 Gitea 兼容 Action 与内部不可变 SHA，上传后必须可枚举和下载。

## 基线表达与存储

- API 固化接口契约、权限、业务结果与状态变化，不只录 HTTP 200，也不无差别保存整个响应。
- E2E 固化已确认用户流程、角色、关键操作、跳转与结果，记录起止状态和重置方式。
- VRT 固化已确认页面/组件、视口和外观，固定或记录浏览器、字体、时区、分辨率、数据、动画和就绪条件。
- 动态 ID、时间、随机值和非语义顺序可规范化；金额、权限、状态等真实业务变化不得被掩盖。

优先复用项目既有 tests 结构；无约定时使用 `tests/regression/` 与 `tests/regression/baseline-manifest.json`。manifest 至少记录 schemaVersion、baselineId/revision、acceptedSourceSha、releaseTag/制品/部署标识、acceptanceEvidence、acceptedScope/At、coveredCases、三类文件摘要、环境/工具/fixture 版本、变更原因、生成/复跑 run 和维护 Issue/PR。禁止保存凭据、隐私数据或敏感响应。

选择与报告例见 [execution.md](references/execution.md)，工程/回归/基线 CI 编排见 `shw-gitea-ci/references/project-template.md`，依赖与 artifact 固定规则见 [ci-config.md](references/ci-config.md)。

## 迁移与历史

已有测试和图片先保留，解除开发/发布前置后按真实来源分类；来源不明标为 `legacy-unverified`，不自动删除、覆盖或声称已人工确认。旧 required contexts 必须与 workflow job 一并清理，混合 job 先拆出工程检查。历史成功/失败保持原意。
