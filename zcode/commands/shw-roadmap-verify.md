---
description: 把 roadmap 的验收目标逐条转写为 verify.md 可验证条目，用户审查定稿后产出可直接设为 goal 的一句话文本。roadmap 需已存在（未生成先 /shw-roadmap-explore）
argument-hint: [roadmap名]
---

把 roadmap 的验收目标转写为可验证条目 - 产出 verify.md 与一句话 goal 文本。

原生 goal 的验证是模型自判，目标含糊时容易放水；把目标转成可验证条目后，verifier 每轮有明确对照物——读代码、发请求取证逐条判，judgment 对象从"感觉"变成"条目清单"。验证形态是**文档条目，不是脚本**：业务行为（如 CRUD 交互、UI 表现）无法 shell 化，硬写成断言脚本只会得到假信心。

分层：verify.md 是 **roadmap 级**验证（goal 每轮校验的对象）；change 级验证是各 change 流程内的任务验证命令与 apply 后代码审查，两层互不接管。

---

**输入**：`/shw-roadmap-verify` 后的参数是 roadmap 名（对应 `.roadmaps/<name>/`）。

**步骤**

1. **读 roadmap**

   读 `.roadmaps/<name>/roadmap.md`，取出意图、change 清单、验收目标。文件不存在时停下提示：
   > "未找到 .roadmaps/<name>/roadmap.md，先运行 /shw-roadmap-explore 生成 roadmap。"

2. **逐条转写验收目标为可验证条目**

   每条验收目标转写为一或多条可验证条目，每条**必含三要素**：

   - **证据类型**：三选一（见下方分类表）
   - **Given/When/Then**：可对照执行的场景描述
   - **所属 change**：标注属于 roadmap 清单中哪个 change 的交付责任

   转写纪律：

   - **空洞目标不编造**：验收目标是「把 X 做好」这类无法导出证据的表述时，停下向用户追问具体成功标准，用户说清前不写条目
   - **不为凑证据类型而降级**：能交互验证的不写成观察证据
   - **业务行为不硬写成脚本**：CRUD 的「编辑回显」这类交互行为禁止写成 shell 脚本断言——它是交互证据，用请求序列表达

   **证据类型分类表**：

   | 证据类型 | 适用 | 形态 |
   | --- | --- | --- |
   | 自动证据 | 能命令化的断言（编译 / 测试 / 结构） | 可独立执行的命令 + 期望结果 |
   | 交互证据 | API 行为 | Given/When/Then + 请求示例（verifier 可实际发请求对照响应） |
   | 观察证据 | UI / 难以命令化的行为 | 场景式 Given/When/Then + "agent 可查"的代码级检查点；视觉部分标注"最终需用户目检" |

   **user-confirm 的语义**：agent 负责到代码级确认，最终视觉/体验验收留给用户——agent 不得自行宣布 UI 类验证通过。

3. **写 verify.md**

   写 `.roadmaps/<name>/verify.md`：顶部**条目状态表**（goal 迭代中 verifier 的判断对象），下方逐条详情。

   状态取值：`pending` / `pass` / `fail` / `user-confirm`，**初始全 pending**；`user-confirm` 不是初始值，是验证后"证据齐但需用户目检"的移交标记。

   文件结构模板（以前后端 CRUD 用户模块为例，三类证据各一条）：

   ````markdown
   # <name> 可验证条目

   ## 条目状态表

   | 条目 | 证据类型 | 所属 change | 状态 |
   | --- | --- | --- | --- |
   | V1 编辑回显 | 交互证据 | user-api | pending |
   | V2 列表分页 | 观察证据 | user-list-ui | pending |
   | V3 字段校验 | 自动证据 | user-api | pending |

   ## 条目详情

   ### V1 编辑回显（交互证据，所属：user-api）

   - **Given** 用户模块已有 id=1 的记录，name="旧值"
   - **When** GET /api/users/1 → PUT /api/users/1 改 name → 再 GET /api/users/1
   - **Then** 第一次 GET 返回 name="旧值"；PUT 后再 GET 返回 name="新值"且其余字段不变——编辑结果被持久化并正确回显
   - 请求示例（verifier 可实际发请求对照响应）：

     ```bash
     curl -s http://localhost:<port>/api/users/1
     curl -s -X PUT http://localhost:<port>/api/users/1 -H 'Content-Type: application/json' -d '{"name":"新值"}'
     curl -s http://localhost:<port>/api/users/1
     ```

   ### V2 列表分页（观察证据，所属：user-list-ui）

   - **Given** 用户列表超过一页的数据量，列表页渲染完成
   - **When** 用户切到第 2 页，再切回第 1 页
   - **Then** 每页数据不重复、不丢失
   - 代码级检查点（agent 可查）：列表请求把 page/pageSize 参数透传到后端查询；翻页 offset 或 key 计算正确，不产生重复项
   - **最终需用户目检**：分页控件的视觉表现与交互流畅度

   ### V3 字段校验（自动证据，所属：user-api）

   - **Given/When/Then** 用户名长度、邮箱格式等校验规则有测试覆盖，跑测试命令
   - 命令：`npm test -- user-validation`（换成项目实际测试命令）
   - 期望结果：全部通过，退出码 0
   ````

4. **逐条展示给用户审查**

   把条目状态表 + 条目详情展示给用户，逐条核对三件事：

   - 命令对不对（自动证据的命令可独立执行、期望结果写对）
   - 证据类型选得对不对（该交互的没被降级成观察、业务行为没被硬写成脚本）
   - 有没有漏（roadmap 验收目标全覆盖）

   用户有异议 → 修对应条目（含补漏）→ 重新展示。**定稿前不输出 goal 文本**——goal 文本只在全部条目被用户确认后出现。

5. **定稿后输出一句话 goal 文本**

   按下方模板生成 goal 文本（`<name>` 替换为实际 roadmap 名）输出给用户：

   ````text
   按 .roadmaps/<name>/roadmap.md 的清单逐个完成全部 change（每个走 propose→apply→archive），每轮迭代读取 .roadmaps/<name>/verify.md 逐条验证，全部条目 pass（user-confirm 项除外）才算完成；有 fail 条目时优先修复其所属 change
   ````

   附粘贴指引：到所用 agent 工具的 goal/目标设置处粘贴这段文本（各工具入口不同，在工具的目标或任务设定处粘贴即可）。之后每次迭代由 goal 驱动：对照 verify.md 逐条验证、更新状态表。
