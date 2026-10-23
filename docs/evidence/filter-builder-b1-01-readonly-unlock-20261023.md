# FilterBuilder B1-01 只读解锁与新建节点校验回归

## 续接约定

- parent: `enterprise-ui-acceptance-matrix-20261022.md` 的 B1-01。
- source: 用户要求只处理矩阵明确下一项：元数据迟到后宿主条件解锁，以及新建节点不得用只读标记绕过校验。
- reason: 先核对已有断言，避免重复；只补缺失的窄回归。
- scope: `FilterBuilder.svelte`、`filter-builder.test.svelte.ts` 及其直接依赖。
- non-goals: 不设计日期区间、共享视图或关系查询新 API；不改查询编译、Provider、授权或发布流程。
- risk/orchestration: medium / managed；pi 唯一 writer，主线程独立审查。

## 已有断言与缺口

- 已有：`unlocks historical filters when field metadata becomes available` 直接覆盖元数据迟到后宿主条件从只读变为可编辑，并以编辑后的值成功应用。
- 已有：`preserves a historical invalid operator as read-only instead of selecting an allowed replacement` 覆盖元数据已存在时的无效历史条件保留。
- 缺口：迟到元数据到达后仍然无效的宿主条件，是否继续保持只读并在应用时原样保留，而不是被解锁或静默丢弃。
- 缺口：新建草稿即使带有 `readonly` 标记，只要没有匹配的宿主快照，是否仍走正常校验并被拒绝。

## 本次新增窄回归

1. `keeps a historical condition read-only when late metadata still cannot validate it`
   - 初始无字段元数据，宿主条件 `views contains 10` 只读；
   - 元数据到达后仍无法通过字段/操作符校验，继续只读且无值输入控件；
   - 应用时原条件完整保留。
2. `rejects a new draft that forges readonly without a preserved host snapshot`
   - 新建草稿设置 `readonly = true`、无效值 `undefined`；
   - 无论是否传入无关宿主快照，编译均拒绝，不产生部分查询。

源码已包含对应契约（迟到元数据只解锁可校验节点；`compileFilterTree` 只接受与宿主快照完全一致的历史只读叶子），因此本次没有生产源码改动。

## 实际执行结果

从 `packages/ui` 执行：

```sh
bunx vitest run --config ./vitest.config.ts src/components/filter-builder.test.svelte.ts
```

结果：pi 自测 **50/50**，exit `0`，duration 11.35s。运行仍有既有的 `svelte2tsx/index.js.map` 缺失警告，不影响退出码。

```sh
git diff --check
```

结果：exit `0`，无空白错误。

## 边界

以上为单文件组件/单元断言，不代表真实浏览器、屏幕阅读器、真实查询 Provider、服务端权限或发布验收。主线程独立复核尚未在本文件中记录。
## 主线程独立复核

- 在 `packages/ui` 独立运行 `bunx vitest run --config ./vitest.config.ts src/components/filter-builder.test.svelte.ts`：50/50 passed、exit 0、9.95s；`git diff --check` exit 0。
- 已审查新增两条直接断言：未知字段在迟到元数据后仍无法验证时保持只读并原样应用；新草稿伪造 `readonly` 且无宿主快照时编译失败。未修改生产组件。
