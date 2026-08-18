# shw-plugins

> Spec-driven development workflow with parallel agent execution, TDD/debugging/verification disciplines, DDD architecture spec, and Gitea CI integration.

本仓库是 **shw-plugins 的发布仓库**，存放 ZCode 与 Kimi Code 两种工具的构建产物。源码在私有 Gitea，CI 自动构建并推送到本仓库。

> 插件定位：**主要面向 ZCode 优化和适配**——ZCode 产物是完整能力（skills + commands + 2 MCP（shw-spec + gitea 官方）+ userConfig 配置插值）。Kimi Code 产物是通用适配（skills + commands + 2 MCP），不包含 ZCode 专属能力。

## 安装

### ZCode 客户端（通过 marketplace）

ZCode 兼容 Claude 插件体系，使用 marketplace 概念：

1. 打开 **Settings → Plugin Management → Discover** 标签
2. 点右上角 **`+`** 按钮 → 选「GitHub 仓库」
3. 填入：`ilovintit/shw-plugins`（或完整 URL `https://github.com/ilovintit/shw-plugins`）
4. 加为 marketplace 后，在 Discover 列表找到 **shw-plugins** → 点 **Get** 安装

### Kimi Code 客户端（直接 URL 安装）

Kimi Code 不使用 marketplace，直接用仓库根 URL 安装（根目录的 `kimi.plugin.json` 指向 `kimi-code/` 子目录产物）：

```
/plugins install https://github.com/ilovintit/shw-plugins
```

> 注意：
> - `/plugins install` 的 GitHub 仓库 URL 不支持仓库内子目录路径，请使用上面的仓库根 URL
> - 更新方式：重新执行同一条 `/plugins install` 命令覆盖安装即为更新（无 marketplace 更新提示）

<!-- KIMI-CONFIG:START -->
## Kimi Code 配置（gitea MCP）

Kimi Code 没有插件配置面板，`gitea` MCP 的连接信息通过 **mcp.json 同名条目覆盖**配置：在配置文件里写一个与插件清单同名的 `gitea` 条目，即可整体覆盖插件内置声明（优先级：项目 > worktree > 用户 > 插件）。

### 用户级配置（主路径，跨项目生效）

编辑 `~/.kimi-code/mcp.json`，写入完整文件内容（可直接粘贴后修改）：

```json
{
  "mcpServers": {
    "gitea": {
      "command": "go",
      "args": ["run", "gitea.com/gitea/gitea-mcp@v1.6.0"],
      "env": {
        "GITEA_HOST": "https://gitea.songhuwan.com",
        "GITEA_ACCESS_TOKEN": "<在此填入你的 token>"
      }
    }
  }
}
```

- `GITEA_HOST`：Gitea 实例地址，**需含协议头**（如 `https://gitea.songhuwan.com`）
- `GITEA_ACCESS_TOKEN`：访问 token，在 Gitea Web → Settings → Applications 创建

### 项目级配置（连接特殊 Gitea 实例）

某个项目需要连不同的 Gitea 实例（不同 host / token）时，在该项目的 `.kimi-code/mcp.json`（或 worktree 根 `.mcp.json`）写同名 `gitea` 条目覆盖，条目格式与上面相同，只改 `env` 里的值即可。

> 兜底：在 shell 里 `export GITEA_HOST` / `GITEA_ACCESS_TOKEN` 也可用（插件清单不携带 env，不会覆盖 shell 变量）。
<!-- KIMI-CONFIG:END -->

## 仓库结构

```
shw-plugins/                         ← GitHub 仓库根
├── marketplace.json                 ← ZCode 市场清单（source 指向 zcode/）
├── kimi.plugin.json                 ← Kimi Code 清单（./ 路径指向 kimi-code/ 子目录）
├── README.md                        ← 本文件
├── zcode/                           ← ZCode 插件产物
│   ├── .zcode-plugin/plugin.json
│   ├── skills/
│   ├── commands/
│   └── mcp-spec/  (index.js)
└── kimi-code/                       ← Kimi Code 插件产物
    ├── kimi.plugin.json
    ├── skills/
    ├── commands/
    └── mcp-spec/  (index.js)
```

## 包含的 Commands

| Command | 作用 |
|---------|------|
| `/shw-init` | 初始化项目 — 创建 `.changes/` + `specs/` 目录 + AGENTS.md 配置 |
| `/shw-explore` | 启动探索模式分析需求 |
| `/shw-propose` | 通过 explore + propose 制定一个 change |
| `/shw-apply` | 通过并行子智能体调度实现 change 任务（含自驱收敛审查） |
| `/shw-archive` | 归档已完成的 change（含 delta spec 合并到主 spec） |
| `/shw-roadmap-explore` | 大任务深度探索与 roadmap 生产（拆多 change 的模块/改造用它） |
| `/shw-roadmap-verify` | 把 roadmap 验收目标转写为 verify.md 可验证条目，定稿后产出 goal 文本 |
| `/shw-update` | 插件升级后的存量项目迁移（按迁移清单幂等修复 AGENTS.md 死链/旧口径/作废文件） |

## 包含的 Skills（32 个）

### 工作流纪律（10 个）

| Skill | 作用 | 触发场景 |
|-------|------|---------|
| `shw-tdd` | 强制 RED-GREEN-REFACTOR 流程 | 写实现代码前 |
| `shw-debugging` | 强制 4 阶段根因分析 | 遇到 bug、测试失败、异常行为时 |
| `shw-verify` | 声称前强制运行验证并附真实输出 | 任务完成前 |
| `shw-commit` | 任务完成后主动 commit 到本地 git | 主 Agent 完成任务时自动触发 |
| `shw-change-parallel` | 并行任务委派决策框架 | apply 命令遇到 2+ 独立 task 时 |
| `shw-change-review` | 审查 change artifact 与 explore 上下文一致性 | propose 完成后 |
| `shw-change-design-review` | 数据库结构 / 后端 API 设计强制过审规则 | explore / propose 阶段涉及库表或路由设计时 |
| `shw-change-review-code` | 逐字符审查代码与 change 设计的一致性 | apply 完成后 + 归档前 |
| `shw-change-sync-spec` | 把 change 的 delta spec 智能合并到主 spec | 归档时用户确认同步后 |
| `shw-goal-drive` | goal 模式执行 roadmap 的编排打法（主 agent 编排多 change 小循环） | 用 goal 驱动跑 roadmap 时 |

### 设计规范（17 个，语言无关）

| Skill | 作用 |
|-------|------|
| `shw-ddd` | DDD 四层架构（domain/application/interfaces/infrastructure）通用设计规范 |
| `shw-error-handling` | 统一错误处理与响应格式（业务码与 HTTP 状态码分离） |
| `shw-rbac` | 管理后台 / 内部系统 RBAC 权限系统设计 |
| `shw-task` | 后台任务管理系统（异步任务、定时扫描、父子拆分、常驻 Worker） |
| `shw-session` | 会话管理与 token 认证（多角色隔离、踢下线、滑动续期） |
| `shw-seqnum` | 业务编码生成（订单号 / 单据号 / 序列号，Redis INCR + 日期段） |
| `shw-crypto` | 字段级 AES 加解密（AES-256-GCM，跨语言密文互认） |
| `shw-attachment` | 附件 / 文件上传管理（前端直传 OSS/MinIO、去重、临时清理） |
| `shw-sms` | 短信发送 / 通知服务（阿里云 / 腾讯云供应商对接） |
| `shw-otp` | 验证码（短信码 / 邮箱码）生成、校验、防爆破、频率限制 |
| `shw-wecom` | 企业微信全集成（通讯录同步、应用消息推送、两层架构） |
| `shw-express` | 快递物流（追踪、下单、订阅回调、多供应商聚合） |
| `shw-region` | 行政区划采集库（省 / 市 / 区县 / 街道，地址级联） |
| `shw-redis-lock` | Redis 分布式锁（SET NX EX 获取 + Lua 原子释放） |
| `shw-design-conventions` | 公司组件库的跨组件通用设计范式（10 条贯穿规则） |
| `shw-frontend-stack` | 前端技术栈选型规范（3 套标准栈） |
| `shw-port-manager` | 端口登记管理（先查全局登记表再分配，杜绝跨项目冲突） |

### 框架落地（3 个）

| Skill | 作用 |
|-------|------|
| `shw-hyperf-conventions` | 公司设计规范在 PHP+Hyperf 栈的落地实现指南 |
| `shw-goframe-conventions` | 公司设计规范在 Go+GoFrame 栈的落地实现指南 |
| `shw-goframe-lib` | gf-lib 组件库（Go/GoFrame）使用指南 |

### 外部工具集成（2 个）

| Skill | 作用 |
|-------|------|
| `shw-gitea-ci` | Gitea Actions CI 查询 / 重试失败 run / 创建 Pull Request（走官方 gitea-mcp） |
| `shw-k8s-rancher` | 经 Rancher 只读排查 K8s 集群（kubectl 只读白名单：Pod 状态 / 日志 / 事件 / 资源水位） |

## 包含的 MCP

| MCP | 作用 | 是否需要配置 |
|-----|------|------------|
| `shw-spec` | Spec-driven 工作流引擎（变更管理工具） | 无需配置，开箱即用 |
| `gitea` | 官方 gitea-mcp（`go run` 外部拉起，插件不打包），Gitea 全能力（CI / PR / issue…） | 需配置：ZCode 在插件设置填 Gitea 地址与 token；Kimi Code 在 `~/.kimi-code/mcp.json` 写同名 `gitea` 条目覆盖，见上方「Kimi Code 配置」章节。token 在 Gitea Web → Settings → Applications 创建，机器需 Go（或装二进制，进阶路径见 skill 内 config.md） |

## 版本

当前版本见根目录 `marketplace.json` 的 `plugins[].version` 字段。

发版历史见本仓库的 [Tags](../../tags)。

## 源码与贡献

本仓库是构建产物，源码托管在私有 Gitea（`shw-project/shw-plugins`）。如需贡献或查看实现细节，请联系维护者。

## License

MIT
