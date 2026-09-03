---
name: shw-test-draft
description: "Codex prompt workflow for shw-test-draft、/shw-test-draft. 起稿测试用例——把 milestone 全部 Issue（或单个 Issue）的验收 checklist（TC: 命名）落成可执行测试代码（e2e/ 用例、tests/vrt/ 场景、单元测试）。位于计划之后、执行（roadmap/apply）之前；只写不跑，运行一律 PR CI Use only when the user explicitly asks for this named workflow."
---

# shw-test-draft

这是共享源码中同名 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `shw-test-draft`、`/shw-test-draft` 或要求执行该工作流时按下方原文执行。

**参数**：[Milestone 名 | Issue 编号]

测试用例的**起稿**命令：位于计划（/shw-milestone 或小活 propose 固化）之后、执行（/shw-roadmap 或 /shw-apply）之前。把验收基准（checklist 的 `TC:` 用例名 × PRD 验收标准 × 技术方案测试策略章节）翻译成**可执行测试代码**——测试是验收标准的机器形态，执行期 apply 只负责让它们转绿。

**只写不跑**（agent 本地零测试，无例外）：用例随各自 Issue 的 feat 分支提交，在 PR CI 真实执行。

---

**输入**：Milestone 名（起稿该 Milestone 全部 Issue 的用例）或 Issue 编号（小活/单 Issue）。参数未提供时问用户，不猜。

**步骤**

1. **定位范围与基准**

   - Milestone：经 gitea-mcp 读其全部 open Issue 的验收 checklist（描述末尾）
   - 单 Issue：读该 Issue 的 checklist（无 checklist 的小活，基准 = Issue 初步整理 + `.changes/` 三件套的 tasks.md）
   - 用例规划依据：`docs/architecture/<功能>.md` 的"测试策略"章节（E2E/VRT 用例规划，`TC:` 命名）；PRD 对应需求的验收标准原文

2. **用例映射**

   逐 Issue 逐条 AC → 测度形态判定：

   | AC 形态 | 测试形态 | 落点 |
   |---|---|---|
   | 接口行为/业务流程 | E2E 用例 | `e2e/`（用例名 = TC 名） |
   | UI 视觉/布局/状态呈现 | VRT 场景 | `tests/vrt/`（场景名 = TC 名） |
   | 纯逻辑（计算/校验/状态机） | 单元测试 | 按栈约定的单元测试位置 |

   - checklist 条目没有 `TC:` 名的，先按命名规则补名（命名回写 checklist 经 gitea-mcp）
   - **微小改动弹性**：改文案级任务可能零用例或一条断言——如实说明判定，不为凑数硬编

3. **起稿用例**

   - 写测试代码到上述落点；四态（正常/空/加载/错误）与边界随用例带；断言范围 = 验收基准说了的，**不擅自扩需求**（断言 AC 没说的东西 = 把私货变成合法门禁）
   - 断言自审（写完逐断言自问）：功能缺失时这条断言会失败吗？失败原因正是要测的行为缺失吗？测的是真实行为不是 mock 存在？
   - 不写实现代码、不起服务、不运行用例

4. **提交时机纪律**

   起稿的用例**留在工作区，随各自 Issue 的 feat 分支提交**（apply 的 PR = 该 Issue 的测试 + 实现，CI 红绿即 RED→GREEN 的机器判定）——本命令不建分支、不 commit、不 push。

5. **输出**

   ```
   ## ✅ 测试用例起稿完成

   **范围：** milestone sprint-3（5 个 Issue）/ Issue #12
   **用例清单：** #12 × TC-login-ok（e2e）、TC-login-empty（e2e）｜#15 × VRT-order-list（vrt）｜…
   **未覆盖项：** <AC 条目及原因（如"人工验收类，无机器形态"）>

   下一步：/shw-test-review 对齐审查——红黄清零放行后才进入执行。
   ```

---

**约束**

- **只写不跑**——运行一律 PR CI；本地不起服务、不跑任何测试
- **TC: 一一对应**——每条 AC 有对应用例、每个用例名可回溯到 TC 名；无名的先补名回写 checklist
- **断言范围 = 验收基准**——AC/PRD 没说的不断言；扩需求走需求链（issue/docs），不在测试里私改
- **不写实现**——本命令只产测试代码；实现是 apply 的事
- 用例落点遵循项目既有测试目录约定（AGENTS.md）；无约定时按栈惯例并在输出中说明
