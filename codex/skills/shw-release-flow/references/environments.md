# Kubernetes 环境与合入 dev 后部署契约

## 分支、触发与客户端

- 分支保持 `dev`（开发）、`test`（测试）、`main`（生产发布线）；prod 只是环境名称，不创建 prod 分支。
- Issue 分支开发 → PR 到 dev → 改动相关的快速 CI 门禁 → 合并 dev → dev push 自动启动开发部署。PR 创建/更新只验代码，不向共享开发环境发布未合并代码。dev 部署不等待 release、tag 或 dev→main 全量门禁。
- 快速门禁保留构建、静态检查与改动相关的小范围测试；范围与证据按 shw-test-spec。发布全量门禁仍只在 dev→main 执行。
- 后端 API、worker 和 Web 前端按实际影响更新；H5/PC/官网等可部署入口有变化必须更新。小程序由用户本地拉取代码、编译和真机调试，连接开发 API；不把小程序包当作 K8S Web 部署，同一源码影响 H5 时仍更新 H5。
- 不再依赖 person 插件、rdev 命令、远程 Docker/同步脚本或旧远程开发路由。这里只维护项目内替代入口，不卸载或修改用户级插件配置。

## 固定开发集群与域名

开发 K8S 是统一固定集群；开发 Rancher/Fleet 与 test/生产管理面隔离，不逐项目建集群。基础设施已统一把 `*.shwkj.cn` 指向该集群的入口。项目在架构部署文档记录唯一 `PROJECT_SLUG`、Namespace、服务名及域名清单，例如 `xxx-api.shwkj.cn`、`xxx-admin.shwkj.cn`、`xxx-h5.shwkj.cn`。先只读核对已有项目/Ingress 的占用；无法核实时标记待核实，不宣称仅凭命名就已证明唯一。

前缀内角色也必须唯一，统一使用 `xxx-api.shwkj.cn` 这种单层主机名，不擅自改为 `api.xxx.shwkj.cn` 等另一套域名约定。不为每个项目重新要求配置通配 DNS；真实 cluster context、Fleet GitRepo 和 Namespace 以已登记事实为准，不能猜集群名称。

## 环境责任

| 环境 / 来源 | 项目 Git / Fleet 负责 | 运维负责 |
| --- | --- | --- |
| dev / dev | 应用与所需全部中间件的声明、初始化/迁移、健康与依赖就绪、存储/PVC、升级及数据保留；中间件部署在开发 K8S 的项目范围内 | 固定集群、存储基础设施、入口和 Fleet 登记等集群能力 |
| test / test | 应用 Deployment + Service + Ingress，外部中间件的端点配置与 Secret 引用 | 外部中间件的供应、账号授权、备份、升级与可用性 |
| 生产 / main | 应用 Deployment + Service + Ingress，外部中间件的端点配置与 Secret 引用；发布仍遵守 main 人工合并与 tag 流程 | 外部中间件及其运行维护 |

项目自管 dev 中间件是维护仓库声明、由 Fleet 执行和只读验证，不授予项目 Agent Kubernetes/Ansible 写权限。test/生产 overlays 不得继承 dev 的数据库、Valkey、silo 等资源；按环境独立渲染并审查，避免 common base 混入中间件。连接凭据由安全注入提供，只提交 Secret 引用。dev 首次需要的凭据也经既有安全渠道配置，不能把“自管”理解为提交明文。

中间件选型遵循 shw-backend-stack；有状态数据不能随应用滚动更新重置。初始化和数据库迁移须可重试，明确失败停止、备份和回退；CI 的 per-run 临时中间件与共享开发环境分离，不能拿开发数据跑破坏性自动化。

## HTTP Ingress

所有环境均由 K8S 前置 Nginx 卸载 SSL，Nginx → K8S 使用 HTTP。项目 Ingress 不声明 `spec.tls`、证书 Secret、cert-manager 签发注解或强制 HTTPS 跳转注解。外部客户端仍使用 HTTPS URL，尤其小程序 API；不能把集群内 HTTP 误改成用户访问 HTTP。

Fleet 必须完整维护应用 Deployment、Service、Ingress 的 selector/targetPort/host/path 对应。基础设施负责可信代理转发配置，应用按已授权代理处理原始协议/Host/IP，核验登录回调、Secure Cookie 和重定向不产生循环；不信任任意客户端伪造的转发头。

## 镜像与 Fleet 更新闭环

项目架构必须写明实际镜像更新机制：dev push 构建受影响制品 → Harbor 推送不可变 SHA 标签/digest → 经已授权的 GitOps 更新机制将 digest 写入 Fleet 消费的声明 → Fleet 同步 → 就绪及域名冒烟。仅推镜像或重复推浮动 dev 标签不保证 Fleet 触发 rollout。

影响清单覆盖共享库、lockfile、构建配置、基础镜像和部署配置；共用依赖变化更新所有受影响服务。只改声明可直接同步，纯文档/仅小程序代码且无服务端或 Web 影响时记录无需更新工作负载的依据。每次 dev 合并都进入部署判定，不用粗粒度路径过滤漏掉间接影响。

记录源码 SHA、部署声明 revision、各服务 digest 和环境。受保护分支不直接由项目 Agent push；自动更新须采用项目已授权、符合分支保护的机制，未具备时明确待配置，不能伪造部署完成。更新声明自身不循环重建制品。部署串行或使用 revision 校验，旧 run 不得覆盖较新 dev；取消/失败不能留下引用未推送镜像的声明。

CI 与 Fleet 用到的 Actions、工具链/基础镜像、Helm 依赖和中间件镜像都审计来源，按 shw-test-spec/references/ci-cache.md 和 ci-config.md 固定内部版本；项目应用镜像进入 Harbor 项目空间，基础/工具链/第三方镜像进入 ci-cache。

## 验证与记录

部署命令支持 dev/test 环境，不要求 dev 先有生产 tag。核对对应分支 commit、制品 digest、Fleet revision、Deployment/StatefulSet 就绪、Service endpoints、Ingress 路由与外部 HTTPS 冒烟；dev 还检查中间件初始化和持久化，test/生产检查外部连接。只读工具不可用时记录缺失证据交基础设施侧核实。合并成功、CI 绿、Pod Running、部署成功与用户验收分别记录。
