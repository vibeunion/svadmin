# B2-06 TreeSelect/Cascader 半选与父子交叉回归

## 任务边界

- scope：`TreeSelect.svelte`、`Cascader.svelte` 的现有公开 props/事件行为，以及对应直接组件测试和本证据。
- goal：补齐当前公开 API 下的半选、父子切换、虚拟化后代、禁用节点和异步成功/失败组合证据。
- non-goals：不新增 `cascadeStrategy` 或其他策略 API，不改变父子选择语义，不改全局 Popover、Provider、样式、fixture、发布或部署。
- orchestration：managed，pi agent writer，主线程独立 reviewer；低风险本地确定性验证。

## 现有语义

- TreeSelect 多选父项按可选择叶节点级联；禁用节点及其子树不计入父项选择集合。
- 已选择部分后代时，父项公开为 `aria-checked="mixed"`；全部可选择后代选中为 `true`，全部取消为 `false`。
- TreeSelect 虚拟化只裁剪 DOM 渲染，不裁剪父项级联计算；未挂载后代仍参与选择载荷。
- `hasChildren` 懒节点展开/级联选择先等待 `loadChildren`；成功前不自动提交，失败不产生部分提交，重试成功后仍需显式选择未选子项。
- Cascader 异步路径失败时不写入受控值；重试成功后禁用子项仍不可激活，允许子项才提交完整路径。

## 新增直接场景

1. TreeSelect 多选父/子切换：初始单个子项选中，父项为 `mixed`；点击父项全选，Space 取消子项回到 `mixed`，Enter 再全选，点击父项全部清空；禁用子项不参与。
2. TreeSelect 虚拟化后代：250 个后代中先选中滚出首屏的后代，再由父项级联全选；父项仍按完整后代计算，禁用分支不被选中。
3. TreeSelect 异步组合：已有子项选中时展开懒分支，成功或失败/重试均保持父项 `mixed` 且不自动提交；加载出的子项被显式选择后才变为 `true`。
4. Cascader 异步失败/重试与禁用边界：首次加载失败保持未提交，重试后禁用子项不可提交，允许子项才提交完整路径。

## 生产判断

本轮没有发现真实生产行为缺口，也没有修改 `TreeSelect.svelte` 或 `Cascader.svelte`；缺口是上述公开行为此前没有被放在同一条直接交叉回归中。

## 验证

- `packages/ui`：`bun run test src/components/tree-select.test.svelte.ts`，TreeSelect **140/140**，exit `0`。
- `packages/ui`：`bun run test src/components/cascader.test.svelte.ts`，Cascader **44/44**，exit `0`。
- `git diff --check`：exit `0`。

## 未验证边界

- 本地测试使用受控 stub loader，不证明真实 Provider、权限/RBAC、取消协议、网络重试或服务端持久化。
- DOM `aria-*` 断言不等同真实屏幕阅读器认证；未做本轮跨浏览器矩阵。
- 不证明新的严格/非严格父子策略，因为当前公开 API 没有该策略参数，本轮不虚构产品语义。
- 未提交、未推送、未部署。
