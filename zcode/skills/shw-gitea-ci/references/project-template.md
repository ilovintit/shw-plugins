# 项目目录与 Workflow 公共模板

## 标准项目骨架

新项目默认采用以下结构：

```text
src/                         # 自研服务和客户端
packages/                    # 可选，仅项目自身共享包
tests/ci/                    # 范围识别、CI 契约和隔离入口
tests/e2e/                   # E2E 入口与用例
tests/vrt/                   # VRT 入口、基线和用例
tools/                       # 项目工具
deploy/                      # 部署、Fleet 和小程序声明
docs/prd/                    # 产品真相
docs/design/                 # 原型真相
docs/architecture/           # 架构真相
docs/journal/                # 过程记录
.gitea/workflows/            # 薄 workflow 编排
.gitea/scripts/              # CI 辅助脚本
.shw/project.yaml            # 服务、测试、环境声明
AGENTS.md
```

公共 Taro UI、Go 库和其他已发布私有包必须通过私有 npm/Go 源按版本引用。新项目不创建公共组件 submodule；`packages/` 不承载已发布公共包源码。

`spec/`、`specs/` 不是标准目录。存量迁移发现后必须完整盘点、迁移有效事实、回写 Issue 和对应真相文档，完成引用检查后删除，不能仅改名或原样保留。

## 固定 Workflow 入口

项目只实现以下生命周期入口，项目差异放进 `.shw/project.yaml` 和公共脚本：

1. `pr-gate.yml`：Issue 分支定向快速检查，不运行无关全量 API/E2E/VRT。
2. `release-gate.yml`：dev→main 候选 PR 的正式全量测试。
3. `dev-full-test.yml`：dev 整体调试入口，仅在用户明确授权后手动执行；不由 push/普通 PR 自动触发，也不替代 release gate。
4. `fleet-*.yml`：按环境发布声明和源 SHA 证据。
5. 小程序发布 workflow：按项目是否存在 test 环境选择体验版来源。
6. tag 发布 workflow：main/tag 校验通过后直接发布，不重复运行测试。

全量测试失败或未完成时，用户可以明确授权带例外发布；必须保留真实状态、人工验收、风险、回滚和测试债务，不能改写为测试通过。

## 小程序环境映射

`dev` 始终用于本地开发者工具调试。

- 没有 test 环境：`dev` 同时对应体验版。
- 有 test 环境：`test` 对应体验版，`dev` 不自动上传体验版。
- `main/tag` 对应正式版。

小程序构建和上传绑定准确 Source SHA，私钥只通过 Gitea Secret 临时注入；失败或结果未知不自动重试。`shw-update` 必须先识别真实 test 环境，不能为了套模板强行创建 test。

## CI 依赖与防回退

CI 使用固定内部执行镜像、私有 npm 源和私有 Go 源。凭据只来自 Gitea Secret，认证文件用完清理，不写入仓库、镜像或日志。应检查公共包 submodule、本地路径依赖、`go.mod replace`、缺失 lockfile 和公网回退。
