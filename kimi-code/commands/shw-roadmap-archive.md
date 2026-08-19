---
description: 归档已完结的 roadmap——完成归档（终态核验/目检最终确认/轨迹收尾）或放弃归档（理由记轨迹）
argument-hint: [roadmap名]
---

归档已完结的 roadmap：完成归档走终态核验 + 目检最终确认 + 轨迹收尾，放弃归档把理由记入执行轨迹——两条路径最终都把 `.roadmaps/<name>/` 整目录移入 `.roadmaps/archive/`，roadmap 生命周期到此为止。

**输入**：`/shw-roadmap-archive` 后的参数是 roadmap 名（对应 `.roadmaps/<name>/`）。可省略——省略时进入第 1 步选择。

**步骤**

1. **若未提供 roadmap 名，提示选择**

   列出 `.roadmaps/` 顶层的活跃 roadmap（排除 `archive/` 子目录）：
   ```bash
   ls .roadmaps/ | grep -v '^archive$'
   ```

   向用户提问让用户选。

   **重要**：不要猜或自动选 roadmap。始终让用户选。

2. **读 roadmap 与 verify**

   读 `.roadmaps/<name>/roadmap.md` 与 `.roadmaps/<name>/verify.md`。

   任一不存在则报错停止，不能归档：
   - roadmap.md 缺失 → 提示 "未找到 .roadmaps/<name>/roadmap.md"，先运行 /shw-roadmap-explore 生成
   - verify.md 缺失 → 提示 "未找到 .roadmaps/<name>/verify.md"（缺终态句集，归档无核对对象），先运行 /shw-roadmap-verify 生成

3. **问归档类型**

   向用户提问归档类型：

   - **完成**：goal 已宣布完成或终态基本达成 → 走第 4 步完成路径
   - **放弃**：方向变化 / 需求取消 / 判断不值得继续 → 走第 4 步放弃路径

4. **按归档类型收尾**

   #### 完成路径

   **a) 终态核验**：verify.md 无勾选表——核验对象是 **verify.md 终态句集 × roadmap.md 执行轨迹中的取证记录** 的交叉核对：逐句读终态句，到执行轨迹中找对应的取证记录与验证结论。

   发现以下任一情况 → 警告"完成判据未满足"，列出问题句：
   - 有达成宣称但轨迹中无对应取证记录
   - 明显未达成的终态句

   警告后向用户提问给出选项：
   - **停下**：命令无变更结束，提示继续用 goal 驱动补齐取证的达成
   - **转放弃归档**：走下方放弃路径（理由必填）

   **b) 目检最终确认门**：把 verify.md 中标注"最终需用户目检"的条目逐条向用户确认结果。

   - 有未通过的 → **不归档**，输出修复引导：开修复 change 回修该条目，回修 change 归档后重跑本命令（`/shw-roadmap-archive <name>`）
   - 全部通过或无目检项 → 继续

   **c) spec 同步核验**：读 roadmap.md 执行轨迹收集本周期归档的 change 名单，逐个对照 `.changes/archive/<change>/specs/` 的 delta spec 与主 `specs/` 现状，识别未并入主 specs 的 delta。

   - 有未并入的 → 列出欠账清单（change 名 + delta 概要），经用户确认后加载 `shw-change-sync-spec` skill（全量一致性合并流程）逐个补同步，并向用户展示合并摘要
   - 全部已并入（或本周期无归档 change）→ 摘要中注明"spec 全部同步，无欠账"，继续

   **d) 轨迹收尾**：向 roadmap.md 执行轨迹追加最终条目——归档类型（完成）+ 日期 + 一到两句达成总结：

   ```markdown
   ### YYYY-MM-DD 归档（完成）

   - <一到两句达成总结>
   ```

   #### 放弃路径

   要求用户给出**放弃理由**——必填，不许静默丢弃（理由入轨迹，历史可查）。用户未给出理由前不进入下一步。

   放弃归档同样执行 **spec 同步核验**（同完成路径 c）——已归档 change 的成果应进主 specs，不随 roadmap 放弃而丢失。

   向 roadmap.md 执行轨迹追加最终条目——归档类型（放弃）+ 日期 + 理由：

   ```markdown
   ### YYYY-MM-DD 归档（放弃）

   - 放弃理由：<用户给出的理由>
   ```

   放弃归档不要求终态达成——不做终态核验、不走目检门。

   两条路径的轨迹收尾都在第 5 步归档移动**前**完成——目录移入 archive 后即为历史记录，不再有任何写入。

5. **归档移动**

   若 `.roadmaps/` 下不存在 `archive` 目录则创建，然后用当前日期生成目标名 `YYYY-MM-DD-<name>` 执行移动：

   ```bash
   mkdir -p .roadmaps/archive
   mv .roadmaps/<name> .roadmaps/archive/YYYY-MM-DD-<name>
   ```

   **检查目标是否已存在：**
   - 已存在 → 失败并报错，建议检查现有归档内容或改名，**绝不覆盖**
   - 否则 → 执行移动

   归档后目录即为历史记录——roadmap.md（执行轨迹这条学习资产绝不删除）与 verify.md 整体保留。

6. **Git commit（自动提交，不 push）**

   `.roadmaps/` 是本地工作区不入库——第 5 步的归档移动本身不产生 git 变更，**绝不把 `.roadmaps/` 加入 git 暂存**。commit 只覆盖第 4 步 spec 同步核验中补同步实际产生的 `specs/` 变更；提交后**不执行 push**——push 由用户手动操作。

   1. 检测当前目录是否是 git 仓库：`git rev-parse --git-dir`
   2. 是 git 仓库且 spec 补同步产生了 `specs/` 变更，则只 add 本次补同步实际改动的文件后提交——不整目录 add，不得把 `specs/` 下与本归档无关的未提交变更打包进 commit：
      ```bash
      git add <本次补同步实际改动的 specs 文件，逐个列出>
      git commit -m "归档 roadmap: <name>（完成）"
      ```
      放弃归档的 message 为 `归档 roadmap: <name>（放弃）`——message 标记这批 spec 变更的触发语境（由本次归档的补同步产生）。
   3. **不执行 `git push`**

   **异常处理：**
   - 非 git 仓库 → 跳过提交，在摘要中注明 "非 git 仓库，跳过提交"
   - spec 补同步未产生 `specs/` 变更 → 跳过提交，在摘要中注明
   - git 命令出错 → 在摘要中注明错误信息，不影响归档结果

7. **显示摘要**

   展示归档完成摘要，含：
   - roadmap 名
   - 归档类型（完成 / 放弃）
   - 归档位置
   - Git commit 状态（committed / skipped / error）
   - 关于任何警告的说明（终态核验警告、目检结果等）

**成功时的输出**

```
## 归档完成

**Roadmap：** <name>
**归档类型：** 完成（或 放弃）
**归档到：** .roadmaps/archive/YYYY-MM-DD-<name>/
**Git：** <committed（请手动 push）/ skipped（无 spec 变更或非 git 仓库）>
```

**约束**
- 未提供时始终提示选 roadmap，不猜不自动选
- 目检未通过不归档——引导开修复 change 回修，回修归档后重跑本命令
- 放弃理由必填，不许静默丢弃
- 验证归档目标不存在，绝不覆盖已有归档
- 有 spec 补同步变更时自动 commit（只含补同步改动文件）但不 push（push 由用户手动执行）；无 spec 变更或非 git 仓库则跳过 commit 并在摘要注明
- 执行轨迹是学习资产绝不删除；轨迹收尾在移动前完成，归档后不再写入
- spec 同步核验发现的欠账经用户确认后补同步，不静默跳过
