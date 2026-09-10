# 公共 Gitea CI 配置：四部分与可选覆盖

## 第一部分：公共配置

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| HARBOR_ADDR | Variable | 公共 Harbor 地址；当前 reg.shw.top，无协议/路径 |
| HARBOR_PROJECT | Variable | 公共业务镜像项目空间 |
| HARBOR_USERNAME / HARBOR_PASSWORD | Secret | 公共 Harbor 账号/密码，按实际工作权限授权 |
| CHECKOUT_TOKEN | Secret（按需） | 源码/子模块读取；受信任部署 workflow 按授权推进 fleet/* 专属分支 |
| NPM_TOKEN / GO_TOKEN | Secret（按需） | 公司依赖代理认证；可通过组织 Secret 统一授权仓库，避免逐项目重复填写 |

## 第二至第四部分：环境覆盖

| 部分 | 可选 Variable | 可选 Secret |
| --- | --- | --- |
| 生产/测试 | PROD_HARBOR_ADDR、PROD_HARBOR_PROJECT；TEST_HARBOR_ADDR、TEST_HARBOR_PROJECT | PROD_HARBOR_USERNAME、PROD_HARBOR_PASSWORD；TEST_HARBOR_USERNAME、TEST_HARBOR_PASSWORD |
| 开发 | DEV_HARBOR_ADDR、DEV_HARBOR_PROJECT | DEV_HARBOR_USERNAME、DEV_HARBOR_PASSWORD |
| CI 自动化测试 | CI_HARBOR_ADDR、CI_HARBOR_PROJECT | CI_HARBOR_USERNAME、CI_HARBOR_PASSWORD |

四件套逐字段取值：对应环境值非空时使用它，缺失/空字符串时回退公共值。允许只覆盖 PROJECT 而复用公共地址和账号；非法非空值、认证失败不能触发另一套凭据重试。账号密码需要匹配所选 registry。已实现的纯解析参考见 [ci-config.mjs](ci-config.mjs)，不打印解析后的 Secret。

公开 shw-ci-* 执行镜像从插件固定清单匿名拉取，无需 HARBOR 凭据；上述回退用于项目实际需要认证或可配置的镜像操作，不把 HARBOR_PROJECT 覆盖应用到插件公开执行镜像路径。

## 项目代码负责的配置

项目前缀、Namespace、各 API/Web/H5 域名、业务入口数量、Secret 和 imagePullSecrets 引用名称写入项目部署声明；不统一成 PROJECT_SLUG、DEV_API_DOMAIN、PROD_RUNTIME_SECRET_NAME 等 CI 后台变量。Secret 内容仍通过安全渠道提供，不入 Git。

Node/Go/Playwright 的默认 CI 执行镜像路径、工具版本和 digest 由插件 [镜像清单](ci-images.json) 提供，不要求每个项目填写 CI_NODE_IMAGE 等后台变量。特殊需要在项目 workflow 明确调整。业务 Dockerfile 的所有 FROM（含 builder 和 runtime）继续按项目要求选择现有 library 镜像，不因本契约统一替换；完整职责见 [CI 执行镜像](ci-images.md)。

## 凭据与迁移

- 统一沿用 HARBOR_ADDR；将 HARBOR_REGISTRY、CI_IMAGE_REGISTRY 等旧名按实际用途迁至公共或环境前缀 ADDR。CI_IMAGE_PROJECT、CI_CACHE_HARBOR_USERNAME/PASSWORD 按实际测试用途迁至 CI_HARBOR_PROJECT/USERNAME/PASSWORD；不强制额外配置覆盖项。
- CI_NPM_TOKEN/CI_GO_TOKEN 迁至 NPM_TOKEN/GO_TOKEN；先由管理员提供新名称，再切换引用。迁移期间若不能读取/配置组织 Secret，要明确保留的适配和责任人，不谎称完成。不得把真实 Token 烘焙到公开执行镜像。
- 不新增 HARBOR_PUSH_* 或 GITOPS_WRITE_TOKEN。已足够的 CHECKOUT_TOKEN 用于受信任的 fleet/* 写入，不授予它绕过 dev/test/main 保护的能力。PR 检出不持久化 Git 写凭据；PR 不执行发布或注入部署写凭据。
- RELEASE_PAT 是插件向 GitHub 发布制品的独立用途，保留原名；Gitea 平台内置 token 不改名。

先形成旧名→新名→用途→现有权限的映射，管理员配置新项后再改 workflow、验证、清理旧项。不要在配置尚不存在时切断现有 CI。无需依赖代理的项目不要求 NPM/Go Token，纯 Go 标准库任务使用 GOPROXY=off。
