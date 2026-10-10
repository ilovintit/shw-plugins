# 用户主动要求的独立测试执行

测试仅在用户明确主动要求时，于独立 `test` 分支执行。开发、dev→main 集成、发布、部署和环境体验都不隐含测试请求；push 到 test 也不是请求。workflow 仅使用 `workflow_dispatch`，并守卫 ref 等于 `refs/heads/test`。手动事件只是执行入口，还须记录用户请求和本次范围。

## 范围与身份

按用户要求选择单元、模块/API、全量 API、E2E、VRT、回归或冒烟；不自动扩大 suite。记录业务来源 SHA、test HEAD/tree、实际目标 revision/digest、配置、fixture 和基线 revision，参见 `shw-integration/references/candidate.md`。test 快照不是发布来源，不默认 test→main。

目标代码、配置、fixture 和基线必须与本次记录一致；缺目标、权限或环境故障标 execution-error，漂移标 obsolete-target，无基线标 unbaselined。不能把汇总 job 完成或部分用例通过写成全部通过。生产/test 环境访问仍受明确授权约束，不因请求测试获取额外凭据或权限。

## 差异与基线

差异先区分环境故障、已确认预期变化、疑似回归和未知。保留实际证据，按用户请求调查或更新具体断言/基线；不全量接受快照，不为变绿删除断言或回滚正确行为。生成、同步、删除基线必须有来源、范围与理由，复跑仅在本次主动请求内手动进行。

基线维护在独立 test 分支或另行授权区域进行，不污染 dev/main，不随集成/发布自动晋升。测试失败、未运行或无基线不阻挡已授权发布；实际发现的业务问题如实报告，由用户裁决下一步。

## 报告

记录主动请求、来源/test HEAD/tree、实际目标 revision/digest、基线 revision、suite/coverage、差异分类、run/job/工件及执行状态。unchanged 仅证明已覆盖范围一致；partial/unbaselined 不冒充全部通过。测试结果、构建、部署和用户实际体验分别记录。

测试状态按提交SHA而非分支隔离：test候选必须是独立的test-only提交，不能是dev/main当前可达的提交。准备候选时保留选定源码SHA和tree，可以用相同源码tree生成仅供test的快照提交；保护已有test历史，不强推或重置。手动入口刷新dev/main引用并拒绝会把测试状态写到开发/发布提交上的候选。test快照本身不合入dev/main，修复走普通Issue分支；运行报告同时记录test SHA与原始来源。
