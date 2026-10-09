---
name: shw-hyperf-conventions
description: 仅 PHP+Hyperf 栈。Hyperf 框架的通用编码落地约定。在 PHP+Hyperf 项目写代码、新建文件、Code Review，涉及分层装配/依赖注入/错误处理模式/Controller 职责/参数校验/PHP 命名/命名归一化时自动触发。不讲组件库用法（组件查公司 lib 仓库文档，见 shw-lib-docs），只讲"PHP/Hyperf 里怎么写"。最近 composer.json 含 hyperf/hyperf 时适用。
---

**执行前置**：先读 [适用模式与权限](../shw-issue-gate/SKILL.md)。仅修改当前已确认项目工作目录；项目外只读，未知修改不得覆盖。涉及写入先按 [工作区能力契约](../shw-workspace/SKILL.md) 确认所有权，不强制依赖本地 worktree 插件。

# PHP / Hyperf 按需契约

仅最近 `composer.json` 含 `hyperf/*` 且正在修改/审查 PHP 时加载；Go 项目不加载 PHP 配方。先读 [DDD](../shw-ddd/SKILL.md)，组件契约经 [lib 文档](../shw-lib-docs/SKILL.md) 读取当前锁定版本。

- 使用项目既有 Module 四层目录及 PSR-4 映射，文件声明 `strict_types=1`；Domain 不引用 Hyperf/Eloquent。
- 通过 Hyperf 容器绑定仓储接口与实现；Controller 只取参、调 UseCase 和响应，数据范围在用例；参数校验与业务规则分层。
- 统一处理器保持错误分类语义，按实际依赖使用 Res 响应；不在 Controller 随意拼 JSON 或逐层吞异常。
- 金额用 decimal string + bcmath，禁止 float 和普通浮点运算；PHP版本支持确认后才用 readonly/enum。
- DB snake_case 与应用 camelCase 的归一化集中在边界，不在各层散写转换。

具体实现前读取下方对应主题；示例不是最新组件 API 的证据，不扩展已有授权或业务测试时机。

**测试时机**：开发阶段必须执行类型检查、适用 lint/静态检查及本次改动涉及的单元与单模块 API 快速测试；全量 E2E、VRT、全量 API 等长周期回归集中到 dev→main 集成。必要构建部署正常执行；快速检查通过不替代人工体验，tag 不新增测试阶段。

## 按需加载（执行对应动作前必读）

下列文件随插件版本分发，属于执行规范。按改动主题读取并记录所用路径；找不到时报告缺口，不以记忆替代。多个主题命中时全部读取。

| 触发条件 | 本地规范 |
|---|---|
| 涉及项目分层装配（架构规范：shw-ddd） | [1. 项目分层装配（架构规范：shw-ddd）](references/layout-and-di.md) |
| 涉及错误处理模式（错误三分类语义：公司 lib 仓库文档） | [2. 错误处理模式（错误三分类语义：公司 lib 仓库文档）](references/error-handling.md) |
| 涉及Controller / 请求实现（架构规范：shw-ddd） | [3. Controller / 请求实现（架构规范：shw-ddd）](references/controllers.md) |
| 涉及PHP 命名约定 | [4. PHP 命名约定](references/naming-and-money.md) |
| 涉及命名归一化层 | [5. 命名归一化层](references/normalization.md) |
