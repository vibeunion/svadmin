# RelationPicker 第二页失败恢复（2026-10-22）

## 范围

- parent: `enterprise-ui-plan.md` 批次二实体与关系选择器
- source: 用户继续企业级规范；reason: 第二轮分页失败后的错误、重试、草稿保留与
  键盘重复激活边界尚无独立证据
- scope: `packages/ui/src/components/RelationPicker.svelte`、
  `relation-picker.test.svelte.ts`、`scripts/fixtures/enterprise-ui/RelationPickerFixture.svelte`、
  `relation-picker.spec.ts`
- Delegation Decision: medium / native；主线程单写入，确定性单文件测试加专属
  浏览器矩阵验证，未修改 core、依赖、全局样式，不提交、推送、发布或部署。
- 远程环境：本轮未连接任何远程主机，未做部署或生产验证，不涉及环境归属判定。

## 验收约定

Given 多选草稿已勾选第一页记录，When Load more 第二页失败，Then 只显示通用错误
（`select.loadFailed`），不回显 Provider 原始错误，Confirm 禁用且激活不提交，
草稿保留。

Given 点击 Retry，When 第二页读取成功，Then 第一页与第二页记录同时可用，原草稿
仍为勾选态；再选第二页记录后 Confirm 只提交一次且值为精确的 `[1, 2]`。

Given 第二页恢复后，When 通过键盘重试、Cancel 或 Escape 离开，Then 不产生重复
第二页请求、不误提交，草稿在重开后清空。

## 过程与红绿

1. 先补单文件测试，未改动生产组件。首轮“重试在途时 Retry 应禁用”的断言为
   **1 failed / 27 passed**；排查发现失败原因是测试持有的是错误分支中的节点，
   而重试开始后错误区已被加载态替换，节点已卸载，属于断言对象错误，不是产品
   缺陷。
2. 修正断言为真实不变式：重试在途时不存在“可用的 Retry / 可勾选行 / 可提交
   Confirm”，并连续触发键盘 Enter 与 Confirm 点击，断言第二页请求数与提交次数
   不变。修正后 **28/28** 通过。
3. 另加“同一 tick 内两次激活 Retry”探针，并在临时移除（随后还原）任何生产
   加固的条件下单独运行，仍为通过：TanStack Query 已折叠同一查询键的重复
   refetch。因此本轮未发现需要在 `RelationPicker.svelte` 落地的生产缺陷，
   组件文件保持本轮开始前的状态，未做任何修改。
4. 补充第二页恢复后的 Cancel/Escape 用例后，最终单文件 **31/31** 通过。

## 结果

- 组件定向测试：

  ```sh
  cd packages/ui
  npx vitest run --config ./vitest.config.ts src/components/relation-picker.test.svelte.ts
  ```

  **31/31**，退出码 0。

- 浏览器专属矩阵：

  ```sh
  cd scripts/fixtures/enterprise-ui
  npx playwright test --config playwright.relation-picker.config.ts
  ```

  **24/24**，退出码 0（4 个场景 × Chromium/WebKit/Firefox × 1440px 桌面、390px
  窄屏）。

- 浏览器覆盖：
  - 第二页失败后 `role="alert"` 文本为通用文案，Dialog 内不出现 Provider 原始
    `PRIVATE` 字符串，Confirm 禁用，Enter 不改变提交计数。
  - 重试在途用真实键盘 Enter 重复激活，`page-two-calls` 保持 2，Confirm 仍禁用，
    提交计数保持 0；释放慢请求后第一页与第二页记录同时可见，原第一页草稿仍
    勾选。
  - 再选第二页后按 Enter 确认，`relation-changes` 为 1，
    `relation-value` 为 `[1,2]`，并且第二页请求数不再增加。
  - 恢复后 Escape、Cancel 两条路径均关闭 Dialog、提交计数保持 0，重开后第一页
    勾选已清空。
- `git diff --check` 通过。

## 边界

- 使用本地 DataProvider stub 注入失败与慢响应，不证明真实授权、租户服务、
  分页一致性、请求取消/超时、并发冲突或服务端幂等；不能把 Provider stub 当作
  真实服务认证。
- 未运行全仓测试、typecheck、构建或发布验证；本轮结论仅覆盖上述单文件与专属
  浏览器矩阵。
- DOM/Dialog/键盘自动化不等同于屏幕阅读器认证。
- 本轮未改动生产组件；若后续 TanStack Query 的 refetch 语义或错误分支渲染
  策略变化，需重新验证“重试在途无重复请求/误提交”不变式。