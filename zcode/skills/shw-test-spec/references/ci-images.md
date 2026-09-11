# 插件维护的 CI 执行镜像

## 必须区分的两个层面

1. **workflow 执行环境**：插件维护 reg.shw.top/library/shw-ci-node、shw-ci-go、shw-ci-playwright，供 Gitea job/container 或 CI 测试服务容器中的工具执行。包含检查、编译、测试工具；仅用于 CI。
2. **业务 Dockerfile 基础镜像**：业务应用 docker build 的 builder/runtime FROM 都按项目要求使用现有 library 仓库提供的镜像。插件不维护替代 runtime，不修改既有 library 仓库，不批量重写项目 Dockerfile FROM。CI 执行镜像不会决定 docker build 内的基础镜像。

不得把两层混为“所有基础镜像统一”；shw-ci-* 不用于业务生产/测试/开发应用的 Deployment，也不替代业务构建阶段 FROM。业务镜像仍须遵守新 Harbor 地址和项目自身版本/来源规范，迁移由该项目 Issue 完成。

## 唯一版本清单

[ci-images.json](ci-images.json) 是插件分发的机器清单；由插件仓库 ci/images/Dockerfile.*、专用 CI Execution Images workflow 构建。images 定义配方版本，bases 是已核验内部上游缓存 digest，published 仅登记真实构建/冒烟/匿名拉取后的不可变引用；缺项时停止初始化该 CI，不自造 digest 或使用未验收标签。

| 名称 | 用途与工具 |
| --- | --- |
| shw-ci-node | Node 24、Git/curl、Python3/make/g++、pnpm 11.11.0 与 11.0.9；按 packageManager 选择已预装版本，默认 11.11.0，不自动下载管理器 |
| shw-ci-go | Go 1.25 系列（至少 1.25.7）、CGO 编译依赖、Git/curl、Node 24（供 Actions 与插件构建编排）；工具链禁止自动下载 |
| shw-ci-playwright | Playwright 1.61.1、浏览器与固定字体、Node/pnpm、Go 和测试客户端；涵盖现有脚本调用，业务用例和锁文件留在项目 |

固定 linux/amd64，其他平台按项目 workflow 明确解决，不宣称多架构可用。Go 1.22 文档处理等独立项目不被强制迁到这套 CI 工具链；没有文档处理或应用运行时镜像。

## 构建、发布与消费

插件专用 workflow 在 dev 配方变化时仅验证，或手动 validate/candidate/publish。candidate 仅对同仓库 Issue 分支的手动调用发布 candidate-源码SHA 标签；正式 publish 仅手动 dev/main，源码 HEAD 必须与事件一致。PR 事件不发布。先构建全部选中镜像并进行无网络容器冒烟，再推送；失败不登记 published。

自建镜像只推 library/shw-ci-*，不用 ci-cache。版本标签禁止覆盖不同配方；同配方可重试复用。构建输出包含源码 SHA、配方指纹、工具版本、镜像 digest 与匿名拉取结果。跨镜像推送不是原子事务，中途失败只记录已成功项，修复后重试；全部通过后才能升级默认清单。配方改变须升级版本，不推 latest 影响既有项目。

原样缓存的 Docker Hub 镜像使用 ci-cache；微软 Playwright 等其他上游缓存按已有基础设施登记路径读取，不能把增强镜像写回上游缓存。需要系统包/公共工具下载的首次构建集中在本专用维护任务，普通业务 CI 不临时安装工具链。Dockerfile 仅复制工具脚本，不复制业务源码或私有依赖。

公开镜像不含 NPM_TOKEN、GO_TOKEN、npmrc 认证或带密码 GOPROXY。构建公共包经临时 BuildKit secret 注入，任务结束清理；业务 CI 运行中所需凭据由组织/仓库 Secret 注入，不能因为工具预装就认为私有依赖无需认证。镜像构建失败诊断不得回显凭据。

runner 必须已有 Node、Git、Docker/Buildx 及受控 Docker daemon；镜像不运行 Docker daemon，不通过项目 Agent 安装/改写 runner。项目测试脚本如依赖 Compose、daemon 或宿主路径，需在项目 workflow 明确处理，不能只改 container.image 就称迁移通过。
