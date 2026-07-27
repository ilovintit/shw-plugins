# shw-plugins

> Spec-driven development workflow with parallel agent execution, TDD/debugging/verification disciplines, DDD architecture spec, and Gitea CI integration.

本仓库是 **shw-plugins 插件市场的发布仓库**，存放 ZCode 和 Kimi Code 两种工具的构建产物。源码在私有 Gitea，CI 自动构建并推送到本仓库。

## 插件清单

| 插件名 | 目标工具 | 子目录 | 说明 |
|--------|---------|--------|------|
| `shw-plugins-zcode` | ZCode | `zcode/` | 含 9 个 skills + 6 个 commands + 1 个 MCP（shw-spec） |
| `shw-plugins-kimi-code` | Kimi Code | `kimi-code/` | 同上（Kimi Code 格式清单） |

## 安装

### ZCode 客户端

1. 打开 **Settings → Plugin Management → Discover** 标签
2. 点右上角 **`+`** 按钮 → 选「GitHub 仓库」
3. 填入：`ilovintit/shw-plugins`（或完整 URL `https://github.com/ilovintit/shw-plugins`）
4. 加为 marketplace 后，在 Discover 列表找到 **shw-plugins-zcode** → 点 **Get** 安装

### Kimi Code 客户端

参考 Kimi Code 官方文档，用本仓库的 GitHub URL 安装，插件名为 **shw-plugins-kimi-code**。

## 包含的 Skills

| Skill | 作用 | 触发场景 |
|-------|------|---------|
| `shw-commit` | 任务完成后主动 commit 到本地 git | 内部专用，主 Agent 完成任务时自动触发 |
| `shw-ddd` | PHP+Hyperf 的 DDD 四层架构规范 | 用户提到 DDD、目录结构、文件归属时 |
| `shw-debugging` | 强制 4 阶段根因分析 | 遇到 bug、测试失败、异常行为时 |
| `shw-parallel` | 并行任务委派决策框架 | apply 命令遇到 2+ 独立 task 时 |
| `shw-review-change` | 审查 change artifact 与 explore 上下文一致性 | propose 完成后 |
| `shw-review-code` | 逐字符审查代码与 change 设计的一致性 | apply 完成后 + 归档前 |
| `shw-tdd` | 强制 RED-GREEN-REFACTOR 流程 | 写实现代码前 |
| `shw-verify` | 声称前强制运行验证并附真实输出 | 任务完成前 |
| `shw-workflow` | 8 步模块开发工作流知识库 | 执行多 step 联动 task 时 |

## 包含的 Commands

| Command | 作用 |
|---------|------|
| `/shw-init` | 初始化项目 — 创建 `.changes/` + `specs/` 目录 + AGENTS.md 配置 |
| `/shw-propose` | 通过 explore + propose 制定一个 change |
| `/shw-explore` | 启动探索模式分析需求 |
| `/shw-apply` | 通过并行 Agent 调度实现 change 任务（含自驱收敛审查） |
| `/shw-sync` | 同步 delta spec 到主 spec |
| `/shw-archive` | 归档已完成的 change |

## 包含的 MCP

| MCP | 作用 | 是否需要配置 |
|-----|------|------------|
| `shw-spec` | Spec-driven 工作流引擎（变更管理工具） | 无需配置，开箱即用 |

> 其他 MCP（k8s-proxy / gitea / 智谱系列）当前版本暂未启用，后续版本会按需开放。

## 版本

当前版本见根目录 `marketplace.json` 的 `plugins[].version` 字段。

发版历史见本仓库的 [Tags](../../tags)。

## 源码与贡献

本仓库是构建产物，源码托管在私有 Gitea（`shw-project/shw-plugins`）。如需贡献或查看实现细节，请联系维护者。

## License

MIT
