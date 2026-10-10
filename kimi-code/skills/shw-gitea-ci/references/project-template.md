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
docs/architecture/           # 架构真相
docs/journal/                # 过程记录
.gitea/workflows/            # 薄 workflow 编排
.gitea/scripts/              # CI 辅助脚本
.shw/project.yaml            # 服务、工程检查、回归和环境声明
AGENTS.md
```

优先保留项目既有 tests 结构；没有约定时才使用 `tests/regression/` 与 `baseline-manifest.json`。公共包通过私有 npm/Go 源按版本引用。`spec/`、`specs/` 不是标准目录，迁移前必须盘点有效事实。

## 构建、集成、发布与独立测试

1. **开发交付**：完成必要构建，记录源码、制品和部署结果，不运行测试。未体验或未验收如实记录，用户可在发布后实际体验。
2. **集成**：`integration.yml` 记录 dev→main 的来源 dev SHA、PR HEAD、main 基点、预合并与实际合并 tree，按授权正常 merge。不运行单元、API、E2E、VRT、冒烟或回归，不自动晋升基线。
3. **发布/部署**：tag 或明确审批选择授权的 main 提交和可追溯 digest，记录部署声明与运行状态。无测试不阻挡已授权发布，不把每次 main push 自动当作生产发布。
4. **独立测试**：仅用户明确主动要求时在独立 `test` 分支执行；push test 不算请求。测试 workflow 仅 `workflow_dispatch`，并守卫 ref 为 `refs/heads/test`；记录请求、指定来源与 suite，不默认 test→main。基线维护独立进行，不自动合并或阻挡发布。

既有业务 CI/Fleet、required contexts 和分支保护需该项目另行授权迁移；本插件更新不等于已改消费方。不得伪造测试成功或撤保护强合，服务端仍要求旧测试时报告真实冲突。

H5 与每种小程序分别登记源码、构建影响范围、产物及验收入口；CI 不以 Taro 双端编译或固定 `dist/weapp` 为新项目模板。微信上传工具只消费准确微信产物，其他小程序需按其平台另定发布流程；iOS/Android/鸿蒙 App 不使用微信上传 job。

## 独立测试报告契约

报告必须记录 candidate SHA、实际目标 revision/制品、baseline ID/revision、full/partial 范围、环境、状态与工件。状态至少包含 unchanged、changed、expected-change-pending-acceptance、suspected-regression、unbaselined、execution-error、obsolete-target、partial。共享 dev 已部署更晚版本时拒绝给旧 SHA 出结果。

比较 job 只产出报告；基线仅在独立 test 分支或另行授权维护区按明确范围更新，复跑仍须在主动请求范围内手动执行。API 断言差异、E2E trace/日志和 VRT expected/actual/diff 使用 [Gitea artifact 兼容镜像](../../shw-test-spec/references/ci-config.md#actions-artifact-兼容镜像) 固定 SHA；上传后必须能经 Gitea API/MCP 枚举和下载。

## 小程序环境映射

`dev` 始终用于本地开发者工具调试。无 test 环境时体验版使用 dev；有 test 环境时体验版使用 test；main/tag 对应正式版。上传绑定准确 Source SHA，私钥只由 Gitea Secret 临时注入；上传不等于审核、正式发布或最终人工验收。

## CI 依赖与防回退

必要构建/发布及集成来源记录使用 `ci-fast`；用户主动要求的独立测试按实际负载选择 `ci-fast` 或 `ci-heavy`。CI 使用固定内部执行镜像、私有 npm/Go 源和内部 Action；凭据只来自 Gitea Secret，用完清理，不写入仓库、镜像、测试基线或日志。

项目配置字段与默认值见 `shw-workspace/references/project-settings.md`；schema只保存真实配置引用，不保存凭据。
