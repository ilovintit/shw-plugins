---
name: shw-rbac
description: 管理后台 / 内部系统 RBAC 权限系统的设计规范。在设计或实现后台权限系统、角色 / 权限点 / 数据范围、组织架构树、菜单权限时触发。覆盖 8 张表、权限点代码化（非 DB 表）、PermissionRegistry 权限树、5 档数据范围、多角色合并算法、权限检查三层分层、幽灵码过滤告警、超管短路、两级缓存。用户提到 RBAC、权限系统、角色权限、数据范围、行级权限时自动触发。
---

# RBAC 权限系统设计规范

## 概述

本 skill 是管理后台 / 内部系统权限系统的**设计规范**，覆盖表结构、算法、分层。

**适用判断**：设计或实现管理后台、内部运营系统、SaaS 管控台的权限系统时。纯 C 端用户身份体系（登录注册、第三方授权）不适用本 skill。

**核心原则**：权限不是"查数据库判断有没有"，而是"编码 + 注册表 + 范围解析"的完整体系。只做角色挂权限点、忘记数据范围 = 半套权限。

**语言无关**：下文的表结构用 SQL/表格描述，流程用伪代码，接口用伪接口，不绑定具体语言 / 框架。

---

## 1. 数据模型：8 张表

权限系统拆三组：**RBAC 核心（4 张）** + **组织架构（3 张）** + **数据范围配置（1 张）**。

### 1.1 RBAC 核心表（4 张）

**`admins`（管理员主体）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint (Snowflake) | 主键 |
| username | varchar(20) | 登录用户名（手机号），唯一 |
| password | varchar(255) | 密码哈希 |
| name | varchar(100) | 姓名 |
| avatar | varchar(255) | 头像 URL，可空 |
| **role** | smallint | **系统内置角色枚举**：`1=普通 Normal` / `2=超管 Super`。**独立于 RBAC**，只用于超管短路 |
| leader_id | bigint | 直接上级管理员 ID，0=无上级 |
| code | varchar(32) | 编码，唯一 |
| status | smallint | `20=启用` / `10=停用` |

> `role` 是**系统内置枚举**，不是 `roles` 表里的业务角色。它只决定"是不是超管"，与"挂了哪些 RBAC 角色"是两套概念。超管（role=2）走短路，根本不读 RBAC。

**`roles`（业务角色）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint (Snowflake) | 主键，**非自增**（项目统一用 Snowflake） |
| name | varchar(100) | 角色名称 |
| code | varchar(32) | 角色编码，格式 `RL` + 8 位 36 进制流水号（共 10 字符），唯一 |
| description | varchar(255) | 描述，可空 |
| status | smallint | `20=启用` / `10=停用` |

**`admin_roles`（管理员 ↔ 角色 N:N）**

| 字段 | 类型 | 说明 |
|------|------|------|
| admin_id | bigint | 管理员 ID |
| role_id | bigint | 角色 ID |
| | | 唯一约束 `(admin_id, role_id)`。一个管理员可挂多个角色 |

**`role_permissions`（角色 ↔ 权限点 N:N）**

| 字段 | 类型 | 说明 |
|------|------|------|
| role_id | bigint | 角色 ID |
| **permission** | varchar(100) | **权限码字符串**（如 `admin:view`） |
| | | 唯一约束 `(role_id, permission)`。**关键：没有 `permissions` 主表**，权限点以编码字符串存储，不是外键 |

### 1.2 组织架构表（3 张）

**`departments`（部门树）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint (Snowflake) | 主键 |
| name | varchar(100) | 部门名称 |
| **parent_id** | bigint | 父部门 ID，`0=顶层`。树形结构靠这个字段 |
| code | varchar(32) | 编码，唯一 |
| sort | int | 排序 |
| status | smallint | `20=启用` / `10=停用` |

**`admin_departments`（管理员 ↔ 部门 N:N + 主部门）**

| 字段 | 类型 | 说明 |
|------|------|------|
| admin_id | bigint | 管理员 ID |
| department_id | bigint | 部门 ID |
| is_primary | bool | 是否主部门 |
| | | 唯一约束 `(admin_id, department_id)`；**部分唯一索引**：每个管理员只能有一个主部门（`WHERE is_primary = true`） |

一人可属多部门（兼任），其中一个是 `is_primary` 主部门。数据范围以**主部门**为基准计算"本部门"。

**`department_leaders`（部门负责人 N:N）**

| 字段 | 类型 | 说明 |
|------|------|------|
| department_id | bigint | 部门 ID |
| admin_id | bigint | 管理员 ID |
| sort | int | 排序 |
| | | 唯一约束 `(department_id, admin_id)`。**与 `admin_departments` 分开**：负责人 ≠ 成员，一个人可以是某部门负责人但不属于该部门 |

### 1.3 数据范围配置表（1 张）

**`role_data_scopes`（角色 → 资源的数据范围）**

| 字段 | 类型 | 说明 |
|------|------|------|
| role_id | bigint | 角色 ID |
| **resource_type** | int | 资源类型标识（由各 Module 通过注册表声明，见第 4 节） |
| scope_type | int | 范围类型枚举值（见第 4 节 5 档） |
| scope_config | JSONB | 自定义配置（CUSTOM 档用，如 `{"department_ids": [1,2]}` 或 `{"province_codes": ["11","12"]}`），可空 |
| | | 唯一约束 `(role_id, resource_type)`。一个角色对不同资源配不同范围 |

---

## 2. 权限点：代码 enum，不是数据库表

### 2.1 核心设计

权限点**不是数据库表**，而是**代码 enum**。格式 `module:action`，规模约 90 个。

```
enum PermissionCode:  // 仅作示意，列举少量
    ADMIN_VIEW     = "admin:view"
    ADMIN_CREATE   = "admin:create"
    ADMIN_EDIT     = "admin:edit"
    ADMIN_KICK     = "admin:kick"       // 踢下线
    ADMIN_DISABLE  = "admin:disable"    // 禁用/启用
    DEPARTMENT_VIEW   = "department:view"
    ROLE_VIEW   = "role:view"
    ROLE_ASSIGN = "role:assign"
    ORDER_VIEW   = "order:view"
    ORDER_CREATE = "order:create"
    AGENT_VIEW   = "agent:view"
    SETTING_EDIT = "setting:edit"
    // ... 共约 90 个
```

### 2.2 为什么不建 permissions 主表

| 方案 | 优点 | 缺点 |
|------|------|------|
| **权限点代码化（本规范）** | 权限随代码版本走、编译期可查、删功能自动消失权限点 | DB 只存编码字符串，需 Registry 兜底 |
| permissions 主表 | DB 可查权限清单 | 权限与代码脱节，删了功能 DB 还留着孤儿权限，需手动同步 |

权限点随代码走：发版新增功能 = 新增 enum 项 = 立即可分配；删除功能 = 删 enum = 该权限码自动失效。`role_permissions.permission` 只是字符串引用，不是主表外键。

### 2.3 PermissionGroup：权限分组

权限点按业务模块归类（用单独的分组 enum）：

```
enum PermissionGroup:
    Contacts = "contacts"     // 通讯录
    AiAgent  = "ai_agent"     // AIAgent 配置
    System   = "system"       // 系统管理
    Product  = "product"      // 产品管理
    Channel  = "channel"      // 渠道管理
    Profile  = "profile"      // 档案管理
    Order    = "order"        // 业务管理
    Case     = "case"         // 案件管理
    Finance  = "finance"      // 财务管理
```

### 2.4 PermissionRegistry：权限树

`PermissionRegistry` 提供两种视图：**按分组组织的权限树**（供前端权限分配面板渲染）与**扁平合法码列表**（供后端校验与幽灵码过滤告警）。

```
PermissionRegistry.tree() =>
    [
      { group: "contacts", label: "通讯录",
        permissions: [
          {code: "admin:view",       name: "查看人员"},
          {code: "admin:create",     name: "创建人员"},
          {code: "department:view",  name: "查看部门"},
          {code: "role:assign",      name: "分配权限"},
          ... ] },
      { group: "ai_agent", label: "AIAgent配置", permissions: [...] },
      { group: "system",   label: "系统管理",   permissions: [...] },
      ...
    ]

PermissionRegistry.codes() =>  # 所有合法权限码的扁平数组
    ["admin:view", "admin:create", "department:view", "role:assign", ...]
```

### 2.5 幽灵权限码：读路径过滤 + 告警（不自动删）

读取管理员权限码时，**过滤掉不在 Registry 中的非法码**（这保证"删功能"后，DB 里的残留权限码不会误授权），并**记告警日志**——但**不在读路径自动删除 DB 残留**。

```
function getAdminPermissionCodes(adminId):
    roleIds = adminRoles.where(admin_id = adminId).pluck('role_id')
    # 逐角色读缓存（plat:role_perms Hash，见第 6 节），未命中回源 DB
    allCodes = []
    for roleId in roleIds:
        codes = rolePermissionService.get(roleId)   # 先 Redis，回源 role_permissions
        allCodes.addAll(codes)
    codes = unique(allCodes)

    # 懒检测：找出不在 Registry 的幽灵码
    validCodes   = PermissionRegistry.codes()
    invalidCodes = difference(codes, validCodes)
    if invalidCodes is not empty:
        log.warn("ghost permission codes detected (not auto-deleted): " + invalidCodes)   # 只告警，不删

    return intersection(codes, validCodes)   # 只返回合法码
```

**为什么读路径只告警、不自动删**：灰度/滚动发布期间新旧版本的 enum 集合不一致——新版本刚写入的权限码，旧版本实例读起来是"幽灵码"；此时读路径自动删除会**误删新版本的合法权限**，造成线上权限丢失。读路径只做"过滤 + 告警"这类无破坏动作；真正的删除留给管理端人工处理或专门的清理命令（显式触发 + 审计留痕），由人确认"这批码确实是被删功能的残留"再动手。

### 2.6 超管短路

`admins.role` 是**系统内置枚举**（`AdminRole`：`Normal=1` / `Super=2`），独立于 RBAC 业务角色。值为超管（`role=2`）时，直接绕过整套 RBAC 体系：

| 场景 | 超管（role=2） | 普通管理员（role=1） |
|------|--------------|--------------------|
| 权限码校验 `Permission.check(CODE)` | 直接放行，不查权限码 | 查所有角色 → 合并权限码，无则抛 403 |
| 权限探测 `Permission.has(CODE)` | 始终返回 true | 查权限码列表判断 |
| 仅超管端点 `Permission.requireSuperAdmin()` | 放行（只认 role=2，无权限码概念） | 抛 403 |
| 数据范围解析 | 直接 ALL，**不进 DataScopeResolver** | 走 DataScopeResolver |
| 前端菜单 | 返回完整菜单树 | 按权限码过滤后的菜单树 |
| 前端权限码下发 | 返回通配符 `["*:*:*"]` | 返回合并去重的权限码列表 |

超管判定只读会话里的 `role` 字段（**权威判定**），**不依赖任何 RBAC 表**。会话里若存有 `is_super_admin` 字段，只是写入时从 role 派生的冗余缓存（中间件短路用），两者不一致时以 `role` 为准（字段定义见 shw-session）：

```
class Permission:
    static check(code):
        if isSuperAdmin(): return              # 超管短路，直接放行
        if not has(code):
            throw PermissionDeniedException()   # -> 403

    static has(code):
        if isSuperAdmin(): return true
        codes = getAdminPermissionCodes(getAdminId())
        return code in codes

    static requireSuperAdmin():                 # 仅超管端点专用，不涉及权限码
        if not isSuperAdmin():
            throw PermissionDeniedException("仅超级管理员可访问")

    # isSuperAdmin 只读 session.role === 2
```

---

## 3. 组织架构：parent_id 树形 + 应用层组装

### 3.1 树形构建在应用层，不在 DB

不在 DB 递归查树（递归 CTE 方言不一、性能差），而是**扁平查询 + 应用层组装**：

```
function buildDepartmentTree():
    allDepts = departments.all().orderBy(sort)   # 一次查全量，扁平列表
    return assembleTree(allDepts)                # 应用层按 parent_id 组装成树
```

### 3.2 子孙遍历用 BFS

查"本部门及子部门"时，分层批量 `whereIn('parent_id', queue)` 向下展开：

```
function getDescendantDeptIds(rootDeptId):
    result = [rootDeptId]
    queue  = [rootDeptId]
    while queue is not empty:
        children = departments.whereIn(parent_id, queue).pluck('id')
        result.addAll(children)
        queue = children
    return result
```

不用递归 CTE，用 BFS 分层批量查，跨数据库通用、可控。

### 3.3 管理员 ↔ 部门：多对多 + 主部门

见第 1.2 节。数据范围以**主部门**为基准计算"本部门"（`is_primary = true` 的那条）。

---

## 4. 数据范围（Data Scope）：最精巧的设计

这是权限系统区别于"有没有权限"的**行级控制**：有 `admin:view` 权限，但能看到**哪些**管理员？由数据范围决定。

### 4.1 5 档范围类型（含优先级）

```
enum ScopeType (int):
    ALL            = 1    # priority 5（全部）
    DEPT_AND_BELOW = 2    # priority 4（本部门及子部门）
    DEPT_ONLY      = 3    # priority 3（仅本部门）
    SELF           = 4    # priority 1（仅本人）
    CUSTOM         = 5    # priority 2（自定义）
```

> **注意 priority 与枚举值不一致**：ALL 最强(5)，SELF 最弱(1)，CUSTOM 居中(2)。priority 用于多角色合并时比较（第 5 节）。

### 4.2 绑在角色上，按资源类型拆分

数据范围配置在 `role_data_scopes`，按 **resource_type**（int 标识）拆分——一个角色可对不同资源配不同范围：

```
角色 Manager（部门管理者）:
  ├── resource_type = 1 (admin/管理员)  → DEPT_AND_BELOW  （看本部门及下属的人）
  ├── resource_type = 2 (order/订单)    → SELF            （订单只看自己经手的）
  └── resource_type = N (report/报表)   → ALL             （报表看全局）
```

**同一个 Manager，看人是部门级、看订单是个人级、看报表是全局**。按资源粒度配，而非角色一刀切。

### 4.3 配置项元数据：Attribute + Provider 动态注册

每个 Module 在自己的领域层声明它支持哪些资源类型、哪些档位、CUSTOM 时用什么配置控件。主系统通过**反射扫描 Attribute + Provider 接口**动态收集，拼成完整的范围配置面板——各 Module 自治，主系统零硬编码。

```
# ① 资源标记 Attribute（标注在 Provider 类上，声明资源类型标识）
attribute DataScopeResource(int type)

# ② 定义提供者接口
interface DataScopeDefinitionProvider:
    definition() -> DataScopeDefinition

# ③ 不可变定义值对象
value DataScopeDefinition:
    int type                      # 资源类型标识
    string name                   # 英文标识（如 "order"）
    string label                  # 中文显示名（如 "订单"）
    ScopeType[] allowedScopes     # 该资源支持的范围档位
    CustomConfigDefinition? customConfig   # CUSTOM 配置元数据，null=不支持自定义

value CustomConfigDefinition:
    string configKey      # scope_config JSON 中的 key（如 "province_codes"）
    string label          # 显示名（如 "可见省份"）
    ControlType controlType       # 控件类型枚举：tree-select / multi-select
    OptionsSource optionsSource   # 选项数据来源（如 "provinces"）
```

**各 Module 注册示例**：

```
# 订单模块注册（type=2，支持 3 档，自定义=可见省份）
@DataScopeResource(type = 2)
class OrderDataScopeDefinition implements DataScopeDefinitionProvider:
    definition() =>
        DataScopeDefinition(
            type: 2, name: "order", label: "订单",
            allowedScopes: [ALL, SELF, CUSTOM],
            customConfig: CustomConfigDefinition(
                configKey: "province_codes", label: "可见省份",
                controlType: MULTI_SELECT, optionsSource: "provinces"))

# 管理员模块注册（type=1，支持部门树档位，自定义=可见部门）
@DataScopeResource(type = 1)
class AdminDataScopeDefinition implements DataScopeDefinitionProvider:
    definition() =>
        DataScopeDefinition(
            type: 1, name: "admin", label: "管理员",
            allowedScopes: [ALL, DEPT_AND_BELOW, DEPT_ONLY, SELF, CUSTOM],
            customConfig: CustomConfigDefinition(
                configKey: "department_ids", label: "可见部门",
                controlType: TREE_SELECT, optionsSource: "departments"))
```

**DataScopeRegistry 懒加载**：首次查询时扫描各模块的 DataScope 定义目录，收集带 `DataScopeResource` Attribute 的 Provider，构建 `{type → definition}` 表；之后纯内存查表。注册时校验 Attribute.type 与 definition.type 一致、检测重复 type。

### 4.4 实际数据过滤

UseCase 里把 EffectiveScope（生效范围）翻译成 Repository 能识别的 WHERE 条件：

| 生效范围 | 翻译成的过滤条件 |
|---------|----------------|
| ALL | 无附加条件 |
| DEPT_AND_BELOW | `WHERE dept_id IN (主部门 + BFS 子孙部门)` |
| DEPT_ONLY | `WHERE dept_id = 主部门id` |
| SELF | `WHERE created_by = 当前用户id`（或 `admin_id = 当前用户id`） |
| CUSTOM | `WHERE dept_id IN (scope_config.department_ids)` 或 `WHERE province_code IN (scope_config.province_codes)`，configKey 由资源的 definition 决定 |

```
function listAdmins(adminId):
    # 超管短路在更上层（resolve 前判断），这里只处理非超管
    scope = dataScopeResolver.resolveForNonSuperAdmin(adminId, resourceType = 1)
    filter = translateScope(scope, adminId)
    return adminRepository.list(filter)
    # ALL → 无过滤；DEPT_AND_BELOW → dept_id IN (...)；SELF → created_by = adminId
    # CUSTOM → dept_id IN (scope.scope_config["department_ids"])
```

**数据范围是横切关注点**：在每个资源查询的 UseCase 里都过一遍 Resolver，**不在 Controller 判断**。

---

## 5. 多角色合并算法

一个管理员挂多个角色，每个角色对同一资源可能配不同范围。合并取**最高优先级**。

```
function resolveForNonSuperAdmin(adminId, resourceType) -> EffectiveScope:
    # 0. 超管短路（调用方应在上层判断，这里默认非超管）

    # 1. 先查生效范围缓存（plat:effective_scope:{adminId}:{resourceType}，TTL 300s）
    cached = cache.getEffectiveScope(adminId, resourceType)
    if cached != null: return cached

    # 2. 获取管理员所有角色，跳过禁用角色（status != 20 不参与合并）
    roles = roleRepo.findByAdminId(adminId)
    configs = []
    for role in roles:
        if role.status != 20: continue            # 跳过禁用角色
        scope = scopeRepo.findByRoleAndResource(role.id, resourceType)
        if scope != null: configs.add(scope)

    # 3. 合并
    result = merge(configs, resourceType)

    # 4. 写回缓存
    cache.setEffectiveScope(adminId, resourceType, result)
    return result


function merge(configs, resourceType) -> EffectiveScope:
    # 无配置 → 默认 SELF（最小权限原则）
    if configs is empty:
        return EffectiveScope(SELF, null)

    # 按 priority 降序排序（数值越大优先级越高）
    sorted = configs.sortBy(scopeType.priority, desc)
    highest = sorted[0].scopeType

    # 最高为 CUSTOM → 取所有 CUSTOM 角色配置的【并集】
    if highest == CUSTOM:
        definition = registry.getDefinition(resourceType)
        configKey  = definition.customConfig?.configKey ?? "department_ids"
        allIds = []
        for c in configs:
            if c.scopeType == CUSTOM:
                allIds.addAll(c.scopeConfig[configKey] ?? [])
        return EffectiveScope(CUSTOM, { configKey: unique(allIds) })

    # 否则返回最高优先级类型，无附加配置
    return EffectiveScope(highest, null)
```

**关键决策点**：

| 情况 | 结果 | 理由 |
|------|------|------|
| 超管 | ALL | 绕过解析 |
| 无任何配置 | SELF | 最小权限默认 |
| 角色A=DEPT_ONLY(p3), 角色B=SELF(p1) | DEPT_ONLY | 取最高优先级(3>1) |
| 角色A=ALL(p5), 角色B=SELF(p1) | ALL | 最高优先级(5) |
| 角色A=DEPT_AND_BELOW(p4), 角色B=CUSTOM(p2) | DEPT_AND_BELOW | 4>2，非最高 CUSTOM 不走并集 |
| 角色A=CUSTOM([1,2]), 角色B=CUSTOM([3]) | CUSTOM([1,2,3]) | CUSTOM 之间取**并集**放宽 |
| 角色禁用（status=10） | 不参与合并 | 禁用角色的配置被跳过 |

**CUSTOM 并集的设计逻辑**：自定义范围是"显式指定的可见集合"，多个角色叠加应**放宽**（看到更多），而非收紧（取交集会让"加角色反而权限变小"，反直觉）。

---

## 6. 缓存策略

数据范围解析 + 权限码校验都是高频操作，必须缓存。共三组 Redis 键。

### 6.1 两级数据范围缓存

| 缓存层 | Redis 键 | 内容 | TTL | 理由 |
|--------|---------|------|-----|------|
| 角色配置缓存 | `plat:role_data_scopes:{roleId}` | 角色 → 各资源类型的范围配置数组 | **3600s（长）** | 角色配置低频变更，长 TTL 省查询 |
| 生效范围缓存 | `plat:effective_scope:{adminId}:{resourceType}` | DataScopeResolver 计算出的最终生效范围 | **300s（短）** | 兼顾性能与管理员调整后的快速生效 |

### 6.2 角色权限码缓存

| 缓存层 | Redis 键 | 内容 | TTL | 理由 |
|--------|---------|------|-----|------|
| 角色权限码 | `plat:role_perms`（Hash，field=roleId） | 角色 → 逗号分隔的权限码 | 持久（变更时主动清） | 供 `Permission.check()` 高频校验 |

### 6.3 配置变更的失效流程

```
角色数据范围被修改时：
1. 删该角色的【角色配置缓存】 plat:role_data_scopes:{roleId}
2. 查出关联该角色的所有 adminId（admin_roles）
3. 逐个清这些 adminId 的【生效范围缓存】 plat:effective_scope:{adminId}:*

角色权限码被修改（分配/回收权限）时：
1. 全量覆盖 role_permissions（事务内删旧插新）
2. 写入/覆盖 plat:role_perms 的该 roleId 字段
```

**不能只清一层**：只清角色配置缓存，生效范围缓存还留着旧值，5 分钟内还是旧权限。两层一起清才立即生效。

---

## 7. 权限检查三层分层

权限不是一处搞定，而是**三层各司其职**：

```
请求进来
  │
  ▼
┌─────────────────────────────────────────────┐
│ 第 1 层：认证（Authentication）              │
│ 项目层中间件：解析 Bearer token → 校验会话    │
│ (Redis) → 把会话数据注入到 Request attribute   │
│ 不通过 → 401                                 │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│ 第 2 层：授权（Authorization）               │
│ Controller 方法内【显式】调用：               │
│   Permission.check(PermissionCode.XXX)       │
│ 超管 → 短路放行                              │
│ 无权限 → 403                                 │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│ 第 3 层：数据范围（Data Scope）              │
│ UseCase 里 DataScopeResolver 解析            │
│ → Repository 过滤行级数据                    │
│ 控制能看到【哪些】数据，而非【能不能】        │
└─────────────────────────────────────────────┘
```

### 7.1 第 1 层：认证（项目层中间件）

| 维度 | 标准 |
|------|------|
| 解决问题 | 你是谁？登录了吗？ |
| 实现位置 | **项目层**认证中间件 |
| 依赖 | 继承共享基础设施的**抽象会话服务**，具体实现在项目层 |
| 流程 | 提取 `Authorization: Bearer <token>` → 会话服务 `validate(token)` 查 Redis → 注入 `request.attributes['user']` |
| 失败结果 | 401 未登录 |

> **关键分层**：共享基础设施只提供**抽象**会话服务基类与契约，**具体认证逻辑在项目层**。这样共享组件不绑死任何项目的角色体系。

### 7.2 第 2 层：授权（Controller 显式 check）

| 维度 | 标准 |
|------|------|
| 解决问题 | 你有这个操作权限吗？ |
| 实现位置 | Controller 方法体内**显式**调用 `Permission.check(CODE)` |
| 超管 | 短路放行（见 2.6） |
| 失败结果 | 403 无权限 |

```
# Controller 内显式调用（推荐）
function deleteAdmin(ctx, adminId):
    Permission.check(PermissionCode.ADMIN_DISABLE)   # 显式，一眼看出需要什么权限
    # 超管此处自动放行；普通管理员无 ADMIN_DISABLE → 抛 403
    return adminUseCase.disable(adminId)
```

**显式调用 > 注解 / 装饰器魔术**：权限需求一目了然，新人读代码就知道这个接口要什么权限，不依赖框架反射的"魔术"。

### 7.3 第 3 层：数据范围（UseCase 静默过滤）

| 维度 | 标准 |
|------|------|
| 解决问题 | 你能看到哪些数据？ |
| 实现位置 | UseCase + DataScopeResolver + Repository |
| 超管 | 短路 ALL，不进 Resolver（见 2.6） |
| 失败结果 | **静默过滤**（不报错，只是少返回） |

第 3 层与第 2 层的本质区别：授权失败**抛 403**（你不该访问这个功能），数据范围**静默过滤**（你有这个功能权限，只是只能看到你该看的数据行）。用户无感知，只是列表里少了几条。

---

## 8. 菜单与前端权限

### 8.1 菜单也是代码 enum

菜单项**不是 DB 表**，是代码 enum，按"分组 + 菜单项"两层组织。每个菜单项通过 `perm` 映射到一个权限点：

```
enum PcMenuGroup:                # PC 端菜单分组
    Organization, Channel, Product, Profile,
    Business, Case, Finance, AI, Archive, SystemSettings
    # 每项带 title() / icon() / rank()（标题、图标、排序）

# 菜单项（示意），每个挂一个权限点
MenuItem("user-list",   group: Organization, perm: ADMIN_VIEW)
MenuItem("user-create", group: Organization, perm: ADMIN_CREATE)
MenuItem("order-list",  group: Business,     perm: ORDER_VIEW)
MenuItem("role-manage", group: Organization, perm: ROLE_VIEW)
```

菜单与权限点一一绑定，前端按权限码决定显隐，不需要单独的菜单权限表。

### 8.2 前端获取菜单

| 管理员类型 | 返回 |
|-----------|------|
| 超管（role=2） | 完整菜单树（所有 enum 项，`PcMenuTree.build()`） |
| 普通管理员 | 按其权限码过滤后的菜单树（`item.perm` 不在权限码列表里的剔除，空分组也剔除） |

### 8.3 前端获取权限码

| 管理员类型 | 返回 |
|-----------|------|
| 超管（role=2） | 通配符 `["*:*:*"]`（前端见此全显所有按钮） |
| 普通管理员 | 所有角色权限码合并去重后的列表（经幽灵码过滤清洗） |

前端拿到权限码列表后，用于按钮级显隐（如"删除"按钮需 `admin:disable`，列表里没有就隐藏）。

---

## 9. 角色编码规则

`roles.code` 格式：**`RL` + 8 位 36 进制流水号**（共 10 字符，如 `RL00000000`、`RL00000001`、…、`RL0000000Z`、`RL00000010`）。

```
function generateRoleCode():
    maxCode = roles.where(code like 'RL%').orderByDesc(code).first()?.code
    if maxCode == null: return "RL00000000"
    suffix = maxCode[2:]                       # 去掉 RL 前缀
    num    = base36ToDec(suffix) + 1
    return "RL" + padLeft(base36(num), 8, '0')
```

编码格式由 `CodeRule` 声明（前缀、长度、字符类型、填充），但**生成方式上，角色编码与高频业务编码刻意不同**：角色编码属**低频管理数据**，用 DB `MAX+1` 生成即可——管理后台一天建不了几个角色，并发量极低，`code` 唯一约束兜底。**高频业务编码（订单号、流水号等）不走这条路**，必须用 shw-seqnum 的 Redis INCR + DB 恢复方案——DB MAX+1 在并发下会撞号（豁免边界见 shw-seqnum 的豁免注）。

---

## 10. Good / Bad 速查

| Good | Bad |
|------|-----|
| 权限点是代码 enum，随版本走 | 建 permissions 主表，权限与代码脱节 |
| `role_permissions.permission` 存编码字符串，无主表外键 | 用 permission_id 外键挂主表 |
| 数据范围按 resource_type 拆分 | 角色一刀切配一个全局数据范围 |
| 多角色合并取最高优先级，CUSTOM 取并集 | 多角色取交集（越加角色权限越小，反直觉） |
| 数据范围在 UseCase 静默过滤 | 在 Controller 判断数据范围 |
| 幽灵码：读路径过滤 + 告警，删除走显式清理（人工/专门命令 + 审计） | 读路径自动删 DB（灰度期误删新版本合法权限）；或不过滤，任由残留码误授权 |
| Attribute + Provider 动态注册资源元数据 | 主系统硬编码资源类型清单 |
| BFS 分层批量查子部门 | 递归 CTE 或 N+1 查询 |
| 两级缓存，变更时两层都清 | 只清一层导致权限延迟生效 |
| 权限检查显式 `Permission.check(CODE)` | 靠注解 / 装饰器魔术，读不出权限需求 |
| 树形在应用层组装（扁平查 + 组装） | 在 DB 递归查树（方言不一、性能差） |
| 认证中间件在项目层，共享组件只留抽象 | 认证逻辑硬编码进共享组件 |
| 超管短路贯穿 check/menu/scope 三层 | 超管只有一个二值中间件 |

---

## 11. 何时调用本 skill

- 设计或实现管理后台 / 内部系统的权限系统时
- 涉及角色、权限点、数据范围（行级权限）的设计
- 组织架构树、部门层级的数据范围计算
- 多角色权限合并、菜单 / 前端权限码下发
- 评估现有权限系统的设计是否合理（对照本规范查漏）
- **不适用**：纯 C 端用户登录注册、OAuth 第三方授权、API Token 管理（那是身份认证，不是 RBAC 权限）
