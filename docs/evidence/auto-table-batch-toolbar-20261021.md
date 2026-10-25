# AutoTable 统一批量工具栏

## 任务契约

- parent/source: `batch-action-bar-contract-20261021.md`；用户继续完善企业 UI。
- reason: AutoTable 仍维护独立选择横幅，未复用共享处理中与交互契约。
- goal: 接入 BatchActionBar，保留选择标签、权限、全量匹配零计数清除及原测试定位属性。
- non-goals: 不修改删除服务、筛选隔离模型、自定义异步任务契约，不发布或部署。
- risk: medium；orchestration: managed，主线程唯一写入者，Bohr 只读复核。
- scope: AutoTable、BatchActionBar、AutoTableInteractionsHarness、auto-table-interactions 测试及本文。

## 验收场景

- Given 显式选择，When 删除执行中，Then 共享区域标记忙碌、清除禁用、动作容器 inert。
- Given 删除失败，Then 选择保留且操作恢复；部分失败仅保留失败记录。
- Given 全量匹配模式且所有记录均排除，Then 零计数工具栏仍能清除模式。
- Given 清除选择，Then 原 data-svadmin-batch-toolbar 不再存在。
- Given 权限不足或数字主键，Then 保持原权限与主键类型契约。

## 验证

- `packages/ui/src/components/auto-table-interactions.test.svelte.ts`：47/47 通过。
- 后续补充真实 `AutoTable` 搜索变化与删除 pending 交互后：48/48 通过。
- `git diff --check`：通过。
- 额外确认：单条删除即使复用 `deleteManyMutation`，也不会显示批量工具栏；
  只有批量删除 pending 且显式选择已清空时才保留 pending 上下文。
