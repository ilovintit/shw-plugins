# CI 依赖缓存契约

## 来源

- Docker：测试job、services、构建阶段和Action使用的镜像都来自 `<公司Harbor>/ci-cache/<image>`，固定版本或digest。Node、Go、Git、浏览器及必要系统库尽量预装进对应工具链镜像，普通测试job不再重复公网安装。
- GitHub Actions：同步克隆到 `<公司Gitea>/actions/<repo>`，workflow引用该镜像的固定commit或不可变版本。记录上游仓库与提交、同步时间和许可证；更新由缓存维护任务完成，不在每个测试job重新clone公网。
- npm：registry及lockfile下载地址统一经公司缓存；验证认证、完整性和实际tarball来源。关闭非必要audit/fund/更新检查，检查安装脚本是否另行从GitHub下载大文件；需要的原生二进制应预热或随镜像/缓存提供。
- Go：GOPROXY指向已认证的公司加速源，不带`,direct`或其他公网回退；私有模块不通过GOPRIVATE/GONOPROXY绕开代理，公共校验和仍验证。工具链预装并禁止自动下载新工具链；缺版本先更新缓存镜像。

仅修改registry字段、只克隆Action仓库，都不证明网络链已经内网化。Action本身下载的Node/Go、Playwright浏览器、字体、系统包及镜像各stage的来源也必须检查。代理缓存缺包可由专门维护任务集中预热，不能让并发测试job在有限国际出口上重复下载同一批内容。

## 缓存缺失时

公司Harbor中不存在的镜像，可以直接从Docker Hub或对应官方镜像源拉取，再推入Harbor的 `ci-cache` 项目；Gitea的 `actions` 组织中不存在的Action，可以直接从GitHub同步克隆到该组织。此类首次填充和后续更新属于缓存维护，完成后记录上游版本/commit与内部digest/commit，普通测试job只使用已缓存的内部引用。镜像缓存到Harbor，Action源码缓存到Gitea，不能把缺失处理变成每个job的公网回退。已有权限足够时直接完成同步，不重复请求批准；权限或认证不足时报告具体缺项。

## 凭据与维护

真实域名、镜像引用、认证从项目/组织批准的配置提供；密码/token用CI Secret或已有安全注入方式，不提交凭据。拉取使用最小权限robot；维护缓存的推送权限不暴露给普通测试代码。

维护者负责镜像/Action同步、版本更新和可用性；项目工作流负责固定引用、健康检查、缺失诊断以及记录来源。无权维护基础设施时提供具体缺少的镜像/digest/Action commit/配置名，交用户或获授权维护者处理；不能跨项目修改配置、绕回公网或声称缓存已经部署。

项目可缓存构建/模块下载结果，但缓存key须包含工具链与依赖锁信息，不能把旧测试成功当作新结果。本规范不要求同步所有上游版本，只缓存本项目实际使用及批准更新的版本，减少无效带宽。

## 公司固定源与Secret名称

所有项目统一使用下列地址、Basic Auth用户名和Gitea Secret名称，不让用户逐项目选择源地址或自行拼接URL：

| 依赖 | 固定源 | 固定用户名 | Secret（原始Token） |
| --- | --- | --- | --- |
| npm | `https://npm.shw.top` | `shared` | `CI_NPM_TOKEN` |
| Go | `https://gop.shw.top` | `gop` | `CI_GO_TOKEN` |

CI自动把 `shared:<CI_NPM_TOKEN>` 编码为Base64写入临时npmrc的 `//npm.shw.top/:_auth`；不使用Bearer格式，不要求用户预编码。Go自动对Token做URL密码编码，生成 `https://gop:<已编码Token>@gop.shw.top`，不追加direct。临时配置不入库，结束后删除，不在日志输出认证值。

仅使用npm依赖时要求CI_NPM_TOKEN；仅使用Go标准库且工具链已预装时不要求CI_GO_TOKEN，并使用GOPROXY=off防止意外下载；实际引入外部Go模块才要求CI_GO_TOKEN。公共模块校验和仍验证，并通过公司代理提供校验和服务，避免公网直连；私有模块仅按实际私有域名配置GONOSUMDB。

init生成、update迁移和CI审查都必须检查这套固定契约；用户每个项目只配置实际需要的原始Token，或使用授权给该仓库的同名组织Secret。
