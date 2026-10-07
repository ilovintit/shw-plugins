# 工具契约与恢复

所有工具以服务端实际 schema 为准。`claim_id` 为 16–128 位字母/数字/下划线/连字符，推荐随机 UUID。它是调用方保存的协作句柄，不是身份认证；查询不会披露别人的句柄。具有本机文件权限的程序仍能绕过本工具。

| 工具 | 输入 | 行为 |
| --- | --- | --- |
| acquire | repository、issue、claim_id；可选 kind/branch/owner | 自动登记和创建；同 claim 重试复用；其他 active claim 拒绝 |
| inspect | id | 返回当前路径、分支、HEAD、dirty、忽略文件数及异常说明 |
| list | 可选 include_removed | 列出登记工作区，默认不含 removed |
| release | id、claim_id | 释放占用，文件与分支保留；不得继续写已释放工作区 |
| remove | id、claim_id；可选 discard_ignored | 验证干净、属于该 Git 仓库且已合入来源，本地来源分支可安全快进后，清理工作区和本地 Issue 分支，并同步本地来源分支；不提供 reset/force |
| reconcile | 无 | 恢复已建成但未登记完成的状态；报告其他中断、缺失或未登记目录，保留文件 |
| prune | 可选 dry_run（默认 true，仅报告） | 回收无效登记与已交接工作区：清除 removed 历史；目录已不存在且分支不存在/已合入的登记（已合入分支 `-d`）；released 或中断 removing、干净且已合入的工作区（被忽略文件一并删除）。active、dirty、未合入的一律保留，已合入且干净的 active 只列为候选。不快进用户主 checkout 的本地来源分支 |
| takeover | id、claim_id、reason；可选 owner | 仅在原会话已归档或明确失联、且现场经 inspect 可核验时人工转交 claim；不会删除、重置、重建或按时间抢占工作区 |

kind 为 feat（默认）、bug、chore 或 hotfix。前三者来源 origin/dev，hotfix 来源 origin/main；branch 默认 `<kind>/<Issue>-work`。自定义分支也必须含编号，普通可用 codex/feat/bug/chore 前缀，Hotfix 仅 hotfix 前缀。已存在的非受管分支/目录不自动采纳。

inspect/list 中 branch 为登记分支；Git 不匹配时返回 note，其他观察值可能不可用，应先处理异常。

创建成功后返回 `root` 和 `result`，result 包含 id/path/branch/base/state。后续工具不接受任意删除路径。创建并发通过同一 root 的文件锁协调；Git 和索引之间发生中断，用中间状态恢复，不宣称跨 Git/JSON 的原子事务。

| 错误/状态 | 处理 |
| --- | --- |
| CLAIM_MISMATCH | 当前仍被其他 claim 占用；查 owner 标签并协调原持有者释放 |
| 接手已归档/失联会话 | 先 inspect 核验路径、分支与脏状态，再用包含事实原因的 takeover；不能把活跃会话、creating/removing 状态或单纯超时当作可接手 |
| STATE_BUSY | 其他管理操作正在执行，稍后重试；不要删锁文件 |
| PATH_EXISTS / BRANCH_EXISTS | 现有目录/分支未由此记录管理；保留并查明归属 |
| creating | 同 claim 重试 acquire；Git 已创建完整工作区时 reconcile 可补齐 active |
| removing | 同 claim 重试 remove 完成剩余清理；中断可能已先解除 Git 工作区登记而目录仍残留，该中间态同样续走删目录/删分支/同步来源分支，inspect 的 UNREGISTERED_WORKTREE 提示不代表需要人工介入（#312）；已确认可丢弃的工作区含只读 Go 模块缓存目录时，remove 仅为目录补 owner 写权限后删除，不跟随符号链接（#322）；工作区含 submodule 时 Git 永不移除该工作树，前置检查通过后改为删除受管目录并 `git worktree prune` 清理登记，其他失败原因仍保留现场（#363）；reconcile 只报告缺失/剩余分支，不代替检查后删除 |
| DIRTY_WORKTREE / IGNORED_FILES | 保留数据，检查真实文件后再处理；仅可丢弃忽略文件时使用专用参数 |
| MERGE_NOT_PROVEN | Git 祖先关系不成立，含 squash/rebase 场景；保留现场并核验 PR，不自动强删 |
| LOCAL_BASE_MISSING / LOCAL_BASE_DIRTY / LOCAL_BASE_DIVERGED / LOCAL_BASE_CONFLICT | 本地来源分支缺失、有未保存文件、与远端分叉或处于冲突占用状态；保留 Issue 工作区与分支，人工处理本地来源分支后重试 |
| STATE_INVALID / UNSAFE_PATH / HEAD_CHANGED | 停止管理修改，报告索引、路径或分支发生异常；不能手改索引绕过 |

删除只处理受管工作区和本地交付分支，不删除主工作区、不删除远端分支、不执行 reset/clean/force。完成清理时会把本地 `dev`（Hotfix 为 `main`）快进到刚 fetch 的 `origin/*`；若来源分支脏、分叉、缺失或无法安全更新，则在破坏性清理前拒绝并保留现场。断线和会话结束不触发清理；时间流逝只会触发下文的自动 prune，它不回收任何 active 占用。

## prune 与自动清理（#358）

三端宿主共享同一 root，released 工作区与失效登记会持续累积占用磁盘。prune 在记录锁内对每条最新记录复核后才执行，他人并发改动时跳过（KEPT: STATE_CHANGED）；回收已交接工作区完整复用 remove 的安全检查（干净、`MERGE_NOT_PROVEN`、Git 登记等），但不检查也不快进用户主 checkout 的本地来源分支，避免后台改动用户工作区文件。目录已不存在而分支未合入的登记保留（UNMERGED_BRANCH），否则再次 acquire 会撞上 BRANCH_EXISTS，未合入提交也可能被遗忘。

服务器启动约 30 秒后在后台执行一次非预览 prune：`<root>/prune.lock` 非阻塞互斥，`<root>/prune.stamp` 的修改时间保证三端合计 24 小时至多一次，单次上限 5 分钟，进程退出时取消。结果摘要只写 stderr。关闭方式：环境变量 `SHW_WORKTREE_AUTO_PRUNE=0`，或 worktree.json 中 `"auto_prune": false`。CANDIDATE_ACTIVE 条目需由持有会话 remove，或确认原会话已失联后 takeover 再 remove。

## 缺失目录、创建中断与诊断（#90）

active/released 目录缺失时，经正常 acquire 和原登记路由恢复原分支内容；active 仍要求原 claim，released 允许显式接手。恢复前验证仓库、受管父目录和分支归属，只清除该缺失路径的 Git 登记，不 prune 其他工作区、不 reset 分支、不丢失未合入提交。已丢失的未提交文件不能靠 Git 恢复，必须明确这一限制。

creating 记录有分支但无目录时重用原分支；分支也未创建时，仅按登记 BaseSHA 重试创建。完整工作区可由 reconcile 补登记；非空/半成目录和缺失的 active 分支保留并报告。持有者先 inspect/reconcile 核对数据，由用户保全半成目录或恢复丢失分支后，再正常 acquire；禁止 force、借用 claim 或手改索引。

reconcile 逐项报告记录校验和目录扫描错误，继续检查其他有效记录；损坏 JSON/索引结构仍整体拒绝。只自动清理当前用户所有、0600 普通单链接文件且与已提交 state.json 字节完全相同的 .state-* 副本；不同内容、符号链接和其他异常副本保留报告，不根据时间抢占或删除。

STATE_BUSY 提供当前持锁 PID/操作提示。Kimi Code、Codex、Claude Code 各自启动独立服务器进程，共享同一 root：全局 state.lock 只保护 state.json 读改写；同一工作区的 Git 变更由 locks/<id>.lock 串行，慢 fetch 可占用该工作区锁至 Git 30 秒预算，不阻塞其他工作区与 list/inspect。等待锁最多 5 秒后返回 STATE_BUSY。锁由内核随持有进程退出释放，锁文件永不删除：删除正被持有的锁文件会让其他进程在新文件上加锁并同时写状态。稍后重试即可。提交时若记录已被其他进程改动返回 STATE_CHANGED，先 inspect 再重试。list/inspect 为只读快照，单次调用预算 25 秒；list 同仓库共享 Git 事实、并发观测，目录缺失的记录不执行 Git，超出观测预算的条目标记 OBSERVE_SKIPPED（改用 inspect 查看）。Git 超时/取消返回 GIT_TIMEOUT；其他错误报告认证/网络/权限/冲突等类别。`worktree remove` 的权限错误只有在能从 stderr 验证工作区内路径时才补充相对 `failed_path`；不回显原始 stderr、远端 URL 或凭据。网络恢复后使用原编号、路由与 claim 重试。
