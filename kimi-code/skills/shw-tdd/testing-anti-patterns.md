# 测试反模式

**何时加载本参考：** 写或改测试、加 mock、或想往生产代码加只用于测试的方法时。

## 概述

测试必须验证真实行为，不是 mock 行为。mock 是隔离的手段，不是被测的对象。

**核心原则**：测代码做什么，不是测 mock 做什么。

**严格遵循 TDD 可以防止这些反模式。**

## 铁律

```
1. 绝不测 mock 行为
2. 绝不往生产类加只用于测试的方法
3. 绝不在不理解依赖的情况下 mock
```

## 反模式 1：测 mock 行为

**违规：**
```typescript
// ❌ 坏：测 mock 是否存在
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});
```

**为什么错：**
- 你在验证 mock 工作，不是组件工作
- mock 在时测试通过，不在时失败
- 对真实行为一无所知

**修复：**
```typescript
// ✅ 好：测真实组件，或不 mock 它
test('renders sidebar', () => {
  render(<Page />);  // 不 mock sidebar
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});

// 或者若必须为隔离 mock sidebar：
// 不要对 mock 断言 - 测 Page 在 sidebar 存在时的行为
```

### 门禁函数

```
对任何 mock 元素断言之前：
  问："我在测真实组件行为，还是仅 mock 存在？"

  若在测 mock 存在：
    停下 - 删除断言或不 mock 该组件

  改测真实行为
```

## 反模式 2：生产代码里的测试专用方法

**违规：**
```typescript
// ❌ 坏：destroy() 只在测试里用
class Session {
  async destroy() {  // 看起来像生产 API！
    await this._workspaceManager?.destroyWorkspace(this.id);
    // ... 清理
  }
}

// 测试里
afterEach(() => session.destroy());
```

**为什么错：**
- 生产类被只用于测试的代码污染
- 在生产环境意外调用会很危险
- 违反 YAGNI 和关注点分离
- 把对象生命周期和实体生命周期搞混

**修复：**
```typescript
// ✅ 好：测试工具处理测试清理
// Session 没有 destroy() - 它在生产里是无状态的

// 在 test-utils/
export async function cleanupSession(session: Session) {
  const workspace = session.getWorkspaceInfo();
  if (workspace) {
    await workspaceManager.destroyWorkspace(workspace.id);
  }
}

// 测试里
afterEach(() => cleanupSession(session));
```

### 门禁函数

```
往生产类加任何方法之前：
  问："这是否只被测试使用？"

  若是：
    停下 - 不要加
    放到测试工具里

  问："这个类是否拥有该资源的生命周期？"

  若否：
    停下 - 该方法放错了类
```

## 反模式 3：不理解就 mock

**违规：**
```typescript
// ❌ 坏：mock 破坏了测试逻辑
test('detects duplicate server', () => {
  // mock 阻止了测试依赖的 config 写入！
  vi.mock('ToolCatalog', () => ({
    discoverAndCacheTools: vi.fn().mockResolvedValue(undefined)
  }));

  await addServer(config);
  await addServer(config);  // 应抛错 - 但不会！
});
```

**为什么错：**
- 被 mock 的方法有测试依赖的副作用（写 config）
- 过度 mock 以"求稳"破坏了真实行为
- 测试因错误原因通过或神秘失败

**修复：**
```typescript
// ✅ 好：在正确的层级 mock
test('detects duplicate server', () => {
  // mock 慢的部分，保留测试需要的行为
  vi.mock('MCPServerManager'); // 只 mock 慢的 server 启动

  await addServer(config);  // config 被写入
  await addServer(config);  // 重复被检测 ✓
});
```

### 门禁函数

```
mock 任何方法之前：
  停下 - 不要先 mock

  1. 问："真实方法有什么副作用？"
  2. 问："这个测试是否依赖其中任何副作用？"
  3. 问："我完全理解这个测试需要什么吗？"

  若依赖副作用：
    在更低层级 mock（实际慢/外部的操作）
    或用保留必要行为的测试替身
    不要 mock 测试依赖的高层方法

  若不确定测试依赖什么：
    先用真实实现跑测试
    观察实际需要发生什么
    然后在正确层级加最小 mock

  红旗：
    - "我 mock 这个以求稳"
    - "这可能慢，最好 mock"
    - 不理解依赖链就 mock
```

## 反模式 4：不完整的 mock

**违规：**
```typescript
// ❌ 坏：部分 mock - 只有你认为需要的字段
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' }
  // 缺失：下游代码用的 metadata
};

// 后来：当代码访问 response.metadata.requestId 时崩溃
```

**为什么错：**
- **部分 mock 隐藏结构性假设** - 你只 mock 了知道的字段
- **下游代码可能依赖你没包含的字段** - 静默失败
- **测试通过但集成失败** - mock 不完整，真实 API 完整
- **虚假信心** - 测试证明不了真实行为

**铁律**：mock 真实存在的完整数据结构，不只是你当前测试用的字段。

**修复：**
```typescript
// ✅ 好：镜像真实 API 完整性
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' },
  metadata: { requestId: 'req-789', timestamp: 1234567890 }
  // 真实 API 返回的所有字段
};
```

### 门禁函数

```
创建 mock 响应之前：
  检查："真实 API 响应包含哪些字段？"

  动作：
    1. 查文档/示例的真实 API 响应
    2. 包含系统可能在下游消费的所有字段
    3. 验证 mock 完全匹配真实响应 schema

  关键：
    若你在创建 mock，你必须理解整个结构
    部分 mock 在代码依赖被省略字段时静默失败

  若不确定：包含所有文档化字段
```

## 反模式 5：把集成测试当事后想

**违规：**
```
✅ 实现完成
❌ 没写测试
"准备好测试了"
```

**为什么错：**
- 测试是实现的一部分，不是可选的后续
- TDD 会捕获这个
- 没有测试不能声称完成

**修复：**
```
TDD 循环：
1. 写失败测试
2. 实现让它通过
3. 重构
4. 然后声称完成
```

## 当 mock 变得太复杂

**警告信号：**
- mock setup 比测试逻辑还长
- mock 一切让测试通过
- mock 缺真实组件有的方法
- mock 改了测试就崩

**用户的问题：** "我们真的需要这里用 mock 吗？"

**考虑：** 用真实组件的集成测试通常比复杂 mock 更简单

## TDD 防止这些反模式

**为什么 TDD 有帮助：**
1. **先写测试** → 强迫你想清楚到底在测什么
2. **看它失败** → 确认测试在测真实行为，不是 mock
3. **最小实现** → 不会混入只用于测试的方法
4. **真实依赖** → 你在 mock 前先看到测试实际需要什么

**若你在测 mock 行为，你违反了 TDD** - 你没先看测试对真实代码失败就加了 mock。

## 快速参考

| 反模式 | 修复 |
|--------------|-----|
| 对 mock 元素断言 | 测真实组件或不 mock |
| 生产类的测试专用方法 | 移到测试工具 |
| 不理解就 mock | 先理解依赖，最小 mock |
| 不完整 mock | 完全镜像真实 API |
| 测试当事后想 | TDD - 测试先行 |
| 过度复杂 mock | 考虑集成测试 |

## 红旗

- 断言检查 `*-mock` 测试 ID
- 只在测试文件里被调用的方法
- mock setup 超过测试的 50%
- 移除 mock 测试就失败
- 解释不了为什么需要 mock
- "以求稳"而 mock

## 底线

**mock 是隔离的工具，不是被测的对象。**

若 TDD 揭示你在测 mock 行为，你走错了。

修复：测真实行为，或质疑为什么一开始要 mock。
