---
description: 最终人工验收后，为不可变版本创建或同步 API、E2E、VRT 回归基线并提交独立维护 PR。
argument-hint: <Version|tag|SHA> <create|sync> [accepted scope]
---

# /shw-baseline

加载 `shw-issue-gate`、`shw-test-spec`、`shw-gitea-flow`、`shw-worktree`、`shw-pr-review`、`shw-gitea-ci` 和 `shw-verify`。

**参数**：`<Version|tag|SHA> <create|sync> [accepted scope]`

这是最终人工验收后的显式基线维护入口，不是功能验证、回归失败后的自动重录或发布门禁。先解析到不可变 `acceptedSourceSha`，读取发布制品/部署 revision、最终人工验收证据与已确认范围；仅有 dev 测试、main 合并、发布成功或健康检查时必须停止。已有明确确认可直接引用，不重复询问。

1. 按 `shw-test-spec` 读取现有基线与来源清单。`create` 只建立已验收范围；`sync` 只修改本次明确获准变化及必要关联场景，未变范围沿用旧基线。
2. 创建或复用一个独立 chore Issue，引用 Version、发布/tag、功能 Issue、验收证据、accepted source 与范围。该 Issue/分支/PR 只含测试、fixture、expected 与基线元数据，不夹业务修复。
3. 经 Worktree MCP 从最新 `origin/dev` 取得受管工作区。生成和复跑必须面向已验收的 source 对应隔离环境或制品；共享目标已漂移时记为 `obsolete-target` 并停止，不能用 B 的服务给 A 生成证据。
4. 生成候选后逐项审查 API 业务断言、E2E 用户流程、VRT 页面/视口及规范化边界，排除凭据、隐私数据和无关变化。回归失败、环境错误或未计划差异不得触发更新、放宽阈值或覆盖 expected。
5. 在同一不可变目标与受控数据上复跑，证明记录稳定；复跑不重新证明产品正确性。记录生成 run、复跑 run、工具/环境/fixture 版本与工件。
6. 提交普通 `dev` 目标 PR，按当前 PR 的适用工程检查与基线复跑证据收口；不得改写历史 tag、自动合并 main 或触发业务发布循环。
7. 回写基线 Issue、原 Version/验收记录与 manifest，明确已保护、未覆盖、partial、legacy-unverified 和遗留维护范围。

缺少最终人工验收、不可变 source、可复现目标、受控数据或明确范围时，只报告缺口，不创建或同步基线。
