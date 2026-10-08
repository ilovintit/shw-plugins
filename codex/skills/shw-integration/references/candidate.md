# 冻结候选、差异与基线晋升契约

本文件是执行约束，集成入口必须加载，不能仅存知识库。

## 候选记录

在集成PR保存可审阅记录。随版本分发的 [candidate-policy.mjs](candidate-policy.mjs) 是纯决策模块，不能代替Git、CI、验收、合并权限或部署取证。调用方必须先采集真实证据；模块不会连接系统、运行测试、合并或发布。

`freezeCandidate(input)` 接受：`id`、`devSha`、`integrationHeadSha`、`mainBaseSha`、`tree`（预合并结果）、`baselineRevision`（正式）、`candidateBaselineRevision`、`issues`、`includedCommits`、`requiredSuites`（实际适用api/e2e/vrt/unit/contract）、`testConfigRevision`、`environmentRevision`、`fixtureRevision`、`targetRevision`、`targetTree`、`acceptances`。targetTree必须等于已测预合并tree；targetRevision是实际部署目标/制品身份，不与dev/main提交混同。测试配置、环境、fixture或目标任何变化都参与fingerprint并使旧结果失效。每项验收包含`issue/commit/digest/tree/buildInputs/evidence/accepted: true/changedAssertions`。调用方用Git证明includedCommits在候选中、后续修改未使验收失效，逐项核对changedAssertions的已验收范围；不能输入自称验收或任意旧commit。另在PR记录仓库、部署revision、测试配置、fixture和完整构建输入。

集成PR从冻结dev建立独立集成分支；候选基线和已审冲突解决只在此分支提交，`integrationHeadSha`随之变化，不能写入dev污染开发线。`tree`由当前main基点与该集成HEAD预合并计算；devSha仍记录最初业务来源，不与HEAD混淆。

模块用法为ESM导入：`import { freezeCandidate, assertCurrent, classifyDifference, checkCandidate, promoteBaseline, canReuseDigest } from './candidate-policy.mjs'`。freezeCandidate返回标准化候选与fingerprint；assertCurrent比较新采集快照；classifyDifference返回修环境重跑、局部候选更新重跑或调查修复；checkCandidate要求绑定fingerprint/tree/candidateBaselineRevision/runId及实际测试配置、环境、fixture、目标revision/tree的全部适用suite通过以及基线修改后的复跑证据，返回checked记录；promoteBaseline核对真实merge父提交/tree并返回mainCommit及晋升baselineRevision；canReuseDigest比较来源、tree和buildInputs。

输出是决策辅助，不是签名或不可伪造证明。调用方必须从可信CI结果构建result、从Git读merge事实、保存日志链接并执行原子目标守卫，不能手填passed绕过证据。未知字段所代表的事实必须阻塞相应放行，不能填猜测值。

预合并结果必须以冻结main基点和dev提交计算。冲突解决也是候选内容，涉及行为变化须重新体验及验收。只冻结dev SHA而遗漏main变更不构成候选。候选断言/基线变更进入同一个集成PR，更新head/tree后重新计算并检查；验收映射保持指向实际被验收的业务实现，不能把测试文件更新伪称用户验收。

测试目标必须可证明运行候选代码与受控配置/数据；共享dev环境若已前进不能继续测旧候选。使用隔离集成目标或核实精确revision，不能将目标漂移归为可忽略环境问题。

## 差异决策

| 分类 | 需要的证据 | 后续 |
| --- | --- | --- |
| 环境故障 | 服务/认证/fixture/浏览器/依赖异常，不能证明行为差异 | 修复环境，在相同有效候选重跑；不写基线 |
| 已验收预期变化 | 差异逐项映射AC与当前候选人工验收引用 | 仅更新对应断言或本PR候选基线，审查差异并重跑 |
| 意外回归 | 与批准范围无关的行为破坏或既有契约失败 | 定位修复；业务行为变化重新体验及验收，重新冻结再测 |
| 未知 | 原因或验收对应关系不清 | 保留失败证据并调查，不能放行或更新基线 |

不能只为旧测试变绿回滚正确实现，不能全量接受快照、删除断言、提高阈值或缩小选择器掩盖问题。合法删除已退役行为的断言必须有明确范围/验收证据和审查，不能作为失败兜底。

无旧基线：先运行场景，确保执行正常且对应候选已经人工验收；建立初始候选基线，再在相同候选/fixture上复跑。unbaselined或空选择不能直接写成pass。部分诊断不代替全部适用基线比较。

## 晋升与并发

候选基线只能写本集成PR范围，不能写正式分支或共享基线存储。所有检查成功、审查和授权满足后正常merge；只有该PR成功合并且实际merge结果验证一致，候选才成为正式基线。失败/关闭/过期PR不晋升。

每次运行前、放行前及合并前读回dev候选、PR HEAD、main当前基点、正式基线revision；任一变化都使旧结果失效，重新计算预合并候选、评估验收覆盖并重新检查。并发集成不能以后完成的旧基线覆盖新基线；平台需原子目标基点守卫/合并队列或等效串行锁，无法保证时停止自动合并。只在本地检查一次再盲目merge不满足要求。

合并后记录main merge SHA、两个父提交和tree，确认等于已测预合并结果（含已审候选基线）。不一致立即标记未验证，不触发生产，重新建立验证记录。main验证可复用等价候选结果；若需重跑仍属于本集成流程。

## 制品来源

dev SHA与main merge SHA不同。记录build_source_sha、source_tree、构建配置/锁文件/依赖/工具链/参数/构建期变量的指纹、artifact_digest及对应main SHA。只有构建输入一致且可追溯，才能复用此前已验证digest；否则在集成流程构建验证新的候选制品。发布选择已通过集成的提交/制品，tag阶段不追加自动测试。
