# 公司图标管理

## 真相与职责

图标上游唯一源是内部仓库 `shw-forks/lucide`。当前批准版本是 tag `0.500.0`，提交 `2517eb642c66d345258cefe115dfd27a5d2caf91`。升级只能由 `shw-plugins` 维护 Issue 更新内部快照和 `shw-ci-icons` 镜像，业务项目不能直接引用 GitHub、npm 的 `lucide-static` 或任意新版本。

`reg.shw.top/library/shw-ci-icons` 是公共 CI 工具镜像。它包含固定 Lucide 快照与字体、PNG 生成器；镜像源码、配方、验证和发布工作流都在 `shw-plugins`。业务项目固定使用已发布 digest，CI 不临时安装图标工具链。

| 位置 | 维护内容 |
| --- | --- |
| `shw-forks/lucide` | 批准的 Lucide 上游快照与 tag |
| `shw-plugins/ci/icons` | 工具、镜像配方、离线验证、发布工作流 |
| 业务项目 | 每个端的语义映射、字体/组件输出、TabBar 状态色、静态资源发布配置与凭据 |

## 项目配置

项目在受版本控制的 `deploy/icons/config.json` 维护非敏感配置；凭据继续由 Gitea Actions Secret 注入，不写入配置或图标产物。

```json
{
  "schema": 1,
  "entries": {
    "platform-mobile": {
      "font": { "family": "platform-icon", "prefix": "platform" },
      "mapping": { "workspace": "layout-dashboard", "profile": "user-round" },
      "component": "src/platform-mobile/src/components/IconFont.vue",
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

键是业务代码使用的稳定语义名，值是批准 Lucide 快照中的源名。字体 codepoint 由工具持久化在端图标源目录，已分配值永不回收。

## 生成和检查

`shw-icons build --config deploy/icons/config.json` 依次验证映射源、保留/分配 codepoint、生成 WOFF2/CSS/`IconFont`，并为每个 `tabbar.icons` 输出 `<name>.png` 与 `<name>-active.png`。普通态和选中态从相同 SVG 渲染，只允许颜色不同。

`shw-icons check --config deploy/icons/config.json` 校验映射、codepoint、页面图标名称、字体/CSS/组件产物和 TabBar PNG 与 `app.config.ts` 的引用。生成或检查失败不得回退 Emoji、字符、手工 PNG 或 SVG 组件。

静态资源发布由项目既有流程执行；工具只生成版本可追溯产物，绝不读取或打印发布凭据。
