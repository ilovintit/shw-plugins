# 项目目录与 Workflow 公共模板

## 标准项目骨架

```text
src/                         # 自研服务和客户端
packages/                    # 可选，仅项目自身共享包
tests/ci/                    # 工程范围识别、CI 契约和隔离入口
tests/regression/            # 无既有约定时的 API/E2E/VRT 与 manifest
tools/                       # 项目工具
deploy/                      # 部署、Fleet 和小程序声明
docs/prd/                    # 产品真相
docs/design/                 # 原型真相
docs/architecture/           # 架构真相
docs/journal/                # 过程记录
.gitea/workflows/            # 薄 workflow 编排
.gitea/scripts/              # CI 辅助脚本
.shw/project.yaml            # 服务、工程检查、回归和环境声明
AGENTS.md
```

优先保留项目既有 tests 结构；没有约定时才使用 `tests/regression/` 与 `baseline-manifest.json`。公共包通过私有 npm/Go 源按版本引用。`spec/`、`specs/` 不是标准目录，迁移前必须盘点有效事实。

## 三条严格分离的 CI 路径

1. **工程检查**：`pr-gate.yml` 服务 Issue→dev 和 dev→main，运行构建、lint/typecheck、适用单元/协议/安全检查及来源校验；required context 只来自此路径。Issue 范围未知时失败并补映射，不全仓兜底。
2. **已有基线比较**：dev commit 的对应目标就绪后，`regression-report.yml` 自动或显式比较全部已建立且适用的 API/E2E/VRT 基线。它是独立、非阻断、通常使用 `ci-heavy` 的报告工作流；不挂 PR required、release gate 或等待条件。无基线、差异、执行错误和目标漂移都如实产出状态/工件，workflow 汇总可完成但不得把业务结果统一改写为通过。
3. **基线维护**：`baseline-maintenance.yml` 只接受 `/baseline` 产生的独立维护 Issue 上下文、不可变 accepted source、最终人工验收引用与 create/sync 范围。普通 push/PR、回归失败或 release workflow 均无写权限。生成候选、人工范围审查、同目标复跑后才提交基线 PR。

`fleet-*.yml`、小程序发布与 tag 发布继续独立。main/tag 在工程、来源、版本和制品检查后发布，不重复或等待 API/E2E/VRT。旧 `release-gate`/聚合 job 中混入的三类测试先拆出；移除 job 时同时核对分支保护 required contexts，避免永久 pending。

H5 与每种小程序分别登记源码、构建影响范围、产物及验收入口；CI 不以 Taro 双端编译或固定 `dist/weapp` 为新项目模板。微信上传工具只消费准确微信产物，其他小程序需按其平台另定发布流程；iOS/Android/鸿蒙 App 不使用微信上传 job。

## 回归报告契约

报告必须记录 candidate SHA、实际目标 revision/制品、baseline ID/revision、full/partial 范围、环境、状态与工件。状态至少包含 unchanged、changed、expected-change-pending-acceptance、suspected-regression、unbaselined、execution-error、obsolete-target、partial。共享 dev 已部署更晚版本时拒绝给旧 SHA 出结果。

回归 job 不得写 tests、删除断言、重录 expected 或自动提交。API 断言差异、E2E trace/日志和 VRT expected/actual/diff 使用 [Gitea artifact 兼容镜像](../../shw-test-spec/references/ci-config.md#actions-artifact-兼容镜像) 固定 SHA；上传后必须能经 Gitea API/MCP 枚举和下载。

## 小程序环境映射

`dev` 始终用于本地开发者工具调试。无 test 环境时体验版使用 dev；有 test 环境时体验版使用 test；main/tag 对应正式版。上传绑定准确 Source SHA，私钥只由 Gitea Secret 临时注入；上传不等于审核、正式发布或最终人工验收。

## CI 依赖与防回退

工程/发布使用 `ci-fast`，重型回归与基线生成/复跑使用 `ci-heavy`。CI 使用固定内部执行镜像、私有 npm/Go 源和内部 Action；凭据只来自 Gitea Secret，用完清理，不写入仓库、镜像、测试基线或日志。
