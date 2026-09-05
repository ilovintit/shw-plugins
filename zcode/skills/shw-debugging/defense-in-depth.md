# 纵深防御验证

## 概述

修了一个由无效数据引起的 bug 后，在一个地方加验证感觉就够。但单一检查会被不同代码路径、重构或 mock 绕过。

**核心原则**：在数据经过的**每一层**都验证。让 bug 在结构上不可能。

## 为什么多层

单一验证："我们修了 bug"
多层验证："我们让 bug 不可能"

不同层捕获不同情况：
- 入口验证捕获大多数 bug
- 业务逻辑捕获边界情况
- 环境守卫防止特定上下文的危险
- 调试日志在其他层失效时帮上忙

## 四层

### 第 1 层：入口点验证
**目的**：在 API 边界拒绝明显无效的输入

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory 不能为空');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory 不存在：${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory 不是目录：${workingDirectory}`);
  }
  // ... 继续
}
```

### 第 2 层：业务逻辑验证
**目的**：确保数据对该操作有意义

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('初始化 workspace 需要 projectDir');
  }
  // ... 继续
}
```

### 第 3 层：环境守卫
**目的**：在特定上下文阻止危险操作

```typescript
async function gitInit(directory: string) {
  // 测试中，拒绝在临时目录之外 git init
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `测试期间拒绝在临时目录外 git init：${directory}`
      );
    }
  }
  // ... 继续
}
```

### 第 4 层：调试仪表
**目的**：为取证捕获上下文

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('即将 git init', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... 继续
}
```

## 应用此模式

发现 bug 时：

1. **追踪数据流** - 错误值从哪起源？在哪里使用？
2. **绘制所有检查点** - 列出数据经过的每个点
3. **在每层加验证** - 入口、业务、环境、调试
4. **测试每层** - 尝试绕过第 1 层，验证第 2 层能捕获

## 会话中的示例

Bug：空的 `projectDir` 导致 `git init` 在源代码里跑

**数据流：**
1. 测试 setup → 空字符串
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` 在 `process.cwd()` 运行

**加的四层：**
- 第 1 层：`Project.create()` 验证非空/存在/可写
- 第 2 层：`WorkspaceManager` 验证 projectDir 非空
- 第 3 层：`WorktreeManager` 测试中拒绝在 tmpdir 之外 git init
- 第 4 层：git init 前记录栈 trace

**结果：** 全部 1847 个测试通过，bug 无法复现

## 关键洞察

四层都是必要的。测试中每层都捕获了其他层漏掉的 bug：
- 不同代码路径绕过了入口验证
- Mock 绕过了业务逻辑检查
- 不同平台的边界情况需要环境守卫
- 调试日志识别出结构性误用

**不要停在一个验证点。** 在每层都加检查。
