# 工具契约与恢复

所有工具以服务端实际 schema 为准。`claim_id` 为 16–128 位字母/数字/下划线/连字符，推荐随机 UUID。它是调用方保存的协作句柄，不是身份认证；查询不会披露别人的句柄。具有本机文件权限的程序仍能绕过本工具。

| 工具 | 输入 | 行为 |
| --- | --- | --- |
| acquire | repository、issue、claim_id；可选 kind/branch/owner | 自动登记和创建；同 claim 重试复用；其他 active claim 拒绝 |
| inspect | id | 返回当前路径、分支、HEAD、dirty、忽略文件数及异常说明 |
| list | 可选 include_removed | 列出登记工作区，默认不含 removed |
| release | id、claim_id | 释放占用，文件与分支保留；不得继续写已释放工作区 |
| remove | id、claim_id；可选 discard_ignored | 验证干净、属于该 Git 仓库且已合入来源后清理；不提供 force |
| reconcile | 无 | 恢复已建成但未登记完成的状态；报告其他中断、缺失或未登记目录，保留文件 |

kind 为 feat（默认）、bug、chore 或 hotfix。前三者来源 origin/dev，hotfix 来源 origin/main；branch 默认 `<kind>/<Issue>-work`。自定义分支也必须含编号，普通可用 codex/feat/bug/chore 前缀，Hotfix 仅 hotfix 前缀。已存在的非受管分支/目录不自动采纳。

inspect/list 中 branch 为登记分支；Git 不匹配时返回 note，其他观察值可能不可用，应先处理异常。

创建成功后返回 `root` 和 `result`，result 包含 id/path/branch/base/state。后续工具不接受任意删除路径。创建并发通过同一 root 的文件锁协调；Git 和索引之间发生中断，用中间状态恢复，不宣称跨 Git/JSON 的原子事务。

| 错误/状态 | 处理 |
| --- | --- |
| CLAIM_MISMATCH | 当前仍被其他 claim 占用；查 owner 标签并协调原持有者释放 |
| STATE_BUSY | 其他管理操作正在执行，稍后重试；不要删锁文件 |
| PATH_EXISTS / BRANCH_EXISTS | 现有目录/分支未由此记录管理；保留并查明归属 |
| creating | 同 claim 重试 acquire；Git 已创建完整工作区时 reconcile 可补齐 active |
| removing | 同 claim 重试 remove；reconcile 只报告缺失/剩余分支，不代替检查后删除 |
| DIRTY_WORKTREE / IGNORED_FILES | 保留数据，检查真实文件后再处理；仅可丢弃忽略文件时使用专用参数 |
| MERGE_NOT_PROVEN | Git 祖先关系不成立，含 squash/rebase 场景；保留现场并核验 PR，不自动强删 |
| STATE_INVALID / UNSAFE_PATH / HEAD_CHANGED | 停止管理修改，报告索引、路径或分支发生异常；不能手改索引绕过 |

删除只处理受管工作区和本地交付分支，不删除主工作区、不删除远端分支、不执行 reset/clean/force。断线、会话结束和时间流逝都不触发清理。
