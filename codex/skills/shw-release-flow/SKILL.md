---
name: shw-release-flow
description: 按授权发布 main 提交与可追溯制品；无测试或冒烟前置。
---

执行前必须读取 `shw-issue-gate`；修改前读取 `shw-workspace` 并确认项目、目录、Issue 与所有权。项目外只读，未知修改不覆盖；能力缺失不扩大授权。

# 正式发布

读取 `shw-integration` 与 `shw-verify`。发布输入是已授权main提交、正常集成记录及可追溯制品，不依赖test分支结果、测试基线或发布前人工验收。

1. 核对发布授权、版本范围、main提交与tag/审批方式，记录人工体验状态；用户可在生产体验，未体验不默认阻挡已授权发布。
2. 正常构建/打包，或复用来源可证明一致的digest。核对tree、构建配置、锁文件、依赖、工具链和部署输入；dev SHA与main merge SHA分别记录。不得把未知来源的制品当作当前源码。
3. 发布和其依赖链不得执行单元/API/E2E/VRT/回归/冒烟，不触发test工作流，也不等待测试报告。仅用户另行明确要求测试时走 `shw-test-spec` 独立路径，测试失败不自动阻挡发布。
4. 按已有授权部署；读取流水线完成状态、制品标识和部署revision。正常服务健康监控保持运行，但不新增业务请求、页面点击或测试数据作为发布冒烟。实际构建/上传/部署失败必须如实处理，不能把未成功部署写成成功。
5. 记录版本、提交、digest、tag/审批及真实结果，明确“未运行测试”；不force改tag、不浮动digest冒充成功。

环境契约见 references/environments.md、references/gitops/README.md及references/miniprogram/README.md。已有业务CI测试门禁需要各项目授权正常迁移，禁止绕过权限/保护。没有测试不代表没有来源、构建、配置与发布授权约束。
