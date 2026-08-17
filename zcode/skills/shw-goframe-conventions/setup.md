
# GoFrame 环境搭建与 skill 安装引导

## 概述

GoFrame 框架已有官方维护的 skill，基于 vercel-labs/skills 开放规范，通过 `npx skills` CLI 分发，兼容几十种 IDE/agent 工具。**公司不需要、也不应该重新造一份**。

本 skill 的唯一职责是**安装引导 + 分工边界声明**：

- 帮开发者把官方 goframe skill 装到当前工具里
- 明确哪些知识归官方 skill、哪些归公司 skill，避免重复或遗漏
- 装不上时给出降级方案

**核心原则**：框架通用用法归官方，公司特定约定归内部。各司其职，不重叠。

## 铁律

```
框架通用知识（DO 对象、gerror、gcmd、gdb 基础用法）→ 指向官方 goframe skill
公司特定约定（DDD 四层、手工 DI、exception 错误码、decimal string）→ 指向 shw-goframe-conventions
绝不把官方 skill 的内容抄进公司 skill
```

## 触发时机

**在以下场景调用：**

- 新建 GoFrame 项目、初始化开发环境时
- 用户问"怎么装 goframe 的 skill""goframe skill 在哪""goframe 环境怎么配"
- 检测到项目用 GoFrame（`go.mod` 含 `github.com/gogf/gf/v2`）但当前工具未挂载官方 goframe skill 时
- 团队成员换工具/换机器，需要在新环境补装 skill 时

**不要在以下场景调用：**

- 已经装好官方 skill，只是问 GoFrame 具体用法 → 让官方 skill 接管
- 问公司代码规范、目录分层 → 走 `shw-goframe-conventions`
- 问 PHP 到 Go 的迁移坑 → 走 `shw-goframe-migration`

## 安装步骤

### 1. 检查是否已安装 / 是否有更新

```bash
npx skills check
```

- 输出列出已安装 skill 及可用版本
- 若已有 `goframe` 且为最新，无需重复安装，直接结束本流程

### 2. 安装官方 goframe skill

**项目级安装（推荐，默认）**：随项目提交，团队共享，新人 clone 即得。

```bash
npx skills add github.com/gogf/skills
```

**全局安装**：跨项目复用，加 `-g`。

```bash
npx skills add github.com/gogf/skills -g
```

> 团队项目统一用**项目级**，保证全员环境一致；个人工具机/演示项目可用全局。

### 3. 更新

```bash
npx skills update
```

建议在 `npx skills check` 提示有新版本后执行。

### 4. 验证生效

安装后：

- 重启当前工具（或重载 skill 列表），确认 goframe skill 出现在可用 skill 中
- 随手问一个 GoFrame 基础问题（如"gdb 怎么用事务"），确认官方 skill 能正常接管回答

## 分工边界声明

三个 skill 各管一块，**不要越界**：

| 知识领域 | 归属 | 说明 |
|---------|------|------|
| GoFrame 框架通用用法（gcmd 命令行、gcfg 配置、glog 日志、gerror 错误处理、gvalid 校验、gdb/DO 对象 ORM、gcache 缓存、gview 模板） | **官方 goframe skill** | 框架自带能力，跟随版本更新 |
| 实战示例（HTTP/gRPC 服务、JWT 认证、限流等） | **官方 goframe skill** | 通用场景，社区维护 |
| 公司 DDD 四层架构、手工 DI、exception 错误码体系、decimal string、命名约定 | **shw-goframe-conventions** | 公司特定规则 |
| PHP→Go 迁移陷阱（类型、空值、数组/切片、协程 vs Hyperfiber 等） | **shw-goframe-migration** | 跨语言迁移专属 |

**判定原则**：

- 换一家公司这套东西还成立吗？成立 → 官方 skill；不成立 → 公司 skill
- 涉及"公司怎么规定"→ `shw-goframe-conventions`
- 涉及"PHP 老代码怎么对应 Go"→ `shw-goframe-migration`

## 降级说明

安装官方 skill 失败时，按场景降级：

### 场景一：`npx` 命令不存在

- 原因：未装 Node.js
- 降级：引导用户安装 Node.js（`brew install node` 或官方安装包），装完重试 `npx skills add ...`
- 临时兜底：仅靠 `shw-goframe-conventions` + 公司内部 GoFrame 文档支撑开发，待环境就绪后补装

### 场景二：网络访问失败（GitHub / npm registry 不通）

- 原因：内网无外网、代理未配、防火墙拦截
- 降级：
  1. 配置 npm/HTTP 代理后重试
  2. 从已装环境的同事机器拷贝 skill 目录（项目级安装会落在项目内，可直接 git 同步）
  3. 若是项目级安装，其他成员 `git clone` 项目即可获得，无需各自联网

### 场景三：装了但不生效（skill 列表里没有）

- 排查：重启工具 → 确认安装路径被工具识别 → 检查项目级 skill 是否在项目根目录下
- 降级：切到全局安装 `npx skills add ... -g` 试试；仍不行则走场景二的兜底方案

### 场景四：完全无法安装官方 skill

- 降级底线：仅用 `shw-goframe-conventions`（公司约定）+ 官方文档站（`goframe.org`）人工查阅
- **明确告知用户**：当前缺少官方 goframe skill，框架通用问题可能回答不全，建议尽快补装
- 不要在无官方 skill 的情况下，凭记忆硬答框架 API 细节——容易给出过时/错误信息，引导用户查官方文档

## 底线

**本 skill 只搭桥，不造桥。**

把官方 goframe skill 装好、把分工边界讲清楚、装不上时给降级方案——三件事做完，本 skill 的使命就结束了。框架怎么用，交给官方 skill；公司怎么写，交给 `shw-goframe-conventions`。
