# 集成测试执行与覆盖

执行前读取 `shw-integration/references/candidate.md`。仅在dev→main冻结候选流程运行；不存在独立dev非阻断回归或发布后基线维护流程。

## 覆盖

默认比较全部适用既有API/E2E/VRT基线；项目无浏览器/API等对象时按实际范围显式声明适用suite及依据，不能为消除失败临时删除suite。模块/文件选择器只用于本集成流程的诊断，结果标partial，不能升级为完整放行。

API固定角色、受控数据和语义断言，注明真实服务/stub边界；E2E固定起止状态及清理，保留trace/日志；VRT固定浏览器、字体、视口、时区、数据、动画和就绪条件，输出expected/actual/diff。

目标代码tree、配置、fixture和基线revision必须与候选相符。缺目标、权限或环境故障标execution-error；目标漂移标obsolete-target；无基线标unbaselined。不能将汇总job完成改写为测试通过。

## 处置与基线

差异先分类：环境故障修复重跑；已验收预期变化逐项映射Issue/AC/人工验收证据，只更新对应候选断言或基线并复跑；意外回归/未知定位修复，行为变化重新体验及验收后冻结新候选。

初始基线须对应候选已人工验收且场景正常执行，建立候选后再复跑。生成、同步、删除均有范围与理由；合法退役断言需明确验收与审查，不能为测试变绿删断言。禁止全量接受快照和回滚正确行为迎合旧断言。

基线仅写当前集成PR的隔离分支，不污染dev或正式存储。通过合并且实际merge结果一致才晋升。main/正式基线/候选变化使旧结果失效，重算检查。

## 证据

报告candidate fingerprint、PR/head、dev/main base、premerge tree、实际目标revision/digest、基线revision、suite/coverage、分类、验收引用、run/job/工件。unchanged仅证明已覆盖行为一致；partial/unbaselined不能作为通过；环境修复和基线复跑不替代人工验收。
