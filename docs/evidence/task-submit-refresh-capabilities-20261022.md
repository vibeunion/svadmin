# 提交后按能力刷新任务队列

## 续接约定

- parent: `task-list-row-identity-20261022.md`
- source: 用户要求继续完善整体企业级规范。
- reason: 提交成功后手动 refetch 两个队列，会绕过查询 enabled 的能力门禁。
- goal: 仅刷新支持的列表，读取失败不变成提交失败，不重复发出任务写入。
- scope: TaskQueueDrawer、现有单文件测试、本文及路线图。
- non-goals: 不修改核心 hook、任务提交协议、服务端幂等或发布流程。
- risk/orchestration: medium / managed；主线程唯一 writer，独立只读 verifier。

## 验收场景

```gherkin
Given Provider 仅支持普通队列、仅支持 DLQ 或均不支持
When 任务提交成功
Then 仅刷新支持的队列，任务表单正常关闭

Given Provider 同时支持两种队列
When 提交成功但列表刷新失败
Then 提交仍保持成功，不重开表单、不显示提交失败、不重复写入
```

## 验证状态

- 在 `packages/ui` 执行
  `bunx vitest run src/components/TaskQueueDrawer.test.svelte.ts`：41/41 通过。
- 新增普通队列单独可用、DLQ 单独可用、均不可用三种提交成功后的刷新断言，
  以及两路读取拒绝不误报提交失败、不重复写入、不泄露诊断的回归。
- Bohr 独立只读复核无 P0/P1/P2 阻断。
- 本地 mock 只证明组件调用，不证明真实服务网络请求；真实 Provider、浏览器、
  读屏和发布验收未完成。
