---
description: 按可体验切片拆分 Issue，避免重复和共享契约冲突。
argument-hint: <版本>
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

读取 `shw-version-planning` 和已有Issue/PR/占用。每个Issue写目标、非目标、依赖、文件/资源边界、人工AC及规格链接；不按内部动作制造重复Issue。

先明确后端/前端接口和数据所有权；共享契约、迁移及依赖任务顺序可审查。当前命令不自动启动多Issue并发编排；获授权的Issue内并行按 `shw-issue-parallel`。
