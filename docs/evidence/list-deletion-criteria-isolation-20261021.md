# 删除执行与筛选条件隔离

## 任务契约

- parent/source: `auto-table-batch-toolbar-20261021.md`；批量执行链路继续完善。
- goal: 筛选条件变化后，旧删除请求的异步结果不得改写新筛选上下文中的选择或错误状态。
- non-goals: 不取消后端请求，不改变 Provider 幂等、部分成功协议或权限协议。
- scope: `list-deletion.svelte.ts`、对应单文件测试、本文及路线图证据索引。
- 验证续接: 增加 `auto-table-interactions.test.svelte.ts` 的消费者集成场景，
  同步前轮工具栏证据计数；不扩展业务写入范围。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

Given 删除执行中且用户切换筛选条件，
When 旧删除请求成功、普通失败或部分失败，
Then 新筛选的选择与页内错误不被旧请求覆盖，pending 仅在原请求结束后释放。

## 实现边界

删除确认捕获当前筛选条件代际。筛选变化会使代际递增；旧请求仍等待完成，
但成功清除、普通失败恢复、部分失败保留和错误提示均被丢弃。未提交的批量确认
仍按原规则关闭，跨资源/租户/Provider 的 scope token 仍独立生效。

## 验证

- `packages/ui/src/components/list-deletion.test.svelte.ts`：27/27 通过。
- 真实 reactive filters 经 `createListSelection.onCriteriaChange` 触发代际变化。
- 悲观/撤销两模式各覆盖成功、普通失败、部分失败；切换筛选后再切回原条件，
  新选择 `[2]` 不被旧请求改写。单条删除成功或部分失败也不能改写新列表选择。
- pending 期间重复提交继续被拒绝，请求结束后可提交新批量操作。
- 覆盖旧 Promise rejection 紧邻筛选更新、且更新尚未 flush 的同轮调度顺序。
- 只读复核的同轮调度疑点已通过上述测试关闭；模型范围无剩余 P0/P1/P2。
- `auto-table-interactions.test.svelte.ts`：48/48 通过；真实 AutoTable 在
  undoable 模式 pending 时搜索，旧失败既不恢复原选择，也不显示旧页内错误。
  原 mutation 的失败通知仍恰好触发一次，未把结果隔离误作服务端取消。
- `git diff --check`：通过。
- 本地模型测试不证明后端取消、幂等、真实通知服务或浏览器/读屏验收。
  Provider 的结果通知和缓存刷新仍由原有 mutation 链路负责，本轮仅隔离模型回写。
