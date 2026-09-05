---
description: 将一个 Version/Milestone 拆成按用户价值可独立验收的交付 Issue，并确认依赖、优先级和顺序。
argument-hint: <Version 或 Milestone>
---

执行前加载 `shw-version-planning` 和 `shw-gitea-flow`。

1. 读取 Milestone 范围、产品基线、相关原型和架构，不从技术目录机械拆任务。
2. 建议交付切片：每个 Issue 对应一项可观察的用户/运营结果，三五句话能说清目标与边界，并能用一组验收标准独立验证。
3. 为每项列出范围、非目标、依赖、风险、验收 checklist 和所需测试层级。
4. 由用户确认 Issue 边界、依赖和优先级后再批量创建；未确认不落单。
5. Issue 全部挂入当前 Milestone，建立依赖关系和稳定执行顺序；避免多个 Issue 同改一个不可分割契约。
6. 对横跨多天仍不可验收的切片继续拆；不把数据库、接口、前端各拆成无法独立交付的孤岛 Issue。

本命令只规划多个 Issue，不实现代码；单项实现交 `/shw-work`，版本顺序执行交 `/shw-roadmap`。
