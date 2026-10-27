# B2-06 选择范围契约（2026-10-27）

## 任务上下文

- parent：`docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` 的 B2-06 条目；
  `docs/evaluations/enterprise-ui-closeout-20261024.md` 的 B2-06 历史记录；
  `docs/evidence/enterprise-completion-boundary-20261027.md` 的 D 类边界。
- source：用户 2026-10-27 接受主线程建议并明确“继续”，批准以下选择范围决策。
- reason：此前 B2-06 的 `strict`、父值回传、父子混合值和独立权限树模型缺少产品
  契约，被记录为需产品决策。用户已给出范围选择，需要把范围固化为可审计契约，
  关闭产品决策，同时保留真实 Provider、读屏和发布等外部验收边界。
- orchestration：`documentation-only` / `low`。pi 为唯一 writer，主线程为独立
  reviewer；本轮不改生产代码、测试、fixture、依赖或编排文件。
- 状态：B2-06 选择范围**产品决策已关闭**；整体企业级验收仍为 **PARTIAL**。
  本轮未提交、未推送、未发布、未部署。

## 用户批准的范围

1. **TreeSelect 多选使用纯叶子值级联**。父项用于全选、取消全选和半选展示，
   父项值不进入 `value` 或 `onchange`；可选择叶子集合决定父项 `true` / `mixed` /
   `false` 状态。
2. **TreeSelect 单选允许父值**。默认情况下单选可提交被点击的父项值；
   `onlyLeafSelectable=true` 时父项只展开，不进入提交值。
3. **Cascader 始终使用完整路径值**。`value` 为从根到当前节点的路径数组；
   `onchange` 第一参数为路径值数组，第二参数为对应节点数组；
   `changeOnSelect=false` 时只在叶节点路径完成后提交，
   `changeOnSelect=true` 时允许提交已选择的父级路径。
4. **不新增 `strict` 模式**，不新增父子混合值模式，也不新增独立权限树模型。
   TreeSelect 通过既有 `multiple`、`onlyLeafSelectable` 和 `disabled` 表达范围；
   权限过滤继续由宿主提供的 `options` / `loadChildren` 完成。
5. **允许破坏性更新，但当前不需要**。本轮保持现有公开 API 和数据形状，不引入
   迁移、兼容层或破坏性改名。

## 使用规范

- **何时选择 TreeSelect**：需要树形层级、多选叶子级联、父项全选/取消和半选，
  或单选允许选择父项时使用 TreeSelect。多选 `value` 为可选择叶子值的数组；
  单选 `value` 为单个值。父项值仅用于交互状态，不作为多选值提交。用户交互
  不新增父值，但不保证自动清洗宿主既有父值或失效值（`setMultipleSelection`
  会保留本次未涉及的既有值）；宿主负责提供合法初值并在数据变化时自行迁移或清理。
- **何时选择 Cascader**：需要逐列下钻并提交完整路径时使用 Cascader。`value`
  固定为路径数组，即使只选择根节点也保持数组形状；不要把它当作单值或叶子值集合。
- **禁用分支**：禁用节点及其后代从级联全选、取消全选、半选和可提交叶子集合中
  排除。组件不因 `options` 变化或分支被禁用而擅自清除宿主既有的受控 `value`；
  清理或迁移既有值属于宿主职责。
- **懒加载全子树**：多选父项级联在懒加载展开完整子树后一次性提交；任一必要
  分支加载失败时不产生部分提交，保留原值并展示既有稳定错误与重试入口。
- **`onlyLeafSelectable`**：父项点击只展开子树，不提交父值。该开关不改变
  `value` 形状，也不自动把未加载节点视为叶子。
- **没有 loader 时（多选级联/`onlyLeafSelectable`）**：在多选父项级联和
  `onlyLeafSelectable` 展开路径中，节点声明 `hasChildren` 但没有 `children`
  且没有 `loadChildren` 时，不能假定它是叶子；保持不可展开或既有能力错误语义，
  不把父值当作叶子值提交。默认单选仍可直接选择该父值并提交，不请求其后代。
- **空结果**：加载返回空子节点时沿现有实现处理，本轮不新增额外提交规则，也不
  擅自改写空结果下的受控值或父项语义。
- **受控值指向未加载节点**：保留宿主传入的既有值，不因当前未加载而静默丢弃；
  是否预加载或清理由宿主决定，组件不新增自动预加载协议。

## 源码对照

- `packages/ui/src/components/TreeSelect.svelte`：`disabledValues` 沿完整数据树
  传播禁用状态；`selectableLeaves` 只收集可提交叶子；`setMultipleSelection`
  以叶子集合做全选/取消；`isNodeSelected` / `isPartiallySelected` 由叶子集合和
  未加载后代推导父项状态；`selectSubtree` 在完整子树加载成功后一次提交，失败只
  记录错误；`onlyLeafSelectable` 分支对父项只调用展开；`lacksLoadCapability`
  在无 loader 时不把声明子节点的节点当作叶子。
- `packages/ui/src/components/Cascader.svelte`：`activateOption` 始终写入完整
  路径 `nextPath`，并按 `changeOnSelect` 或叶子状态决定是否提交；
  `isOptionDisabled` 同时检查组件禁用、节点禁用和祖先禁用；
  `ensureChildren` 按完整路径隔离异步加载结果，失败不提交路径。

上述对照只确认当前公开 API 的本地行为与本次范围一致，不等同于新增实现或外部
验收。

## 验收边界

- 本次关闭的是**产品范围决策**，不是实现完成，也不是真实服务验收。
- B4-01 至 B4-04 等按需领域能力仍独立评估，不因本次决策自动进入必做范围。
- 真实 Provider/权限、读屏实机、完整 retry/empty/disabled 交叉矩阵、发布包消费、
  registry 发布、部署和在线验收仍未验收。
- 验收矩阵、收口记录和完成边界文档中的旧“产品待决策”记录保留为历史，由本契约
  覆盖其当前结论；不重写历史计数，不合并不同 runner 或不同范围的测试数字。
- 本轮只更新四份文档，未改代码、测试或依赖，未运行测试或构建，未提交、推送或部署。
