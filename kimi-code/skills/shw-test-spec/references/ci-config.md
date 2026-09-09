# 公共 Gitea CI 变量与 Secret 命名

同用途同名，值按组织授权及项目/环境配置；不统一实际密码，不把业务运行 Secret 与 CI 凭据合并。只配置实际使用的输入，不让纯库/插件填应用部署项。镜像可用已审计的固定 digest 字面量；使用配置变量时遵守下表，不要求把已固定镜像重新参数化。

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| PROJECT_SLUG | Variable | 项目唯一前缀；用于开发域名和命名，不从临时 Issue 分支推导 |
| HARBOR_REGISTRY | Variable | Harbor 主机（可含端口，无协议/路径） |
| HARBOR_PROJECT | Variable | 本项目应用镜像空间 |
| CI_IMAGE_PROJECT | Variable | CI/基础/第三方镜像空间，固定 ci-cache |
| CI_NODE_IMAGE / CI_GO_IMAGE / CI_NODE_GO_IMAGE | Variable 或固定引用 | 实际需要的完整工具链镜像，固定 digest 或不可变版本 |
| HARBOR_USERNAME / HARBOR_PASSWORD | Secret | 拉取内部镜像的只读 robot；可用于 job/services 启动时认证 |
| HARBOR_PUSH_USERNAME / HARBOR_PUSH_PASSWORD | Secret | 仅受信任的合并后构建使用，限本项目镜像空间写权限 |
| CHECKOUT_TOKEN | Secret（按需） | 内置 token 不足以读取私有仓库/子模块时使用的只读凭据 |
| GITOPS_WRITE_TOKEN | Secret（按需） | 经批准的 GitOps 声明更新机制所需权限，限对应仓库/路径职责，不绕分支保护 |
| CI_NPM_TOKEN / CI_GO_TOKEN | Secret（按需） | 公司依赖代理的原始 token，认证编码见 ci-cache.md |

缓存维护任务的写入凭据由运维在其授权环境管理，普通项目 PR 不注入缓存写权限。Gitea 内置 token 保留平台标准名，不创建同名自定义密钥去覆盖。GitHub 制品发布的 RELEASE_PAT 是专用用途，保留该名，不改成 GITOPS_WRITE_TOKEN。

## 迁移表

- HARBOR_ADDR、CI_IMAGE_REGISTRY → HARBOR_REGISTRY；先核对是否同一 registry，不盲目折叠不同用途的地址。
- CI_CACHE_HARBOR_USERNAME/PASSWORD → HARBOR_USERNAME/PASSWORD（只读）；旧 HARBOR_USERNAME/PASSWORD 若有推送权限，把推送用途迁至 HARBOR_PUSH_USERNAME/PASSWORD，由管理员提供匹配权限的凭据。
- IMAGE_BRANCH_VERSION 等浮动标签开关不作为部署推进证据；迁到不可变 SHA/digest 与显式 GitOps 更新链。
- 已有 CI_NPM_TOKEN、CI_GO_TOKEN、CHECKOUT_TOKEN 保持名称，项目特有业务密钥仍按其业务契约维护。

先盘点引用位置和权限（不读出/回显 Secret 值），形成旧名→新名→用途→责任人清单。管理员先配置新名称/权限，再改引用并验证当前 CI；最后由有权维护者清理旧名称。不要先改 workflow 导致 job 容器无法拉取，也不要长期保留隐式别名或 OR fallback。外部配置未就绪时保持原引用，明确列为迁移前置，不声称迁移完成。

## 审计要求

遍历所有 workflow、复合/Docker Action、Dockerfile 的每个 FROM 与下载脚本、Fleet/Helm 渲染后的 image/依赖引用。Actions 只引用 Gitea actions 镜像；工具链、浏览器、系统依赖和第三方镜像从 Harbor/公司依赖缓存取得。检查 runner 自身预装能力及拉取认证，不能指望后续 login 步骤解决 job 容器启动前认证。

合入 dev 后构建/发布与 PR 快速门禁分开：PR 仅获得必要只读凭据，部署写凭据只在受信任分支事件的必要步骤提供，不能借 pull_request_target 执行 PR 代码获取写权限。缺变量/镜像/Action commit/权限时输出具体配置名并停止相应步骤，不打印凭据或回退公网。
