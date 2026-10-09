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

## 三条严格分离的 CI 路径

1. **体验交付**：开发阶段必须执行类型检查、适用 lint/静态检查及本次改动涉及的单元与单模块 API 快速测试；全量 E2E、VRT、全量 API 等长周期回归集中到 dev→main 集成。必要构建、部署正常执行，tag 不新增测试阶段；检查通过不能代替人工验收。
2. **集成**：`integration.yml` 仅服务已冻结候选的dev→main集成PR。使用 `shw-integration/references/candidate.md` 的候选记录，执行适用工程及API/E2E/VRT，分类差异、按范围更新同PR候选基线并重跑。集成分支源自冻结dev，基线更改不写dev；main、PR HEAD或基线漂移重新计算检查。成功正常merge并验证tree/父提交后晋升正式基线。
3. **发布**：tag/审批选择已通过集成的main提交及可追溯digest，优先复用已验证制品；不重复测试，不把每次main push自动当生产发布。既有业务CI/Fleet需该项目另行授权迁移。

修改 workflow 须同步核对 required contexts，不能撤保护或伪造结果强合。轻量 issue-main 仍执行类型检查和受影响模块快速测试；长周期回归需要按项目明确的集成流程安排，不因缺少 dev 而禁止快速检查。

H5 与每种小程序分别登记源码、构建影响范围、产物及验收入口；CI 不以 Taro 双端编译或固定 `dist/weapp` 为新项目模板。微信上传工具只消费准确微信产物，其他小程序需按其平台另定发布流程；iOS/Android/鸿蒙 App 不使用微信上传 job。

## 集成回归报告契约

报告必须记录 candidate SHA、实际目标 revision/制品、baseline ID/revision、full/partial 范围、环境、状态与工件。状态至少包含 unchanged、changed、expected-change-pending-acceptance、suspected-regression、unbaselined、execution-error、obsolete-target、partial。共享 dev 已部署更晚版本时拒绝给旧 SHA 出结果。

比较job只产出报告；候选基线写入仅由同集成PR的显式范围更新步骤执行并重跑，不直接写正式基线。API 断言差异、E2E trace/日志和 VRT expected/actual/diff 使用 [Gitea artifact 兼容镜像](../../shw-test-spec/references/ci-config.md#actions-artifact-兼容镜像) 固定 SHA；上传后必须能经 Gitea API/MCP 枚举和下载。

## 小程序环境映射

`dev` 始终用于本地开发者工具调试。无 test 环境时体验版使用 dev；有 test 环境时体验版使用 test；main/tag 对应正式版。上传绑定准确 Source SHA，私钥只由 Gitea Secret 临时注入；上传不等于审核、正式发布或最终人工验收。

## CI 依赖与防回退

体验构建/发布及集成轻量检查使用 `ci-fast`；仅集成中的重型回归与候选基线复跑使用 `ci-heavy`。CI 使用固定内部执行镜像、私有 npm/Go 源和内部 Action；凭据只来自 Gitea Secret，用完清理，不写入仓库、镜像、测试基线或日志。

项目配置字段与默认值见 `shw-workspace/references/project-settings.md`；schema只保存真实配置引用，不保存凭据。
