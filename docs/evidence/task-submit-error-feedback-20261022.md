# 任务提交失败反馈

## 续接约定

- parent: `task-queue-capabilities-20261022.md`；source: 用户继续完成企业级规范。
- reason: 提交失败仍展示捕获异常的原始 message，空 Error 会隐藏错误提示。
- goal: 使用本地化任务提交失败提示，保留名称与 JSON 草稿及重试能力。
- scope: TaskQueueDrawer 提交 catch、既有单文件测试、本文与企业 UI 计划。
- non-goals: 不修改 Provider 协议、任务幂等、列表能力门禁、布局或发布流程。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读复核。

## 验收场景与证据

1. Given 提交抛出诊断、空 Error 或非 Error，When 收到失败，
   Then 显示 Task submission failed，不展示原始诊断。
2. Given 提交失败，Then 名称与 JSON 草稿保留，不刷新任务或死信列表。
3. Given 再次提交成功，Then 原草稿参数再次提交、表单关闭、列表各刷新一次。
4. 在 `packages/ui` 执行
   `bunx vitest run src/components/TaskQueueDrawer.test.svelte.ts`：**37/37 通过**。
5. Bohr 只读复核无阻断；其建议的名称/body 草稿保留断言已包含在最终三类异常
   用例中，另断言失败不刷新、重试成功后各列表刷新一次。`git diff --check` 通过。

测试 mock 了 useSubmitTask，证明组件反馈与调用契约，不证明真实 Provider
幂等、部分写入或持久化恢复。浏览器、语言切换、读屏、真实服务与发布仍未验收。
