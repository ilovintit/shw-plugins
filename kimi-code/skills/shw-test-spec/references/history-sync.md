# 集成候选恢复与历史漂移

恢复时重新读取PR HEAD、冻结dev、main基点、预合并tree、正式/候选基线和验收范围，按 `shw-integration/references/candidate.md` 重算fingerprint。任一变化使旧放行失效，重新检查，不能仅因两个提交tree看似相同就套用另一PR结果。

通过后正常merge到main，实际merge的first parent须为冻结main基点、second parent为集成分支HEAD，tree须等于已测候选。该集成分支来自冻结dev并只承载已审的集成解决/候选基线更新；不是移动dev的别名。

合并后只在精确等价证据成立时复用该候选的检查；缺证据、目标或基线并发变化必须重新建立候选/检查。平台需要原子目标守卫、合并队列或等效串行锁；不可保证则停止自动合并。候选全量回归仍属于集成，不移到 tag；开发快速检查继续执行。
