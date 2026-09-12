# GitOps 声明发布程序

## 交付形式和职责

插件源码 ci/gitops/ 维护 Go CLI；专用 CI 镜像 shw-ci-gitops 包含固定版本 Git、Helm、Kustomize 和程序。镜像不是业务 Dockerfile FROM 或应用 Deployment 镜像，不属于 MCP，不需要在 runner 安装 Agent。版本与真实验证的 published digest 见 [image.json](image.json)。published 为空时不得生成声称可运行的项目流水线，也不得用 latest/候选 tag 代替正式固定引用。

项目 Agent 在同一个 Issue PR 修改业务代码、部署源和项目配置，CI 通过已授权凭据发布。程序不会创建实际 GitOps 仓库、配置 Fleet、写 Kubernetes 或绕过项目外只读边界。跨仓库目标必须由用户/管理员预先授权；不因使用程序获得 Agent 跨目录写权限。独立仓库和同仓库共享同一协议，首次接入推荐保留同仓库 fleet/dev、fleet/test、fleet/prod。

## 精确来源与完整快照

`dev/test/main` 对应环境 `dev/test/prod`。构建必须检出本次确定源码 SHA S；生成声明仍读取 Git S，不重新取移动的分支 HEAD，也不使用工作区未跟踪文件。tracked dirty、错误 origin、非源分支祖先、PR/fleet 分支发布、CI SHA/ref 不一致均失败。

生产从用户人工合并 main 后的稳定 vX.Y.Z tag 发布；程序验证 tag 与 S 相等、S 属于 main。dev→main 全量自动化必须运行，但用户可带已记录的失败/未完成状态例外合并；程序不把“存在 tag”或用户例外合并当成全量测试通过，也不替代人工验收。

每次从 S 完整渲染当前环境，包含资源新增、修改与删除，再把完整资源和来源记录作为一个普通提交追加至目标分支。部署 SHA D 的父提交是旧部署 SHA；S 与 D 不要求父子关系。目标目录只含 resources.yaml 和 .shw-gitops.json；其他项目目录保留。既有未受管目录、手改资源或多出的文件失败，不能隐式覆盖旧产物。程序的完整快照移除已删除资源；Fleet 的实际资源删除、保留策略及持久化数据处置须由对应项目验收。

## 项目配置

复制 [配置示例](project.example.json) 为 deploy/gitops.json，按 [schema](project.schema.json) 配置。地址与路径是示例，不能直接用于业务。

- sourceRepository 必须与 checkout origin 对应同一仓库，使用无凭据 HTTPS URL（兼容 checkout 省略 .git 后缀）。targetRepository 可以相同或为预先授权的独立仓库；目标分支固定 fleet/<环境>，targetPath 是项目独占普通目录，不得重叠其他应用目录。
- images 的键是稳定服务 ID。repository 不含 tag/digest，inputs 是仓库相对文件/目录前缀，覆盖源码、共享依赖、lockfile、Dockerfile、构建脚本和部署输入；不支持 glob。程序不推断遗漏的业务依赖。首次接入优先为每个服务构建本次 S；优化复用前必须审查完整影响映射。
- 镜像记录见 [构建产物示例](artifacts.example.json)。记录整体绑定 S、来源仓库和环境，包含全部配置服务。每个镜像必须是 repository@sha256:digest，镜像自身 sourceSHA 为真实构建源码。不能给来源未知的旧镜像补写 S。
- 复用旧镜像时，镜像 sourceSHA 必须是 S 的祖先，且 inputs 及配置文件在两提交之间均无变化。不是只比较最近两次 dev 提交，也不能仅提供“本次变化服务”而漏掉其他服务。
- 模板镜像使用固定占位符 `${SHW_IMAGE_api}`；程序替换为完整镜像引用，不执行 shell 模板。所有声明服务都必须出现在最终资源中；其他固定镜像（如中间件）也必须写 digest 并验证可读取。

## 渲染支持

- raw：path 下只放 Kubernetes YAML/JSON；递归读取，不接受 fleet.yaml、Chart.yaml 或 kustomization.yaml。需要上述控制文件时按下列渲染器整理，不能静默丢弃控制语义。
- kustomize：使用内置 Kustomize，配置与依赖必须已在仓库内；不支持远程 base、插件、exec generator、Kustomize 的 Helm 下载。相对本地 base 可引用仓库内其他目录。
- helm：只渲染仓库内 chart，依赖预先固定并随源码提供；release、namespace、kubeVersion 显式配置，values 为仓库相对文件。不会联网下载 chart，不使用集群 lookup。不允许在模板中依赖时间或随机值；同一 S 生成不同快照会拒绝再次发布。
- 输出验证 YAML、资源身份、重复资源、镜像 digest；拒绝 Secret/SecretList 资源及任何 Secret 引用（`secretKeyRef`、`secretRef`、Secret volume、`secretName`、`imagePullSecrets`）、明显私钥和遗留镜像占位符。所有环境的运行配置统一由 ConfigMap 提供，工作负载使用 `configMapKeyRef`/`configMapRef`；dev ConfigMap 由项目仓库/Fleet 全量维护。该验证不是完整 Kubernetes API schema/业务兼容性检查，也不能证明任意 ConfigMap 文本无敏感信息；test/生产仍需限制配置值的仓库与日志可见范围。
- 此版本输出普通资源，不透传 fleet.yaml 的部署控制选项。依赖其 rollout/patch/targetCustomization 等语义的项目必须先评估迁移，不直接套 raw 模板。源快照不接受链接/子模块部署依赖，需在源码中提供完整普通文件。源码归档上限 128 MiB、单文件 16 MiB、配置/镜像 JSON 4 MiB、渲染输出 16 MiB；空部署拒绝发布。

## CLI 与身份

`shw-gitops --version` 输出工具版本。

```sh
shw-gitops check --source . --sha "$GITHUB_SHA" --environment dev \
  --config deploy/gitops.json --images .gitops-build/images.json --work .gitops-build/work
shw-gitops publish --source . --sha "$GITHUB_SHA" --environment dev \
  --config deploy/gitops.json --images .gitops-build/images.json --work .gitops-build/work
```

生产追加 `--release-tag "$GITHUB_REF_NAME"`。check 完成同样的来源、镜像与渲染验证但不写远端；publish 重新完整校验后提交。所有输出路径均在项目工作区，构建临时目录列入项目 .gitignore；不得跟踪日志或密钥。

CHECKOUT_TOKEN 仅用于受信任发布步骤，GITOPS_GIT_USERNAME 为该 token 的 Git 用户名。Git 认证只发给 GITHUB_SERVER_URL 的 HTTPS 源，不保存在仓库配置中，不跟随重定向。跨 Git 主机不自动转发 token，本版分仓接入使用同一 Gitea 主机的已授权仓库。Harbor 使用既有公共四件套及 PROD/TEST/DEV/CI 逐字段覆盖；workflow 将选定环境最终值传入 HARBOR_ADDR/USERNAME/PASSWORD，认证只发给该 host。Registry Bearer realm 必须同源，不输出响应体/原始认证错误。

## 发布顺序与失败

旧部署记录中的 S_old 必须是 S 的祖先；迟到或分叉来源拒绝。同一 S、配置、镜像及完整内容相同返回 unchanged。同一 S 产生不同快照失败，不能靠重跑改写版本。

读取目标分支、生成以其 HEAD 为父的提交后正常 push。竞争失败不 force、不在旧结果上换父提交盲重试；重新读取部署记录，旧任务退出，有效任务重新完整校验。首次分支并发创建也由普通 push 拒绝竞争。workflow 按目标环境串行，可降低竞争，但不能替代程序中的来源顺序校验。

网络中断/推送后读取失败可能是结果未知：先核对目标 HEAD 与快照来源，再决定是否重新执行。published/unchanged 仅证明 Git 声明状态，不证明 Fleet rollout 完成。回滚通过业务分支上的新回退提交及对应构建记录发布；程序不会把回滚请求视为允许旧流水线越序。

## 接入与升级

按 [workflow 示例](workflow.example.yml) 替换固定镜像 digest、服务构建脚本和路径；项目构建方式自定，但产物必须符合契约。示例不提供万能业务构建脚本，不现场安装依赖。dev/test 监听对应 push；prod 仅由既有发布成功链路调用，禁止每次 main push 直接上线。Fleet GitRepo 监听对应 fleet/* 和项目 targetPath。

init 首次接入即使用公共程序；update 识别旧 inline sed/git push、浮动镜像、只更新旧 Fleet 配置或强推模式，先盘点现有资源、目标目录和已确认语义，再迁移到新受管目录并由用户/基础设施侧切换 Fleet 路径。旧目录资源和 PVC 不能自动删除；新路径导致 Helm release 身份变化时必须先制定接管方案。版本升级通过项目 PR 更新 digest、配置格式及必要参数，不全项目无感切换。
