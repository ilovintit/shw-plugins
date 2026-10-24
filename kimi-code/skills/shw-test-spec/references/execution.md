# Mac mini 独立测试执行

测试只在用户明确主动要求后执行，所有类型均使用专用 Mac mini 的本地固定提交；开发、集成、发布、部署和环境体验不隐含请求。无需线上 test 分支或手动 Actions，已有历史保留。

按请求选择单元、API、E2E、VRT、回归或冒烟，不自动全量。固定源码 SHA/tree、配置、fixture、工具链、镜像和基线 revision；执行前确认工作区所有权及 clean 状态。执行期间代码变化标 obsolete-target。

使用可选 shw-local-test 的权威主机端口登记及 suite 租约。项目清单记录映射、Compose 归属、白名单资源；同项目 E2E/VRT 可复用实例，分 PostgreSQL 库、Valkey DB与前缀、RabbitMQ vhost、silo bucket。只清理本 suite 白名单；不连开发/生产中间件。

缓存/临时/日志/截图/报告定向当前工作区。Mac、Linux、微信开发者工具、真机基线分开，缺旧基线标 unbaselined，环境故障标 execution-error。候选按页面/模块审阅后晋升，禁止全量接受、删断言或扩大容差。

报告记录请求、来源、host、实际目标、范围、命令/退出码、起止时间、工件和未覆盖项。partial 不冒充全部通过；不写远端 commit 测试状态，不替代人工验收或成为发布门禁。
