# AutoTable 批量删除部分成功后重试单文件补记

## 任务契约

- parent/source: `docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` B3-04；续接矩阵批量操作。
- reason: 已有证据证明 `deleteOne` 逐条回退部分成功后仅保留失败项选中，但没有断言“用户显式再次操作只重试失败 ID”。
- goal: 只改 `packages/ui/src/components/auto-table-interactions.test.svelte.ts`，补两个缺口用例并单文件运行。
- non-goals: 不改生产实现、不改 Core/Provider 协议、不运行其他测试文件、不做全仓 test/build/typecheck、不提交、不推送、不部署。
- scope: 本文件、`docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` 的 B3-04 段落。
- risk/orchestration: 低风险测试补强；pi 为唯一 writer，主线程为待复核方，主线程做独立审查。

## 前置只读检查

- `auto-table-interactions.test.svelte.ts` 已有“部分成功仅保留失败项选中”断言，未覆盖显式重试的成功 ID 隔离。
- `AutoTable.svelte` 经 `createListDeletion` 的 `requestBatchDelete` 从当前 `selectedIds` 取 ID，`pending` 期间直接返回；`confirm` 会校验请求 ID 与当前选中一致。
- `list-deletion.svelte.ts` 在 `DeleteManyPartialError` 后调用 `retainFailedIds`，未发现需要修改的真实生产缺陷。
- 因此本轮只加测试，不改 `AutoTable.svelte`、Core 或 Provider。

## 新增断言

在 `packages/ui/src/components/auto-table-interactions.test.svelte.ts` 新增两个用例：

1. `retries only the failed ids after a partially successful delete-one fallback`
   - 首次批量删除 `user-1` 成功、`user-2` 失败，断言 `deleteOne` 调用序列为 `['user-1', 'user-2']`，仅保留 1 条选中。
   - 用户显式再次点“批量删除 (1)”并确认后，断言调用序列严格为 `['user-1', 'user-2', 'user-2']`，成功 ID `user-1` 只请求 1 次。
   - 第二次成功后断言失败记录行消失、选择与批量删除入口清除、通知总数为 2（一次部分失败、一次成功）。
2. `does not append a second batch delete request while deletion is pending`
   - 确认删除后先等待工具栏 `aria-busy=true`，再在 pending 期间重复点击“批量删除 (1)”和“清除选择”。
   - 断言 `deleteMany` 仍只调用 1 次、未出现第二个确认框、选择仍为 1 条。
   - 完成后仍只有 1 次请求、1 次成功通知，证明 pending 期间重复操作不追加请求。

第一次运行曾因用例在 Svelte 刷新 pending 之前就重复点击而失败；这是测试时序问题，不是生产缺陷。改为等待 `aria-busy=true` 后通过，未改生产代码。

## 实际执行

在 `packages/ui` 执行：

```bash
bunx vitest run --config ./vitest.config.ts src/components/auto-table-interactions.test.svelte.ts
```

- 结果：1 个测试文件通过，**50/50** 测试通过（原有 48 + 本轮新增 2）。
- 原始退出码：**0**。
- duration：**14.64s**。
- 未使用 `tail` 截取结果。
- `git diff --check`：原始退出码 **0**。

## 边界

- 本轮 50/50 = 既有 48 个用例 + 本轮新增 2 个用例；不把新增用例外推为服务端能力。
- **不证明服务端幂等**：未验证幂等键、重复提交去重、事务或服务端部分成功回执。
- **不证明事务**：回退是客户端逐条 `deleteOne`，不是服务端原子批量事务。
- **不证明真实取消**：未验证请求中止、服务端取消协议或取消后的资源状态。
- **不证明跨页全量删除**：未执行“全部匹配”范围的批量删除，也未验证跨页删除协议。
- 仍不覆盖当前页批量执行载荷、真实 Provider/RBAC/租户、浏览器键盘/读屏和发布验收。
- 既有 `batch-operation-audit-20261022.md` 的 48/48 记录保持不变，本轮不与其中主线程复核次数合并。

## 复核状态

- **pi 自测**：单文件 **50/50** 通过、原始 exit code **0**、duration **14.64s**；`git diff --check` exit code **0**。
- **主线程独立复核**：单文件 **50/50** 通过、原始 exit code **0**、duration
  **14.39s**；`git diff --check` exit code **0**。与 pi 的 50/50、14.64s
  分开记录。
- 结论边界：仅把“部分成功后显式重试只请求失败 ID”和“pending 期间重复操作不追加请求”提升为当前单文件可证明，不关闭 B3-04 的服务端幂等/事务/真实取消/跨页全量删除验收。
