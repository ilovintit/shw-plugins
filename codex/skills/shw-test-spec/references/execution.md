# 回归选择与证据

## 已有基线比较

默认选择全部已建立且适用于候选 SHA 的基线，不按 changed files 缩小。模块/文件选择器只用于诊断或人工定向运行；空选择不得暗中变成写基线，定向结果必须标为 `partial`。

示例入口可按项目栈实现为 `regression compare --source <sha> --all-baselined`、`--module order` 或 `--file tests/regression/api/order.spec.*`。项目统一入口必须保留选择器，不依赖运行顺序，并将 source、目标 revision、baseline revision 与 coverage 写入报告。

1. API：准备并清理受控数据，比较语义断言；输出字段/权限/状态差异，标明真实服务与 stub 边界。
2. E2E：固定角色、依赖、起止状态与重置方式；输出 trace、日志与失败步骤。
3. VRT：固定浏览器、字体、视口、时区、数据、动画和就绪条件；输出 expected/actual/diff 与阈值。

无基线为 `unbaselined`，环境/认证/数据故障为 `execution-error`，实际目标不匹配为 `obsolete-target`。这些都不能触发重录。

## 基线维护

生成与复跑必须显式传入 accepted source 和 acceptance evidence，且写路径只对独立维护 Issue 开放。先生成候选到隔离位置，逐项审查与 accepted scope 的一致性，再在同一目标和 fixture 上复跑；通过审查后才更新 tests 与 manifest。

首次生成、同步、删除基线都记录原因和覆盖范围。删除只有在已确认行为不再适用且验收范围明确时允许；不能用删除消除疑似回归。

## 证据边界

- `unchanged` 只说明已覆盖范围与既有基线一致，不证明功能整体正确。
- `partial` 不得升级为全量结论；`unbaselined` 不得写成通过。
- `expected-change-pending-acceptance` 仍沿用旧基线且不更新。
- `suspected-regression` 进入调查，必要时建 Bug；基线 PR 不夹带业务修复。
- 生成/复跑 run 证明记录稳定，不替代最终人工验收。
