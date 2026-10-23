# 审批中心刷新与操作反馈

## 续接约定

- parent: `roles-settings-feedback-20261022.md`
- source: 用户继续完成企业级规范
- reason: 审批提交期间仍可刷新，刷新会使旧详情和操作状态失去边界；操作失败
  的错误需要留在对话框内，同时保留意见草稿供重试。
- goal: 建立审批中心的刷新/提交互斥、旧详情清理和脱敏失败重试契约。
- scope: `ApprovalCenter.svelte`、`approval-center.test.svelte.ts` 及本文。
- non-goals: 不修改审批 Provider 协议、服务端并发冲突处理、权限模型或发布流程。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 实施结果

1. 刷新开始时清理记录、当前操作对话框和旧详情，避免加载期间继续操作过期数据。
2. 加载期间禁用刷新和操作入口；重复刷新不会发起第二次列表请求。
3. 审批提交期间禁用刷新，提交完成后恢复；提交仍由本地 pending 状态防止重复执行。
4. 诊断、空 `Error` 和非 `Error` 的提交失败均显示通用文案，不泄露 Provider 原文。
5. 操作失败保留对话框和意见草稿，重试成功后关闭对话框并清理错误。
6. 保留 epoch 校验，迟到的列表或操作回执不能污染当前作用域。

## 验证

在 `packages/ui` 执行：

```text
bunx vitest run src/components/approval-center.test.svelte.ts
```

结果：**1 个测试文件通过，11/11 通过**。

`git diff --check`：通过。

Bohr 只读复核：生产代码未发现 P0/P1/P2 阻断；指出刷新测试缺少真实操作入口
前置条件。已补充 `transition` stub、打开对话框的前置断言、刷新后的关闭/无提交
断言，并将提交结束的等待条件改为刷新恢复可用；再次单文件测试 11/11 通过。
弹窗打开后的刷新通过组件级事件触发，仅验证内部清理，不作为浏览器可交互证据。

测试覆盖本地 Provider stub 的加载、刷新、操作互斥、错误脱敏、草稿保留和重试。
未覆盖真实审批服务、权限边界、服务端并发冲突、浏览器/读屏/跨浏览器及发布验收。
