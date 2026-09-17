# 工程检查历史同步证据

本规则只适用于工程检查，不适用于 API/E2E/VRT 回归比较或基线写入。

同一 dev→main PR 因 main 回灌产生纯历史 merge 时，只有同时满足以下条件才可复用第一父提交已成功的工程检查：head tree 与第一父 tree 相同、base 未变、来源仓库与 PR 相同、第一父是该 PR 的先前 head、所需工程 jobs 完整成功且证据可读取。缺失、歧义或内容变化时重新执行工程检查。

复用必须保留轻量 run、原 run/job、SHA 与 tree 证据；不得把 Issue 定向结果、其他 PR、其他候选或 API/E2E/VRT 报告当发布工程检查。用户 main 合并权不授权 Agent 伪造绿色或跳过来源/制品校验。
