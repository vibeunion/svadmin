# 批量操作 B3-04 单文件复核

## 任务契约

- parent/source: `docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` B3-04；用户要求复核企业级矩阵批量操作，并交叉链接 B3-01 的当前页/全部匹配载荷证据。
- reason: B3-04 原矩阵标注“文档记录已验证但本轮未复跑”，需重新执行直接相关测试并收紧覆盖边界；主线程已独立复核 48/48，但当前页/全部匹配载荷只能在 `resource-workspace` 消费者断言中交叉引用，不能冒充服务端跨页删除协议。
- goal: 只运行 `packages/ui/src/components/auto-table-interactions.test.svelte.ts`，记录批量操作实际覆盖、原始退出码和未覆盖项目。
- non-goals: 不新增代码、不修改生产实现、不运行 `list-deletion.test.svelte.ts` 或其他文件、不做全仓测试/build/typecheck、不提交、不推送、不部署。
- scope: 本文、`docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` 的 B3-04 段落。
- risk/orchestration: 本轮为只读复核加证据文档更新；pi 为唯一 writer，主线程为待复核方。

## 实际执行

在 `packages/ui` 执行：

```bash
bunx vitest run --config ./vitest.config.ts src/components/auto-table-interactions.test.svelte.ts
```

- 结果：1 个测试文件通过，**48/48** 测试通过。
- 原始退出码：**0**。
- 未使用 `tail` 截取结果。
- `git diff --check`：原始退出码 **0**。
- 本轮**未运行** `packages/ui/src/components/list-deletion.test.svelte.ts`；该文件的历史 27/27 仅来自既有证据文档，不作为本轮执行结果。

主线程独立复核另行确认：同一命令 **48/48** 通过、原始退出码 **0**、duration **15.14s**，
并执行 `git diff --check` 得到原始退出码 **0**。这是两轮独立运行，分开记录，不合并次数。

## 当前页执行补记（2026-10-23）

只改 `packages/ui/src/components/resource-workspace.test.svelte.ts`，新增 1 个真实 `ResourceOperationsPage → AutoTable` 消费者用例，未改生产代码、未造服务端事务。用例断言：当前页全选后 `Process selection` 的 `onBatch` 精确为 `[1]`，`onSelection` 为 `{ scope: 'selected', ids: [1], currentPageIds: [1] }`；切换到第 2 页但不选择后再次执行仍只传 `[1]`，`currentPageIds` 为空，未把第 2 页记录加入载荷。搜索边界由既有 `clears selected/all selection when search changes` 直接覆盖，本用例不重复。

在 `packages/ui` 只运行：

```bash
bunx vitest run --config ./vitest.config.ts src/components/resource-workspace.test.svelte.ts
```

- 结果：1 个测试文件通过，**36/36** 测试通过。
- 原始退出码：**0**。
- duration：**12.13s**。
- `git diff --check`：原始退出码 **0**。

该 36/36 为当前文件本轮结果，不与 `auto-table-interactions` 的 48/48 或 50/50 合并；仍为本地受控 DataProvider/AccessControl stub，不证明真实批量写入、服务端事务/幂等、真实取消或 RBAC。

## 本文件实际覆盖

以下仅指 `auto-table-interactions.test.svelte.ts` 本轮运行到的断言，按 B3-04 范围归并：

- **已选范围**：单行/多行显式选择后显示稳定的批量工具栏和选择计数；批量删除、自定义批量动作收到预期 ID；数字主键在权限检查、自定义批量动作和 `deleteMany`/`deleteOne` 链路中保持数字类型。
- **全部匹配范围（仅选择与清除）**：支持“选择全部匹配记录”，计数为匹配总数；逐条排除全部匹配记录后工具栏仍以零计数保留清除入口；清除后工具栏消失。该用例**没有执行全部匹配范围的批量删除**。
- **当前页范围**：本文件**未直接断言**表头“选择当前页”或 `BatchSelection.currentPageIds` 的批量执行语义。
- **部分成功**：`deleteMany` 不可用时走 `deleteOne` 逐条回退；第二条失败时恰好通知一次“1/2 条未成功”，仅保留失败记录为选中，批量动作计数降为 1；数字 ID 回退同样保留失败项。该覆盖是客户端逐条回退的部分成功，不等同服务端 `DeleteManyPartialError` 协议。
- **筛选代际**：批量删除 pending 期间修改搜索条件后，旧请求失败不会恢复旧选择、不会显示旧页内错误；原失败通知仍恰好一次。租户或 Provider 切换后，旧请求迟到失败不会关闭或改写新的删除确认框，也不会重新选中旧记录。
- **处理中锁定**：删除 pending 时工具栏 `aria-busy=true`，动作容器 `inert`，清除按钮禁用；状态播报节点位于 busy 区域外。删除失败后 busy/inert/禁用均解除，选择保留。全局 optimistic 模式下 pending 期间已选行仍保持可见，失败后选择恢复。
- **权限与边界**：批量删除权限被拒绝时自定义批量动作仍可见；全局 undoable/optimistic 配置下批量删除仍走受控的 checked 边界；单条确认删除复用批量边界时不显示批量工具栏。
- **成功路径**：批量删除成功后清除选择并只通知一次成功。

## 明确未覆盖 / 不外推

- **取消/重试**：本文件没有显式“用户取消批量执行”或“部分成功后只重试失败项”的用例；筛选变化场景是旧结果隔离，不是服务端取消。
- **服务端幂等**：未验证幂等键、重复提交去重、事务或服务端部分成功回执。
- **真实取消**：未验证请求中止、服务端取消协议或取消后的资源状态。
- **当前页批量协议**：未在本文件运行。
- **全部匹配批量执行**：只验证选择、排除和清除，未验证按查询范围执行删除的协议。
- **交叉链接（当前页/全部匹配载荷）**：当前页选择、跨页已选 ID、`scope: 'all'`、`excludedIds`、`total`、`filters`、`sorters` 的载荷断言在 `packages/ui/src/components/resource-workspace.test.svelte.ts` 的现有用例中（如“keeps page deselection local…”“passes all matches as a query…”）。这些是本地消费者载荷证据，**不冒充服务端跨页全部匹配删除**，也不证明服务端协议、幂等或事务。
- **真实后端/权限/租户**：测试使用本地受控 DataProvider、AccessControl stub 和 mock 回调，不证明真实 Provider、RBAC 或租户隔离。
- **浏览器键盘/读屏/发布**：本文件为 DOM 模拟器测试；不证明真实浏览器键盘路径、屏幕阅读器、视觉或发布验收。
- **`list-deletion.test.svelte.ts`**：本轮未运行，不能把其历史结果并入本次 48/48。

## 复核状态

- **pi 自测**：已完成上述单文件执行，48/48 通过，原始 exit code 0；`git diff --check` exit code 0。
- **主线程独立复核**：已完成同一命令独立复跑，48/48 通过、原始 exit code 0、duration 15.14s；主线程另确认 `git diff --check` exit code 0。48/48 实际包含详情抽屉、完整详情/编辑导航与列表 query 恢复，但这些属于 `auto-table-interactions` 组件级证据，不是当前 `resource-workspace` 完整消费者流程。
- 结论边界：本文件只把上述局部批量交互提升为“当前本轮单文件可证明”，不关闭 B3-04 的完整验收。
