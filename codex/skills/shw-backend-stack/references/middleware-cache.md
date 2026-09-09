# 开发中间件必须提前缓存

开发环境需要的 silo、PostgreSQL 18、RabbitMQ、Valkey 上游原样镜像提前准备在 reg.shw.top/ci-cache。专用 Development Middleware Cache workflow 维护 [固定清单](middleware-images.json)，项目 Fleet 声明消费 verified 中已验证的内部 digest，不直接引用公网或 latest。

## 范围与版本

清单记录官方 Docker Hub repository、具体版本、上游多架构 indexDigest 和本次选定平台的 digest。当前仅缓存并冒烟 linux/amd64，不能声称其他平台已准备；其他架构由对应维护任务补充并验证。内部路径保留上游命名空间，避免同名镜像冲突。

RabbitMQ 3.13.7-management 是现有项目 3.x 需求的兼容缓存，不是要求所有项目引入 RabbitMQ，也不代表将其选为新项目通用推荐版本。已有项目的中间件大版本或存储迁移仍在本项目 Issue 中裁决和验证，缓存完成不自动升级已有实例。

PostgreSQL 缓存保持 18 主版本；Valkey 按当前需要固定 8.1.10；silo 使用官方 pgsty/silo 的明确发布版本，不能继续引用 ghcr.io/pgsty/silo:latest。最终引用以清单的 verified 为准，未记录项表示缓存/验证尚未完成。

## 预热与验证

专用流程有 inspect、cache、verify 三种手动模式，按单组件或全部四项选择，不在每个业务 PR 重复回源。先核对 Harbor 项目实际类型和固定标签内容；普通项目按 digest 原样复制，代理缓存按上游路径/digest触发预热。鉴权失败不能当作镜像不存在；相同 digest 复用，不同内容拒绝覆盖，不进行 docker build。

缓存后从 reg.shw.top 拉取选定平台，检查平台与上游 manifest digest 一致，再启动无外网、无宿主端口的临时容器执行 pg_isready、valkey-cli ping、rabbitmq-diagnostics check_running 或 silo healthcheck ready。RabbitMQ探针使用rabbitmq用户并等待服务自己生成cookie，避免root探针抢先生成不可读文件。临时凭据随机生成，结束清理容器及其临时卷，不使用业务数据或修改开发集群。

报告必须含来源、版本、平台、内部 digest、复用/复制结果和健康结论。四项全部准备并验证后才更新 verified；失败保留明确缺项。镜像缓存验证不能替代实际 K8S 部署、PVC、应用连接和业务验收。

## 业务 Agent 必须执行

init/update/部署架构检查必须先盘点项目实际依赖，再核对本清单。首次 dev 部署前，所有中间件以及额外 initContainer/迁移工具/sidecar 镜像都必须已有内部缓存或项目批准的内部制品；缺项交维护流程先补齐，不让开发 K8S 现场拉公网。

把所需 verified 引用写入项目 dev 部署声明；Namespace、存储、资源和 Secret 引用仍由项目代码维护。ci-cache 的拉取权限按现有 imagePullSecrets 方式提供，不把凭据写入清单。项目 Agent 不修改 K8S；Fleet 完成部署。CI临时测试也可复用这些镜像，但实例和数据必须与 dev 隔离。

本规则只增加开发中间件的上游缓存准备，不改变 shw-ci-* 仅用于workflow执行、业务 Dockerfile FROM 仍由项目原有library方案负责的边界。新增组件须登记真实上游、固定版本和验证方式，不把自建增强镜像推到ci-cache。
