---
description: 把 dev、生产或日常使用反馈整理成可复现、可验收的 Bug/Hotfix Issue，并路由到正确版本。
argument-hint: [问题描述]
---

执行前加载 `shw-acceptance` 和 `shw-gitea-flow`。

1. 收集发现环境、版本/tag、时间、入口/角色、前置条件、复现步骤、预期、实际、频率、影响和可用证据；不得把猜测原因写成事实。
2. 先搜索重复 Issue；命中则补充证据，不重复建单。
3. 判定反馈类型：
   - 已承诺行为失效：Bug；
   - 新增能力或改变规则：产品需求，先回 `/shw-product`；
   - 生产 P0/P1：Hotfix，关联当前尚未关闭的 Version；
   - 非阻断生产问题：进入下一维护 Version，不阻止当前版本关闭，除非用户裁决阻断。
4. 创建 Issue，写完整复现、严重度、环境、found-in/fixed-in、验收 checklist、日志/截图链接及关联产品条款。
5. 需要立即修复时提示 `/shw-work <Issue>`；本命令本身不实现代码。

Hotfix 仍然 Issue 先行；从 main 切分支、PR 目标 main、用户 Web UI 合并，随后必须同步回 dev。
