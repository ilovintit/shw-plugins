# 8. 启动入口与多角色部署

Go 服务「HTTP API 与后台 Worker 分离运行、同二进制多角色」的部署形态约定。核心模型：**角色选择在启动参数（子命令），worker 编成唯一由部署层环境变量决定**；镜像与二进制恒定，永不因角色分叉。

### 落地决策：单二进制多角色（gcmd 子命令树）

启动入口集中在 `internal/framework/cmd` 包，用 gcmd 子命令树：根命令 + `server` / `worker` / `migrate` / `seed` 等子命令挂在同一个 main.go 上。**不按角色拆多个二进制、多个 main 包**。

```go
// internal/framework/cmd/cmd.go
var (
    serverCmd = gcmd.Command{ Name: "server", Brief: "启动 HTTP API 服务",
        Func: func(ctx context.Context, parser *gcmd.Parser) error { return startServer(ctx) } }

    workerCmd = gcmd.Command{ Name: "worker", Brief: "启动后台 Worker",
        Func: func(ctx context.Context, parser *gcmd.Parser) error { return startWorker(ctx) } }

    Main = gcmd.Command{ Name: "myapi", Usage: "myapi [server|worker|migrate|seed]" }
)

func init() { Main.AddCommand(&serverCmd, &workerCmd) }

// main.go：boot.Setup() 装配 → cmd.Main.Run(gctx.GetInitCtx())
```

### startWorker：一行式统一注册

worker 启动收敛为调用公司 lib 的统一注册入口（**跑哪些由部署决定，代码全量注册**）：

```go
func startWorker(ctx context.Context) error {
    return worker.RunEnabled(ctx,
        tasks.NewOrderSyncWorker(orderRepo),
        tasks.NewBillGenWorker(billRepo),
        // 全量列出项目所有 Worker，不写任何 if 开关
    )
}
```

`RunEnabled` 固定读 `ENABLE_WORKERS` 环境变量（逗号分隔白名单）过滤实际启动的 worker。契约细节（fail-closed：未设不启动任何 worker、白名单含未知名拒绝启动、显式列举无通配、注册重名报错）定义在公司 lib 仓库 worker 文档（**shw-lib-docs** 指路）。

**开关唯一真相源在部署层**：worker 跑哪些只由 `ENABLE_WORKERS` 决定，Worker 基础类不自带第二套运行开关，项目侧也不手写过滤逻辑。并发安全（分布式锁）等保护等级是**编码时选基础类 / 构造选项的属性**，与部署编成无关。

### Dockerfile 契约：镜像恒定

```dockerfile
ENTRYPOINT ["<二进制>"]
CMD ["server"]
```

默认 server，其他角色由部署侧覆盖 **args** 切换。同一镜像可跑全部角色，**不按角色构建不同镜像**。

### K8s 部署形态：同镜像双 Deployment

| Deployment | 容器配置 |
|------------|---------|
| api | 吃默认 `CMD ["server"]`（或 `args: ["server"]`） |
| worker | `args: ["worker"]` + env `ENABLE_WORKERS=order-sync,bill-gen` |

worker Deployment 覆盖 **args**（替换 CMD、拼在 ENTRYPOINT 后）；**禁止覆盖 command**——K8s 语义中 command 覆盖的是 ENTRYPOINT，写 `command: ["worker"]` 容器会 exec 不存在的 `worker` 二进制直接 CrashLoop。

### Good / Bad

| Good | Bad |
|------|-----|
| 单二进制 gcmd 子命令树（server/worker/migrate 同根命令） | 按角色拆多个二进制 / 多个 main 包 |
| `worker.RunEnabled(ctx, 全量注册...)` | 项目侧手写 env 过滤 / 无条件注册全部 worker |
| worker Deployment 覆盖 `args: ["worker"]` | 覆盖 `command`（顶掉 ENTRYPOINT，exec 不存在的二进制） |
| 同一镜像双 Deployment | 按角色构建不同镜像 |

---
