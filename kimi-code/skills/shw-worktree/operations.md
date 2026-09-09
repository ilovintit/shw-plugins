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

## 缺失目录、创建中断与诊断（#90）

active/released 目录缺失时，经正常 acquire 和原登记路由恢复原分支内容；active 仍要求原 claim，released 允许显式接手。恢复前验证仓库、受管父目录和分支归属，只清除该缺失路径的 Git 登记，不 prune 其他工作区、不 reset 分支、不丢失未合入提交。已丢失的未提交文件不能靠 Git 恢复，必须明确这一限制。

creating 记录有分支但无目录时重用原分支；分支也未创建时，仅按登记 BaseSHA 重试创建。完整工作区可由 reconcile 补登记；非空/半成目录和缺失的 active 分支保留并报告。持有者先 inspect/reconcile 核对数据，由用户保全半成目录或恢复丢失分支后，再正常 acquire；禁止 force、借用 claim 或手改索引。

reconcile 逐项报告记录校验和目录扫描错误，继续检查其他有效记录；损坏 JSON/索引结构仍整体拒绝。只自动清理当前用户所有、0600 普通单链接文件且与已提交 state.json 字节完全相同的 .state-* 副本；不同内容、符号链接和其他异常副本保留报告，不根据时间抢占或删除。

STATE_BUSY 提供持锁 PID/操作提示；全局锁保证状态和 Git 变更串行，慢 fetch 可占用至 Git 30 秒预算，等待锁默认最多 10 秒。稍后重试，不删锁。Git 超时/取消返回 GIT_TIMEOUT；其他错误只报告认证/网络/权限/冲突等类别，不回显原始 stderr、远端 URL 或凭据。网络恢复后使用原编号、路由与 claim 重试。
