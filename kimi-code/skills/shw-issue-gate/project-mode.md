# SHW 项目模式

SHW 默认不接管 Git 仓库。只有仓库根的 `.shw/project.yaml` 声明有效模式时，入口闸门才生效：

```yaml
version: 1
mode: issue-main
```

模式只有三种：

- `issue-main`：Issue 分支直接合并 `main`，只启用 Issue/worktree/PR/CI 证据闭环。
- `issue-dev`：Issue 分支先合并 `dev`，再由 `dev` 合并 `main`；不启用业务项目目录和完整业务发布规范。
- `managed`：完整业务项目生命周期，包含标准目录、dev→main 测试和发布/部署规范。

没有该文件表示普通项目，SHW 不主动应用生命周期约束。旧 `.shw-workflow-ignore` 仅作兼容迁移识别，新项目不生成；与新配置并存时停止并要求用户通过 update 明确处理。

`shw-init` 只面向空项目，必须让用户选择模式并生成配置，不检测或复用现有模式。`shw-update` 面向存量项目：有模式时默认复用；无模式或用户明确要求变更时，先确认目标模式，完成迁移后才覆盖配置并回写 Issue。不能根据目录、分支或技术栈自动猜测或切换模式。
