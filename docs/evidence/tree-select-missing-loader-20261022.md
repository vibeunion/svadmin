# TreeSelect 缺失加载能力反馈

## 续接约定

- parent：`tree-select-leaf-only-20261022.md`；source：用户继续完善企业级 TreeSelect 边界。
- reason：`hasChildren` 分支缺少 `children` 与 `loadChildren` 时，显式展开或
  onlyLeaf 选择此前会静默失败；级联选择还会留下永远无效的 Retry。
- goal：对缺失加载能力给出通用本地化反馈，不静默、不误当叶子提交、不提供
  无效 Retry、不泄露技术配置；能力补齐或节点变化后清理反馈，并等待用户再次
  操作才加载/提交。
- scope：只改 `packages/ui/src/components/TreeSelect.svelte`、
  `packages/ui/src/components/tree-select.test.svelte.ts`、
  `packages/core/src/i18n.svelte.ts`（仅追加 tree 中英词条）与本证据。
- risk/orchestration：medium / managed；pi 实现，主线程只读独立复核，仓库唯一
  写入者。
- non-goals：不改依赖、全局 Popover、Provider 协议、样式体系或发布流程；
  不改变 single 非 onlyLeaf 直接选择父项的现有行为；不把配置缺口父项变成叶子。

## 实现事实

- 新增 `capabilityErrors` 节点集合，复用现有 `role="alert"` 与
  `aria-describedby` 表达反馈；该分支不渲染 Retry 按钮。
- 显式展开（展开按钮、onlyLeaf 选择、搜索下 ArrowRight）遇到
  `hasChildren` 且无 `children`、无 `loadChildren` 的节点时写入反馈，停止展开
  与提交。
- 祖先级联遇到同类子节点时记录在本次尝试的祖先上，不写入 `selectionErrors`，
  因此不出现无效 Retry，也不会部分提交；用户补齐能力后再次操作才加载并提交。
- 反馈随外部替换 `options`、补充/更换 `loadChildren`、节点禁用或移除而清理；
  同一 `options` 引用中原地补齐 children（响应式数据）也会清理；仅补齐能力本身
  不会自动加载或提交。
- 祖先级联反馈按整个可交互子树重新判断：缺能力后代补齐 children 或被禁用后，
  祖先反馈自动清理；禁用子树不再继续要求加载能力。
- single 非 onlyLeaf 直接点击父项仍走原直接选择路径；禁用节点在入口处拦截，
  显式展开、ArrowRight 与展开按钮事件都先检查禁用状态，不产生反馈。

## 新增验收场景

1. 无 loader 的 `hasChildren` 父项被展开时显示通用反馈、设置
   `aria-describedby`、不显示 Retry、不提交，并保持未展开；single/multiple 各覆盖。
2. 仅展开尝试同样反馈，不依赖 onlyLeaf 选择路径。
3. 补充 loader、宿主补齐 children、替换 options、禁用、移除五类变化后反馈清理，
   且补齐能力后 loader 与 `onchange` 均未被自动调用；用户再次操作后正常加载、
   再选择叶子才提交。
4. 禁用分支不产生缺失加载能力反馈。
5. 祖先级联遇到缺能力子节点时无 Retry、不部分提交、父项不呈现选中；补充
   loader 后再次级联可加载并一次性提交完整叶子集合。
6. 同一 `options` 引用原地补齐缺能力节点的 children 后反馈清理，不自动写值或
   触发 `onchange`；用户再次操作才提交补齐的子节点。
7. 祖先级联反馈显示在祖先时，原地补齐缺能力后代的 children 或将后代禁用都会
   清理祖先反馈，且不自动提交；补齐 children 后再次点击才提交完整叶子集合。
8. 禁用节点直接点击、Enter、Space、ArrowRight、直接派发展开按钮事件，无论是否
   处于搜索状态，都不产生缺失加载能力反馈，也不提交。

## 验证记录

- 基线：`packages/ui` 执行
  `bun run test src/components/tree-select.test.svelte.ts`，**127 passed / 127**，
  退出码 0。
- 红灯：新增 5 项回归后同一命令，**3 failed / 132**，退出码 1。失败覆盖同一
  `options` 引用原地补 children、祖先反馈在后代补 children/禁用后的清理。禁用
  节点直接事件的 2 项用例在旧清理逻辑下已通过，作为回归护栏保留。
- 绿灯：同一命令，**132 passed / 132**，退出码 0。本轮新增 5 项。
- `git diff --check`：退出码 0。

## 未验证边界与风险

- 未运行全仓 suite、typecheck、build 或浏览器矩阵；本轮只有组件级测试证据。
- 未发布、未接入真实 Provider、未做真实屏幕阅读器认证。
- 级联缺能力反馈显示在本次尝试的祖先节点上，而不是未渲染的深层子节点；这是
  为了让折叠状态下也能看到反馈的有意取舍。
- 宿主原地修改同一个 `options` 数组并补齐 children 已有响应式数据路径覆盖；
  非响应式普通数组原地修改且不触发组件更新不在本轮保证内。
- 子树缺能力检查递归深度上限为 64，极深或含环的自定义数据不在本轮验证范围。
- `hasChildren: true` 且 `children: []` 仍按既有“已加载空分支”语义处理，未在
  本轮改为缺失能力。
