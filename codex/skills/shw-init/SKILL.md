---
name: shw-init
description: "Codex prompt workflow for shw-init、/shw-init. 初始化空项目/新项目为 Issue 驱动工作流——询问 → 目录骨架 → AGENTS.md → Gitea 流程设施。已有存量项目请走 /shw-import Use only when the user explicitly asks for this named workflow."
---

# shw-init

这是共享源码中同名 slash command 的 Codex skill-backed prompt，不是 Codex 原生 commands。用户明确点名 `shw-init`、`/shw-init` 或要求执行该工作流时按下方原文执行。

**参数**：[项目路径，默认当前目录]

把**空项目/新项目**初始化为 Issue 驱动工作流（单人 + Agent × Gitea）：通过一组询问确定项目形态，生成目录骨架、AGENTS.md 工作流区段、Gitea 流程设施。**本命令只管从零建**——已有代码/specs 的存量项目对齐走 `/shw-import`，插件升级迁移走 `/shw-update`。

**输入**：可选项目路径（默认当前目录）。执行前先加载 `shw-gitea-flow` skill 获取流程设施的操作约定。

---

## 步骤

### 1. 前置判断

检查目标目录：**已有实质内容**（源码文件、`specs/`、`.changes/`、旧工作流章节等）→ 本命令不适用，提示走 `/shw-import`（存量项目对齐），停止。空目录或仅有初始文件（README/.gitignore 等）→ 继续。

### 2. 询问（一次问清，不挤牙膏）

1. **项目名与一句话定位**（干什么用）
2. **技术栈**：Go/GoFrame / Taro 多端 / PC 管理后台（pure-admin-thin）/ Nuxt（纯展示 / 数据大屏 / 应用型）/ Node 服务 / PHP+Hyperf / 未定（未定则只建通用骨架，栈细节开发时按 skill 补）
3. **Gitea 仓库**：是否已建（已建给 URL；没建提示先建好空仓库再回来跑）
4. **确认后开工**——展示计划（将建什么目录、写什么文件、建什么 label），用户确认后执行

### 3. 本地骨架（按技术栈）

```
repo/
├── docs/
│   ├── prd/            # PRD 活文档，按功能模块一个 md（如 docs/prd/订单.md）
│   ├── design/         # 高保真交互 HTML 原型（VRT 基线锚点）
│   ├── architecture/   # 技术方案 + 决策记录
│   └── journal/        # Session Log 工作记忆（按 issue-N.md 记过程）
├── e2e/                # E2E 测试代码（验收标准的可执行形态）
├── tests/vrt/          # VRT 用例 + 截图基线
├── .changes/           # change 族执行草稿（gitignore，不入库）
└── src/                # 代码
```

- 空目录放 `.gitkeep`；`docs/prd/` 放一份 `README.md` 说明活文档模型；`.changes/` 写入项目 `.gitignore`
- 栈目录细节（DDD 四层、apps 划分等）指路对应 skill（Go/GoFrame → `shw-goframe-conventions`；前端 → `shw-frontend-stack`），不生成业务代码

### 4. AGENTS.md 写入工作流说明

AGENTS.md 不存在则创建，写入以下区段（已含 `<!-- shw-workflow:v6 -->` 标记则跳过）：

```markdown
<!-- shw-workflow:v6 -->
## 工作流（Issue 驱动）

- **真相源**：`docs/prd/`（业务规则/验收标准）、`docs/design/`（交互原型）、`docs/architecture/`（技术方案与决策）。Issue 只做指针与状态，不承载文档内容。
- **流程**：需求入口 `/shw-issue` 建 Issue（backlog label），agent 侧由 `shw-issue-gate` skill 兜底（无单不开工），单入口三分支——
  - **微活**：`/shw-do <N>`（直通执行）→ `/shw-wrap <N>`（回写 + 提 PR + 盯 CI + 全绿自动合并）——单文件单点、不碰逻辑结构的改动，不进 change 族
  - **小活**：`/shw-explore` 差距调查 → `/shw-propose` 同会话固化（`.changes/` 本地草稿，不入库）→ `/shw-test-draft` → `/shw-test-review`（测试起稿+对齐审查）→ `/shw-apply`（提 PR）→ `/shw-archive`（合并 + 轨迹回写 Issue）
  - **大活**：docs 三件套（`/shw-prd-draft`→review → `/shw-proto-draft`→review（有界面时）→ `/shw-arch-draft`→review，各自 docs PR `Refs #N`）→ `/shw-milestone` 排期拆分（验收 checklist）→ test 族起稿审查（`/shw-test-draft` → `/shw-test-review`）→ `/shw-roadmap` 驱动逐 Issue 走 change 族（explore → propose → apply → archive，编排层等 CI 红绿）
  - 三层数点相同：PR（`Closes #N`，目标 dev）→ CI 门禁 → **用户人工验收 → 归档环节合并**（交互模式；roadmap/goal 编排模式 CI 全绿自动合并）；发布前 `/shw-review` 双模型对抗终审 → dev→main 放行（用户确认）
  - 微活/小活/大活定义见 `shw-gitea-flow` §6；边界模糊保守缺省走小活
- **分支（dev 主线制）**：`dev` 开发主线（一切 PR 目标，roadmap 接力地）+ `main` 发布线（永久可发布，仅用户合并）+ `test` 可选（集成部署源）；Issue:分支:PR = 1:1:1 编号进分支名（无例外，紧急修复也先建 Issue）；分支从 dev 切（hotfix/N-slug 从 main 切、合 main 后 cherry-pick 回 dev）；禁堆叠、禁分支互 merge、依赖等前序合进 dev；落后 dev 时 rebase。
- **验证分层**：本地只做编译级确认（build/typecheck）；lint 与一切测试（单元/集成/API/E2E/VRT）一律在 PR CI 执行——agent 本地不跑测试、不卡开发流程，推送后 CI 出结果，失败由用户发起排查（roadmap/goal 编排模式由 agent 等 CI 循环到绿）。
- **状态流转（label）**：需求池(`backlog`) → 方案中 → 待开发 → 开发中 → 待评审 → 完成(closed)。`待开发` = Definition of Ready。状态全用 label 过滤，不用 Project 看板。
- **工作记忆**：过程性记录（试错/被否方案/踩坑）按 `docs/journal/issue-N.md` 留痕，定期提炼进本文件与 `docs/architecture/`。
```

### 5. Gitea 流程设施

按 `shw-gitea-flow` skill 的约定经 gitea-mcp 执行（每项已存在则跳过）：

1. 建 label：`backlog`（已接收待排期）、`feat`、`bug`、`chore`、`retro`、`epic`、`status/方案中`、`status/待开发`、`status/开发中`、`status/待评审`（状态语义约定见 shw-gitea-flow；不建 Project 看板）
2. 建 dev 分支：从 main 切（`git branch dev main`）并推送远端（dev 主线制见 shw-gitea-repo §1；远端已存在则跳过）
3. 装 PR 门禁 workflow：按 `shw-gitea-repo` skill 模板生成 `.gitea/workflows/pr-gate.yml`（按栈适配命令：快速层 + API/E2E/VRT 重型层全在 PR CI 执行），并输出分支保护设置指引（Settings → Branch 保护 dev 与 main，勾选 required status checks = 上面两个 job）
4. 输出确认清单（建了什么、跳过什么）

### 6. 收尾

输出初始化报告：建了什么目录、Gitea 设施清单、AGENTS.md 变更、下一步建议（"首个需求用 /shw-issue 建 Issue"）。有未提交改动则本地 commit（绝不 push）。

---

## 约束

- **只管空项目/新项目**——检测到存量内容立即改道 /shw-import，不做混合初始化
- **绝不覆盖**已有文件内容——骨架只补缺失，AGENTS.md 只追加
- **幂等**：重复运行安全，已存在的一切跳过
- **不生成业务代码**——技术栈细节由对应 skill 在开发时按需提供
- 任何不清楚的地方，向用户提问——不要猜
