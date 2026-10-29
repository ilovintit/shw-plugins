# Mac mini 接入和回归

用户在 Mac mini 安装所用宿主的 shw-local-test 插件，并准备 Python 3、项目锁定工具链和 Docker/OrbStack。插件包本身不安装任何软件。脚本位置是本 skill 目录下的 ports.py；下文用 PORTS 指向该绝对路径，不能用其他机器上的路径。

主机唯一登记表默认 `~/Library/Application Support/shw-local-test/registry.json`，主机锁为同目录 registry.lock。文件 0600、目录 0700；所有项目/宿主使用同一当前用户及目录。可显式 --registry 选择同一个绝对目录，不能每项目选不同表，也不能跨主机/网络文件系统共享。首次调用由程序创建；项目 Agent 不直接编辑该表。这是独立 provider 按用户授权管理自身状态，不能扩大普通项目的外部文件写权限。

```sh
python3 "$PORTS" list
python3 "$PORTS" reserve --project example --repository /absolute/main-checkout \
  --resource postgres --resource valkey --resource rabbitmq --resource api-e2e --resource api-vrt
```

reserve 返回稳定 resource→port。也可用 `--port postgres=11004` 等导入现有预留；新申请会检查跨项目重复、真实监听及同项目重复。重复 reserve 保留原登记，活动租约时拒绝改端口。不自动扫描其他仓库，也不把未登记旧 ports.yaml 当作权威记录。正在监听的旧端口需先确认服务所有者、由用户安排停止后导入，不能仅凭项目声称就认领。

将返回端口写入本项目 `.shw/test-runtime.json`（模板同目录 example-runtime.json），同步项目 Compose 和 API/H5 配置。首次接入在该项目独立 Issue/worktree 完成。模板不含镜像、命令或凭据：这些必须来自项目实际实现，不伪造通用可运行配置。

```sh
python3 "$PORTS" check --project example
python3 "$PORTS" acquire --project example --suite e2e \
  --worktree /absolute/test-worktree --sha FULL_SOURCE_SHA
# 记录私有 token；按项目入口运行已请求范围，并保存报告。
python3 "$PORTS" release --project example --suite e2e --token RETURNED_TOKEN
```

check 输出 busy，存在监听时退出 2。它不是健康检查；复用已有项目中间件时，项目启动器须额外核对 Docker Compose 标签/volume、镜像 digest、映射和健康状态，并区分归属已确认的中间件与冲突的 API/H5。acquire 核对同 Git common-dir、clean checkout 和精确 SHA，不获取工作区所有权、不自动 checkout。必须先由项目工作区 provider 确认独占。

CCL 现有入口 `tools/test-local/run.py` 是接入起点：保持该项目本地请求/来源/隔离保护，迁移其只读端口扫描为此登记表查询与登记结果比对，并把项目+suite 租约串入入口 finally 清理链。其他项目同样接入；未接入的项目不宣称受到全局保护。本轮不修改其他业务仓库，也不代运行 CCL 回归。

崩溃恢复：list 查看 suite 的 worktree/SHA/时间；确认对应测试进程已停、容器/资源归属，再由原持有者用 token release。没有自动超时、强制接管或 kill。停掉项目全部已确认服务、释放全部租约后，`unregister --project example` 才可撤销登记；仍有监听则拒绝。不因进程 PID 被复用推定测试仍活跃。

本仓库的测试入口迁为本地：clean 固定提交下设置 `SHW_TEST_REQUEST`（本次请求摘要）和 `TEST_SOURCE_SHA`，执行 `node scripts/test.mjs --module ...` 或 `--file ...`，需要日志时将 stdout/stderr 重定向至当前工作区 `.cache/local-test/` 内。未选范围不会默认全量；不设置 CI/GITHUB_ACTIONS。所有测试结果留本地，不向 Gitea commit 状态写回。历史 test 分支不删除；业务仓库线上手动测试 workflow 需要各项目另行授权迁移。
