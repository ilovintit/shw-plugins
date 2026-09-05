---
name: shw-tdd
description: Issue 交付中的测试先行纪律。按 test-plan 映射先写失败断言，再实现；本地只做断言自审与 build/typecheck，真实红绿由 PR CI 判定。
---

# TDD：测试先行，CI 判定

## 铁律

没有针对验收标准的失败断言在前，不写实现代码。

1. 从 Issue AC 与 `/shw-test-plan` 取得稳定 `TC:` 用例和测试层级。
2. 写最小测试；逐断言确认“缺少实现时会因为目标行为缺失而失败”，不是 typo 或 mock 自证。
3. 写满足该测试的最小完整实现。
4. 本地只运行 build/typecheck，不运行单元、集成、API、E2E、VRT或性能测试。
5. 推送 PR，由 CI 证明红绿；失败时改实现或修正真正错误的测试映射，不为过绿删除有效断言。
6. CI 绿后才能重构，下一次 push 必须保持绿。

测试与实现进入同一个 Issue 分支和 PR。roadmap 每次仍只为当前一个 Issue执行本循环。

若测试难以表达，通常说明 AC、接口或架构未收敛，应在写代码前返回裁决，不用大量 mock 掩盖设计问题。
