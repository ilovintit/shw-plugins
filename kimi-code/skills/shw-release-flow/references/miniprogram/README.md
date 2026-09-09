# 插件自包含的微信小程序上传

## 维护边界

插件仓库 ci/wechat/ 保存上传程序、SDK锁文件和Dockerfile，专用 WeChat Publisher Image workflow 发布 reg.shw.top/library/shw-ci-wechat。该镜像包含插件自己的程序、固定 miniprogram-ci 2.1.31，以及继承自插件 shw-ci-node 的 Node/pnpm工具，业务任务不现场安装SDK、不调用原library/we-chat-ci镜像或复制另一套上传程序。旧library仓库与现有业务项目不被本插件直接修改。

这是一种专用CI发布执行镜像，不是业务Dockerfile builder/runtime FROM或应用Deployment镜像。通用node/go/playwright执行镜像仍独立；不因此增加业务运行时镜像或让dev小程序走远程发布。dev仍由用户本地拉代码编译调试、连接开发API。

[image.json](image.json) 固定镜像版本、SDK、父镜像和verified published digest；未登记published时不要生成声称可运行的发布workflow。候选镜像只手动Issue分支SHA标签，正式版本仅手动dev/main；镜像验证不使用真实小程序身份，固定标签不覆盖不同配方。

## 业务项目接入

1. 从真实入口盘点每个小程序的AppID、编译目录、API环境、robot、上传私钥归属；AppID/路径/settings写项目代码，不做统一数量的全局CI变量。
2. 每个入口维护一个deploy/wechat/<入口>.json，参照 [配置示例](project.example.json)。两个环境使用不同AppID时分别建配置/Secret/workflow，不把一份私钥跨AppID使用。
3. 按项目已有编译方式提供 .gitea/scripts/build-wechat-<入口>.sh；它选择仓库内test/生产API配置、清理旧产物并执行项目pnpm/npm构建。不能用“CI镜像已带Node”代替编译。编译目录必须包含app.js、app.json、project.config.json；其中appid与配置一致、compileType为miniprogram、miniprogramRoot为./或空。保留有效编译设置，不修改业务源代码的构建/运行基础镜像。
4. 按 [workflow示例](workflow.example.yml) 实体化各入口，替换脚本/配置路径、Secret名称和image.json的published digest。不要原样保留示例AppID。checkout精确SHA、子模块recursive，私有读取按已有CHECKOUT_TOKEN授权；不持久化Git写凭据。
5. 编译步骤才提供NPM_TOKEN，经临时npmrc处理；上传步骤才提供该AppID的私钥，0600临时文件在bundle外，结束删除。密钥来自微信后台授权并通过CI Secret提供；不能把旧仓库内.key文件搬入公共镜像或继续提交到Git。检查已有.npmrc明文认证，按项目Issue迁移。

只在main/test的push或手动workflow_dispatch上传；main仍先由用户Web UI合并，test上传不等于生产发布。robot范围1–30，示例test=2/main=1只是现有通道模式，按项目事实配置；robot不是环境或审核权限，API地址由编译配置决定。多个workflow共享AppID时使用同一并发组，避免同时上传；不要仅靠目录path过滤漏掉共享组件/lockfile/编译配置变化。模板默认不做路径过滤，项目可补经过验证的影响映射。

## 固定程序入口

- `shw-wechat --version`：镜像工具及SDK版本。
- `shw-wechat sdk-check`：仅加载SDK，不能证明微信上传可用。
- `shw-wechat stamp --config deploy/wechat/<入口>.json`：在编译目录写.shw-wechat-build.json，记录仓库、分支、SHA、配置及产物摘要；必须紧随本次编译，不能给来源不明的旧产物补章。
- `shw-wechat check --config ...`：无网络预检，核对来源与产物未变、配置/路径/私有文件规则。
- `shw-wechat upload --config ...`：重新预检、读取WECHAT_PRIVATE_KEY_FILE并调用SDK上传；默认版本是分支-提交前12位。可按项目需要传WECHAT_UPLOAD_VERSION和WECHAT_UPLOAD_DESCRIPTION，禁止直接拼接未校验输入到shell命令。

程序只支持标准miniProgram上传；小游戏、插件、第三方代开发ext.json、云函数、审核与正式发布API不在本次范围。编译npm依赖/miniprogram_npm由项目构建脚本完成，不在上传阶段隐式安装。

## 校验、结果与失败

程序拒绝PR/dev/fleet分支上传、缺失或修改的build记录、工作区逃逸/符号链接、bundle内私钥/认证文件、错误robot及私钥格式/权限。上传在隔离子进程中运行，SDK原始stdout/stderr不转发，只返回受控状态、源码、版本和数字错误码；不打印配置全文、私钥、SDK原始错误或原始响应。上传最多15分钟，失败/中断非零退出，外层不自动重试。

`status=uploaded`只表示SDK上传调用成功，不表示体验版已切换、审核通过、正式发布、页面可用或与H5一致。网络中断/超时可能使上传结果未知，先在微信平台核对版本再决定重试，不能把缺日志当作未上传。微信后台须事先配置代码上传密钥与runner出口IP白名单；上传成功后仍需用户按业务发布流程处理体验/审核/发布。

镜像CI验证真实SDK加载、离线Project构造、本地预检、凭据缺失和篡改拒绝；程序单测以生成的非业务密钥与模拟SDK验证调用契约。真实微信上传及设备交互必须在对应业务项目取得授权后验证，不把这些测试当作真机验收。

SDK契约来源：https://www.npmjs.com/package/miniprogram-ci 和SDK包内README、dist/@types/project/ciProject.d.ts（2.1.31）。
