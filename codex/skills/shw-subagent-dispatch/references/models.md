# 模型偏好与宿主能力

本表适用于安装本指导后的所有子代理派发，不限任务是否使用 SHW 工作流；模型偏好只在此维护。产品目标与参数支持分开：会话中的用户明确选择优先；否则按本表执行。更新表及相关能力说明必须同插件变更发布，不修改已安装缓存或全局用户配置。

| 当前宿主 | 子代理目标模型 | 目标思考强度 |
| --- | --- | --- |
| Codex | `gpt-6.1-sol` | 中等（`medium`） |
| Claude Code | Sonnet 5.5 | 中等（`medium`） |
| Kimi Code | K2.8 | 当前该模型支持的最高档位 |
| ZCode | GLM-5.3-Flash | 当前该模型支持的最高档位 |

## Codex

以当前 `spawn_agent` schema 为准。本次 Codex Desktop 会话已暴露 `model`、`reasoning_effort` 和 `fork_turns`，并列出表中模型及 `medium`。因此创建时显式传 `model="gpt-6.1-sol"`、`reasoning_effort="medium"`，同时使用 `fork_turns="none"` 或有限数字字符串；`fork_turns="all"`（包括省略后的默认 all）继承主代理模型，不允许 override。不能为保留完整历史而省略模型设置；改用必要上下文摘要与引用路径。传 none 时尤其补齐任务、授权、目录和材料，子代理不会获得主会话历史。

上述是已观察的会话契约，不是所有 Codex 版本的能力保证。新会话先检查 schema 与可用模型；工具不支持 override 时按通用指导报告差异。复用代理只在实际模型/档位仍匹配时满足偏好，不能把不含模型参数的消息工具当作切换模型 API。

## Claude Code

[官方子代理文档](https://code.claude.com/docs/en/sub-agents)（2026-10-09 核对）描述非 fork Agent 的逐次 `model` 与 `effort`，逐次 effort 需 v2.1.292+；定义中的 effort 和逐次值可能被环境强制设置覆盖。使用当前 Agent schema 确认字段及档位，先将表中产品版本映射为实际可用的精确 ID；未核实 `sonnet` 别名对应版本时不能用它冒称满足目标。支持时显式指定该 ID 与中等档位，并核验任务运行信息。旧版/仅继承能力不足时报告差异，不创建用户级 agent 或改设置以补造能力。

## Kimi Code

[官方配置文档](https://www.kimi.com/code/docs/en/kimi-code-cli/configuration/config-files)（2026-10-09 核对）描述已有 secondary model 池使 Agent/AgentSwarm 暴露 `model`，未配置池时继承主模型；实际 effort 来自绑定与配置，`primary` 继承主代理模型/档位。这不证明当前环境存在目标版本，也不证明该版本支持可枚举的 effort 或逐次 effort 字段。

只读核对当前工具 schema、可用池及已解析的模型/档位元数据；仅选确实对应目标版本的既有条目。以该模型实际支持的档位及顺序确定最高值，核实子代理绑定结果。只有 thinking 开关时可说明已开启，不能将它称为可验证的最高档位；无目标条目或最高档位证据时报告未满足，不新增池/variant、不假造 effort 参数。

## ZCode

[官方模型配置文档](https://zcode.z.ai/en/docs/configuration)（2026-10-09 核对）说明 UI 思考档位依模型和提供方而变；主模型 UI 的选择不能证明子代理逐次参数或继承行为。本次公开文档未证实目标 Flash 版本的子代理模型/effort API。

派发前检查当前宿主子代理工具 schema、模型清单、档位与继承证据；只有真实支持并对应表中目标时显式指定，或核实继承。不能把非 Flash 模型的最高档位复制给 Flash，也不能手改配置文件添加可能被忽略的请求参数。缺少支持/证据时报告能力限制，由主代理继续工作；宿主升级后重新核实，不把本次未知状态永久写成“不支持”。
