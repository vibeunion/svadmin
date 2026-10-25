# 任务列表查询门禁

## 续接约定

- parent: `audit-timeline-localization-20261022.md`
- source: 用户要求继续完成整体企业级规范。
- reason: TaskList 的 queryOptions 展开顺序允许 enabled 覆盖 useProviderData，
  且读取重试没有遵守 enabled:false。
- goal: 直接数据、查询禁用、缺少 Provider 时不自动读取或暴露读取重试。
- scope: TaskList、真实 QueryClient 的单文件回归与测试宿主、本文和路线图。
- non-goals: 不修改核心查询 hook、任务状态机、轮询协议、Provider 能力声明或发布流程。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读 verifier。

## 验收场景

```gherkin
Given 外部任务数据或 useProviderData:false
When queryOptions.enabled:true
Then 不调用列表 Provider，保留外部数据

Given 查询禁用或缺少 Provider
When 挂载任务列表
Then 不触发读取，启用并提供 Provider 后恢复读取

Given 列表读取失败
When 宿主禁用查询
Then 不显示读取重试且不隐式请求

Given 列表读取失败且查询允许
When 重试正在进行
Then 不重复读取，不调用任务重执行或取消接口
```

## 验证状态

- 在 `packages/ui` 执行
  `bunx vitest run src/components/task-list-query.test.svelte.ts`：**7/7 通过**。
- 使用真实 `useTaskList` 和 QueryClient，本地 stub Provider；覆盖直接数据、
  显式退出读取、禁用、缺少 Provider、恢复读取及普通/DLQ 队列重试。
- 初次测试发现禁用后重试按钮仍存在；已将按钮和重试函数统一到 `canRead`。
- `git diff --check` 通过。
- Bohr 独立只读复核确认本轮增量无 P0/P1/P2 阻断，未发现范围内的明确覆盖缺口。
- 真实任务服务、浏览器、读屏和发布验收仍未完成。
