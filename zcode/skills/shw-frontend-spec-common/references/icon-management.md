# 公司图标管理

## 真相与职责

图标上游唯一源是内部仓库 `shw-forks/lucide`。该仓库**仅存储**由 `shw-plugins` 批准的 Lucide 上游快照和 tag，不管理图标需求、生成器、发布或使用规则。当前批准版本是 tag `0.500.0`，提交 `2517eb642c66d345258cefe115dfd27a5d2caf91`。图标管理权收归 `shw-plugins`：任何新增图标或上游升级均由本插件建立维护 Issue，完成源名/许可/兼容性裁决、内部快照更新、`shw-ci-icons` 制品更新和验证后发布。业务项目不能直接引用 GitHub、npm 的 `lucide-static` 或任意新版本，也不得直接修改或把 `shw-forks/lucide` 当作可维护的图标项目。

`reg.shw.top/library/shw-ci-icons` 是公共 CI 工具镜像。它包含固定 Lucide 快照与字体、PNG 生成器；镜像源码、配方、验证和发布工作流都在 `shw-plugins`。业务项目固定使用已发布 digest，CI 不临时安装图标工具链。

| 位置 | 维护内容 |
| --- | --- |
| `shw-forks/lucide` | 仅存储由插件批准的 Lucide 上游快照与 tag；不受理图标需求，不维护工具或规则 |
| `shw-plugins/ci/icons` | 图标唯一维护入口：需求与可用性裁决、快照/tag 更新、工具、镜像配方、离线验证和发布工作流 |
| 业务项目 | 仅消费已批准图标：每个端的语义映射、字体/组件输出、TabBar 状态色、静态资源发布配置与凭据；新增需求提交给 `shw-plugins` |

## 项目配置

接入当前 shw-ci-icons 字体/微信 TabBar 生成链的项目在受版本控制的 `deploy/icons/config.json` 维护非敏感配置；凭据继续由 Gitea Actions Secret 注入，不写入配置或图标产物。iOS、Android、鸿蒙不因这个模板强制使用字体图标或微信 TabBar；其原生资产方案待各端项目决定并独立验证。H5 与每种小程序分别登记真实端入口，示例的 `platform-mobile` 不代表一份代码多端编译。

```json
{
  "schema": 2,
  "entries": {
    "platform-mobile": {
      "font": { "family": "platform-icon", "prefix": "platform" },
      "mapping": { "workspace": "layout-dashboard", "profile": "user-round" },
      "component": "src/platform-mobile/src/components/IconFont.vue",
      "output": "assets/fonts/platform-mobile",
      "publish": {
        "driver": "silo",
        "endpoint": "https://icons.example.com",
        "bucket": "project-assets",
        "prefix": "icon-fonts/platform-mobile"
      },
      "tabbar": {
        "output": "src/platform-mobile/src/static/tabbar",
        "size": 81,
        "color": "#999999",
        "activeColor": "#1677ff",
        "icons": ["workspace", "profile"]
      }
    }
  }
}
```

键是业务代码使用的稳定语义名，值是已由 `shw-plugins` 批准的 Lucide 快照中的源名。需要尚未批准的源名时，不得先写入配置或直接修改存储仓库；提交给 `shw-plugins` 处理后再纳入映射。字体 codepoint 由工具持久化在端图标源目录，已分配值永不回收。

## 生成和检查

`shw-icons build --config deploy/icons/config.json` 依次验证映射源、保留/分配 codepoint、生成 WOFF2/CSS/`IconFont`，并为每个 `tabbar.icons` 输出 `<name>.png` 与 `<name>-active.png`。普通态和选中态从相同 SVG 渲染，只允许颜色不同。未声明 `publish` 的旧 schema 1 配置保持组件目录内的本地字体输出。

字体构建先在隔离的临时目录将 Lucide 描边 SVG 转为填充轮廓，再以 1024 UPM 归一化生成字体。`build` 与 `check` 都会解析 WOFF2，逐项校验实际 glyph、codepoint 与字形尺度；`check` 不再仅判断文件存在。历史 `shw-ci-icons` 1.0/1.1 镜像缺少该转换，可能生成 24 UPM 字体，不能作为新项目的已验证镜像。1.2 镜像必须完成真实容器 smoke、匿名按 digest 拉取及拉取后再次 smoke，才能登记供项目消费的 digest；不能把未核验的候选 tag 当作制品证据。

镜像 `candidate/publish` 重跑先匿名读取目标 tag：同一配方只复核已存在的 digest，不重新推送；不同配方或 registry 认证/网络错误直接失败，不能把读取失败当作“tag 不存在”。需要变更镜像内容时必须升级版本，不覆盖旧标签。

端入口可独立声明 `output` 与 `publish`。带发布配置时，WOFF2、CSS 与清单生成到 `<output>/v-<hash>/`，`IconFont` 只导入 `<endpoint>/<prefix>/v-<hash>/iconfont.css`。`endpoint` 是项目填写的公网加速域名，只用于匿名读取；不另设 `publicBaseUrl`，bucket 也不出现在页面 URL。驱动只允许 `oss` 与 `silo`：Silo 以 S3 API 的 path-style 经 `endpoint` 上传；OSS 必须额外配置 HTTPS `uploadEndpoint`，该值必须是 bucket 绑定的官方 OSS API 地址（例如 `https://shw-cdn.oss-cn-shenzhen.aliyuncs.com`），上传不会经过 CNAME/CDN 域名。OSS V1 签名的 canonical resource 固定为 `/<bucket>/<objectKey>`。

`shw-icons check --config deploy/icons/config.json` 校验映射、codepoint、版本化字体/CSS/清单、组件中的 endpoint URL 和配置中列出的 TabBar PNG 文件存在性。`shw-icons publish --config deploy/icons/config.json` 仅在受信任 CI 中运行，读取 `SHW_ICONS_ACCESS_KEY_ID` 与 `SHW_ICONS_ACCESS_KEY_SECRET`，上传每个端的版本目录后匿名下载逐字节核验；PR 不注入这两个变量。页面图标名称和 `app.config.ts` 的业务引用仍须由项目测试/人工验收覆盖。生成或检查失败不得回退 Emoji、字符、手工 PNG 或 SVG 组件。

可复用的 PR 生成/检查与 dev 合并后发布模板见 `icon-publish-workflow.yml`。其中 `REPLACE_WITH_VERIFIED_DIGEST` 必须替换为已发布的不可变镜像 digest；模板不携带任何凭据，项目仅在 `publish` job 从 Gitea Secret 映射两个环境变量。

静态资源发布由项目既有流程执行；工具只生成版本可追溯产物，绝不读取或打印发布凭据。
