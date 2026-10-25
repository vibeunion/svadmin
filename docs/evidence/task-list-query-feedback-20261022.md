# 任务列表查询反馈

## 续接契约

- parent/source: 企业级 UI 路线图批次三任务与通知中心 / 用户继续完善请求。
- reason: 独立 TaskList 读取失败被描述为格式错误且没有读取重试入口；
  TaskQueueDrawer 持有查询但只向 TaskList 传数组，未传递错误和初始加载状态。
- goal: 查询归属组件显示统一加载/错误反馈，提供当前列表的读取重试，
  错误期间隐藏旧列表与详情操作，恢复后再次显示有效数据。
- scope: TaskList、TaskDetails、TaskQueueDrawer、TaskQueueDrawer 单文件测试、本文
  与路线图。
- non-goals: 不修改 TaskProvider、任务执行重试/取消、持久化、权限或发布协议；
  不将列表读取重试描述为任务重新执行。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收场景

1. Given 独立列表查询失败，When 用户点击 Retry，
   Then 只触发列表 refetch，不调用任务 retry/cancel。
2. Given 抽屉任务或 DLQ 页签查询失败且存在缓存数据，When 展示该页签，
   Then 显示 DataState 错误而非空列表，隐藏旧行和详情操作；重试只重读当前页签。
3. Given 正在初始加载或重新读取，When 用户操作刷新，
   Then 不显示伪空态，读取中的刷新被禁用，不提供重复 Retry。
4. Given 失败的读取重试成功，When query 状态恢复，
   Then 独立列表、任务页签和 DLQ 页签均移除错误反馈并显示对应记录。
5. Given 任务详情读取失败或正在加载，When 用户查看详情，
   Then 使用详情级错误/加载反馈，隐藏旧任务内容；可重试时只 refetch 详情，
   禁用读取或缺少 taskId 时不显示 Retry。

## 实现

- 使用既有 DataState，不增加颜色、布局 token 或新公共属性。
- 两个查询归属组件显式关闭 query 错误通知，由本地错误区反馈。
- 任务列表保留对直接传入坏数据的格式校验；Provider 读取错误使用通用
  `task.fetchListFailed`，不显示未经处理的异常文本。
- TaskDetails 同样区分直接值解码失败与 Provider 读取失败；`canRead` 同时要求
  `useProviderData`、taskId、Provider 和未被宿主禁用，避免错误区绕过查询配置。
- 重试与刷新使用 `cancelRefetch: false` 和 fetching 守卫；
  Query 的执行结果仍由现有 hook 负责，无新增本地缓存。

## 验证

- 在 `packages/ui` 执行
  `bunx vitest run src/components/TaskQueueDrawer.test.svelte.ts`：最终 **32/32**。
- 另执行 `bunx vitest run src/components/task-detail-query.test.svelte.ts`：
  **5/5**。该文件使用真实 `useTask`、`QueryClient` 和本地 stub TaskProvider，
  没有 mock `@svadmin/core`，直接断言 disabled/missing-id/direct 门禁、连续读取失败与
  重试恢复、读取中隐藏 Retry、Provider 替换后的迟到响应隔离。
- 第一版增加独立列表重试后 17/17；扩展抽屉场景时发现旧 useTask mock
  固定初始 taskId。改为响应式 getter，并将原有列表文本断言限于 table，
  避免把正常详情重复显示标题误报为失败，最终覆盖原有提交/取消/隔离回归。
- 查询状态和 refetch 是 mock；成功恢复用 SvelteSet 驱动响应式错误状态。
  不将这些测试视为真实 Provider 网络、刷新持久化或通知服务集成证明。
- Bohr 对生产增量只读复核无明确 P0/P1/P2；复核者未运行测试。
- `git diff --check` 通过；没有运行全仓测试、构建或发布。

## 未完成边界

- 真实 TaskProvider、浏览器、读屏、页面刷新后的任务恢复与服务端持久化。
- Provider 不支持 list/listDlq 或 get 时的能力反馈。
- 本轮没有证明真实读取再次失败的网络路径或重复通知计数。
- 不提交、不推送、不发布、不部署；整体企业级规范目标保持未完成。

## 详情续接记录

- parent: 本文上一轮 TaskList/TaskQueueDrawer 查询反馈；source: 用户继续请求。
- reason: 列表恢复后，独立 TaskDetails 仍将读取失败误报为格式错误，没有恢复
  入口且标题保留旧任务内容。
- scope: 只补 TaskDetails、同一个 TaskQueueDrawer 测试文件和证据文档；
  沿用 medium / managed，主线程唯一 writer，Bohr 只读复核。
- 新增七例，覆盖错误安全展示、恢复、加载、读取中抑制重复操作、直接值独立性、
  disabled 查询与缺失 taskId；合并既有测试最终 32/32。
- 旧坏数据拒绝与列表/抽屉提交隔离回归保持通过；没有改变任务执行 retry/cancel。

## 真实 Hook 续接记录

- parent/source: 上述详情续接 / 用户继续请求及复核发现的 mock 覆盖缺口。
- goal/scope: 仅新增详情测试宿主和一个集成测试文件，使用真实查询 hook 验证
  门禁与恢复；不修改生产代码，不连接外部任务服务。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读复核。
- 三个门禁用例先确认 QueryClient 已注册 query，再检查 Provider get 零调用，
  最后在同一实例启用查询，验证 get 确实调用一次，避免以未挂载组件证明门禁。
- 原 mock 曾尝试根据 enabled 隐藏 isError，这不能证明读取门禁，已恢复原样，
  32/32 重新通过；门禁证明以独立真实 hook 文件 5/5 为准。
- Bohr 曾指出 Provider 替换迟到回归释放 Promise 后缺少结算屏障；现已加入
  `setTimeout(0)` 事件循环推进与 `QueryClient.isFetching() === 0` 等待，
  集成测试 5/5 重跑通过，避免断言过早。
- 外部网络、数据库持久化、真实用户权限和通知计数仍未验证。
