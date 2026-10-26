# B3-01 资源数据工作台纵向切片审计

日期：2026-10-22。基线 HEAD：`51ce56238061ede8a3ee3e882f6799a5d896440c`，
含当前未提交工作区。不是发布候选、生产环境或真实 Provider 验收。

## 1. Follow-up contract

- parent：`docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` B3-01。
- source：上一轮 `resource-workspace-audit-20261022.md` 的缺口结论，以及主线程独立复核记录。
- reason：上一轮只有列表查询/选择/列表读取权限证据，没有真实消费者内的详情与编辑入口场景；
  旧文档还把“列表刷新失败”当作应强制关闭“已授权的独立详情”的未确认产品假设。该假设不成立：
  暂时列表刷新失败不等同撤销列表读取授权，也不等同于强制关闭已授权详情。失败关闭只适用于
  列表读取权限被拒绝，或详情/编辑本身未获授权。本轮以权限边界和显式重试为准补齐窄回归。

本轮唯一 writer 为 pi；主线程独立审查验证。managed 低风险测试限定，未编辑生产组件，
未提交、推送、部署或发布。限定文件为：

- `packages/ui/src/components/resource-workspace.test.svelte.ts`
- `packages/ui/src/components/resource-workspace.test-host.svelte`
- `docs/evidence/resource-workspace-audit-20261022.md`
- `docs/evidence/batch-operation-audit-20261022.md`
- `docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` 的 B3-01/B3-04 与对应下一动作

## 2. Gherkin 验收

```gherkin
Scenario: 首次列表请求失败后显式重试并进入详情与编辑
  Given 资源工作台首次列表请求失败
  When 用户显式点击重试并成功加载记录
  Then 记录可选择
  And 用户可以从真实详情抽屉打开详情
  And 用户可以从该抽屉进入编辑导航
  And 导航传递正确的资源 ID 与查询
  And 不触发创建、更新或删除写入

Scenario: 列表可读但详情与编辑被拒绝
  Given 列表读取权限可用
  And 详情与编辑权限被拒绝
  When 用户加载列表
  Then 不暴露详情入口
  And 不暴露编辑入口
  And 不调用详情读取
  And 不调用任何写入
```

## 3. 本轮新增的窄回归

在既有真实 `ResourceOperationsPage → AutoTable` 组合上只增加两个行为用例，复用现有 host 与
真实 `RecordDetailDrawer`/`BoundRecordDetailDrawer`，未引入页面 mock：

1. 首次 `getList` 失败 → 显式 `Retry` → 记录出现并可选择 → 输入搜索 `needle`，等待
   `getList` 精确收到 `filters: [{ field: 'title', operator: 'contains', value: 'needle' }]`
   → 打开真实详情抽屉，断言 `getOne` 收到 `{ resource: 'posts', id: 7 }` → 从抽屉点击编辑，
   断言最终导航精确为 `{ to: '/posts/edit/7?q=needle', type: 'push' }`，不丢失查询参数
   → 创建/更新/删除写入均为 0。
2. 列表读取允许、`show`/`edit` 权限拒绝 → 使用可观察的 `vi.fn` 异步 `can`，等待 `show`/`edit`
   授权检查完成 → 加载列表后不存在详情/编辑按钮，且行内 `More actions` 菜单中不存在
   `Edit`/`Quick edit` `menuitem`（`Delete` 条目保留以证明菜单本身已打开）→ 没有详情
   dialog、`getOne` 未调用，创建/更新/删除写入均为 0。

host 的 `go` 参数改为 `Parameters<RouterProvider['go']>[0]`，不再隐式 `any`；同时让 host
`parse()` 按 `go` 的实际 pathname/query 更新，模拟真实 `RouterProvider` 路由回读，避免
编辑导航后仍把列表 URL 同步误写回 `/posts`。按用例启用资源 `canShow`/`canEdit`/`canDelete`；
没有 `any`、`ts-ignore` 或生产代码修改。未发现需要扩大范围的生产缺陷。

## 4. 实际运行结果与历史证据

本轮在 `packages/ui` 仅执行限定命令：

```sh
bunx vitest run --config ./vitest.config.ts src/components/resource-workspace.test.svelte.ts
```

初版结果：**34/34 passed，1 个测试文件通过，原始 exit code 0**（duration 11.61s）。
主线程随后独立复跑初版，同样 **34/34 passed、原始 exit code 0、duration 11.95s**。
本次主线程审查修正加强后，pi 再仅复跑同一文件，原始结果：**34/34 passed、1 个测试文件通过、
原始 exit code 0**（duration 16.30s），并执行 `git diff --check` 得到原始 exit code 0。
仅运行该单文件，未运行其他测试、build、typecheck 或浏览器用例；未使用 `tail` 截断退出码。
`34/34 = 既有 32 + 本轮新增 2`。随后主线程在最终加强版本后独立运行同一文件，原始结果：
**34/34 passed、原始 exit code 0、duration 14.18s**；主线程另执行 `git diff --check`，
原始 exit code 0。审查修正过程中曾出现一次中间态失败，该失败不计入最终结果，仅作为审查
修正过程保留；最终加强版由主线程独立复核通过。

历史与独立证据分开保留：

- 历史 pi 自测基线：`resource-workspace.test.svelte.ts` **32/32**、原始 exit code 0、
  duration 23.86s（上一轮记录）。
- 主线程独立基线：`resource-workspace.test.svelte.ts` **32/32**、原始 exit code 0、
  duration 17.26s。该 32 是**新增用例之前的基线复核**，不得计作新增测试后的复核。
- 初版 pi 自测：`resource-workspace.test.svelte.ts` **34/34**、原始 exit code 0、
  duration 11.61s；主线程独立复核初版 **34/34**、原始 exit code 0、duration 11.95s。
- 本次加强后 pi 自测：`resource-workspace.test.svelte.ts` **34/34**、原始 exit code 0、
  duration 16.30s；`git diff --check` 原始 exit code 0。
- 本次加强后主线程独立复核（最终加强版）：`resource-workspace.test.svelte.ts` **34/34**、
  原始 exit code 0、duration 14.18s；主线程 `git diff --check` 原始 exit code 0。
- 审查修正过程的中间态曾出现一次失败；该失败不计入最终结果，仅作为审查修正过程保留。
- 主线程独立复核：`auto-table-interactions.test.svelte.ts` **48/48**、原始 exit code 0、
  duration 15.14s。
- 主线程另执行 `git diff --check`，原始 exit code 0。

`auto-table-interactions` 的 48/48 已实际验证详情抽屉、完整详情/编辑导航和列表 query 恢复，
但它不是当前 `resource-workspace` 的真实消费者完整流程，不能替代本轮 34/34；本次加强后的
34/34 已由主线程在最终加强版本后独立复核通过（原始 exit code 0、duration 14.18s）。

## 5. 六步纵向覆盖判断

该切片由 `resource-workspace.test-host.svelte` 直接挂载真实 `ResourceOperationsPage` → `AutoTable`，
使用真实 `provideAdminContext`、`QueryClient` 和受控本地 `DataProvider`，属于当前工作区内的
真实源码消费者，不是页面 mock。

| 步骤 | 是否有直接证据 | 实际断言/说明 |
| --- | --- | --- |
| 查询 | 是 | 受控分页/排序透传到 `getList`；搜索生成精确 `filters`；切换 tenant/provider 后旧列表回执不显示；销毁后迟到结果不触发 `derived_inert`；首次失败后显式重试成功，恢复后搜索 `needle` 仍精确透传。 |
| 选择 | 是 | 当前页选择、跨页已选 ID、全部匹配 `scope: 'all'` 与排除项；搜索变化、tenant/optOut/selectable/permission 变化清除选择；批量动作收到预期 ID 或查询快照；显式重试后记录可选择。 |
| 详情 | 是（本轮新增） | 搜索恢复后打开真实 `RecordDetailDrawer`，断言资源与记录 ID 传给 `getOne`；详情读取不写数据。 |
| 编辑 | 是（本轮新增） | 从真实详情抽屉触发编辑导航，最终导航精确为 `{ to: '/posts/edit/7?q=needle', type: 'push' }`，查询未丢失；未执行写入。 |
| 失败恢复 | 是（本轮新增） | 首次列表失败 → 错误态 → 用户显式重试 → 列表恢复并可进入详情/编辑。未覆盖真实服务端错误分类与自动重试策略。 |
| 权限拒绝 | 是 | 列表读取撤销后移除缓存记录、批量动作和全选入口；本轮另覆盖列表可读但 `show`/`edit` 拒绝时，等待异步授权完成后仍不暴露详情/编辑按钮或 `More actions` 菜单项、不调用 `getOne`、不写入。 |

## 6. 明确边界与仍未证明的验收

- 本轮权限拒绝使用受控 AccessControl stub，不证明真实 Provider、服务端 RBAC、租户/字段权限。
- 本轮的“首次列表失败”是受控 `getList` rejection，不证明真实网络错误分类、自动重试或服务端幂等。
- 明确纠正旧假设：暂时列表刷新失败不得直接等同于强制关闭已授权独立详情；已授权详情是否保留
  属于产品交互选择，本轮 Gherkin 只锁定权限边界与显式重试路径。
- 未证明真实浏览器键盘路径、屏幕阅读器、发布包、消费者生产构建和部署授权。
- `auto-table-interactions` 48/48 是独立组件交互证据，不与本轮 `resource-workspace` 34/34 合并计数。

## 7. 上一轮状态（34/34 切片）

保留初版结果：pi 自测 **34/34、原始 exit code 0、duration 11.61s**，主线程独立复核初版
**34/34、原始 exit code 0、duration 11.95s**。本次主线程审查修正加强后，pi 自测
**34/34、原始 exit code 0、duration 16.30s**，`git diff --check` 原始 exit code 0；
主线程随后在最终加强版本后独立复核 **34/34、原始 exit code 0、duration 14.18s**，
并确认 `git diff --check` 原始 exit code 0。审查修正过程中曾出现一次中间态失败，该失败不计
最终结果，仅作为审查修正过程保留；最终加强版通过。历史 pi 32/32 与主线程 32/32 分开保留，
后者不计作新增后复核。主线程另已独立验证 `auto-table-interactions` 48/48（duration 15.14s）
与 `git diff --check` exit 0。
B3-01 仍为“局部证据不足；需外部验收”，不得据本轮结果宣布资源数据工作台成品闭环完成。
本轮仅验证详情抽屉打开与编辑导航参数，不构成编辑提交闭环；真实 Provider/RBAC、编辑提交、
浏览器/读屏、发布等外部边界仍未验收。
本节仅保留上一轮 34/34 切片状态；编辑提交闭环续轮状态见第 8.5 节。

## 8. 编辑提交闭环 follow-up（续轮）

### 8.1 Follow-up contract

- parent：`docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` B3-01。
- source：上一节明确保留的缺口“编辑导航不等于编辑提交闭环”，以及
  `pm-workflows.test.svelte.ts` 已有组件级失败草稿/重试用例（历史 95/116/130 行范围）。
- reason：上一轮只在真实 `ResourceOperationsPage → AutoTable` 上验证了详情打开和编辑导航；
  尚未验证用户从真实行操作打开 `QuickEditDrawer` 后，提交失败保留草稿、显式重试成功关闭抽屉、
  列表刷新为服务端值，且搜索、分页和选择不被编辑提交重置。
- 本轮唯一 writer 为 pi，主线程独立审查。scope 冻结为：
  `packages/ui/src/components/resource-workspace.test.svelte.ts`、
  `packages/ui/src/components/resource-workspace.test-host.svelte`、本证据文件与矩阵 B3-01。
  未修改生产组件；未提交、推送、部署或发布。host 本轮无需改动。

### 8.2 Gherkin 验收

```gherkin
Scenario: 快速编辑提交失败保留草稿并在显式重试成功后刷新列表
  Given 用户在真实资源工作台的第 2 页以搜索条件筛选并选中一条记录
  When 用户从该行打开快速编辑并保存一个服务端会拒绝的值
  Then 抽屉保持打开且草稿值不丢失
  And update 精确收到资源 posts、记录 ID 2 和提交的 title 值
  When 用户显式再次保存且服务端接受
  Then 抽屉关闭
  And 列表刷新为服务端返回值
  And 搜索值、第 2 页分页和该行选择保持不变
  And update 恰好调用 2 次且两次载荷一致
  And 不触发创建或删除写入
```

### 8.3 本轮新增的窄回归与运行结果

在既有真实 `ResourceOperationsPage → AutoTable` 组合上只新增 1 个用例，复用真实
`QuickEditDrawer → AutoForm → useForm` 和受控本地 `DataProvider`，未新造提交 UI。用例流程：

1. 受控 Provider 第 2 页初始返回含筛选词的 `needle initial title`；输入搜索 `needle` 并等待 `getList` 精确收到
   `contains/title/needle`，再恢复受控第 2 页并确认搜索与分页同时透传。
2. 选中该行，从真实 `More actions` 菜单打开 `Quick edit`，在 `Edit posts` 抽屉把 `Title`
   改为草稿 `needle draft title`；记录保存前 `getList` 调用数并清空 `onNavigate`。
3. 首次保存由 `update` 拒绝；断言抽屉仍在、`Title` 草稿仍为 `needle draft title`、列表仍为初始
   `needle initial title`，且 `update` 第 1 次精确收到
   `{ resource: 'posts', id: 2, variables: { title: 'needle draft title' }, meta: { tenantId: 'first' } }`。
4. 用户显式再次保存；`update` 第 2 次收到同一草稿载荷并被接受，Provider 返回与草稿不同的规范化值
   `needle normalized title`。抽屉关闭，列表显示服务端规范化值而非草稿值；`getList` 调用数增加，
   刷新后的 `getList` 仍带 `needle` 筛选和第 2 页分页；搜索框保留。
5. 保存结束后重新查询当前 `Select record 2` 复选框并断言为选中，再通过真实 `Process selection`
   验证 `onBatch` 为 `[2]`；断言保存期间无导航，`update` 恰好 2 次，创建与删除写入为 0。

本轮在 `packages/ui` 仅执行限定命令：

```sh
bunx vitest run --config ./vitest.config.ts src/components/resource-workspace.test.svelte.ts
```

本版（主线程补强审查后）pi 自测原始结果：**35/35 passed、1 个测试文件通过、原始 exit code 0、
duration 12.90s**。随后执行 `git diff --check`，原始 exit code 0。本版主线程随后独立复核
**35/35 passed、原始 exit code 0、duration 13.50s**，并执行 `git diff --check` 得到原始
exit code 0。本版主线程复核已完成，原“待执行”表述改为已复核；仍有下列外部/范围边界未验收。
仅运行该单文件，未运行其他测试、build、typecheck 或浏览器用例；未使用 `tail` 截断退出码。
`35 = 历史 34 + 本轮新增 1`。历史 34/34 仍是上一轮基线，单独保留，不与本版 35/35 合并或覆盖；
本轮新增前未再运行 34。

**初版记录（仅保留）**：初版 pi 自测 **35/35、原始 exit code 0、duration 28.40s**；主线程
在同一初版最终版本上独立复核 **35/35、原始 exit code 0、duration 13.42s**，`git diff --check`
原始 exit code 0。两次独立运行分别记录、不合并。该初版未验证服务端规范化值、刷新调用增量和
保存后重新查询当前选择，已由本版补强。

旧版调试过程曾出现两次中间态失败，均只来自新用例断言/期望，不计入最终结果：
搜索会把受控分页重置为第 1 页，故用例在搜索后显式恢复第 2 页；`update` 实际还携带
`meta: { tenantId: 'first' }`，故精确载荷断言补上该字段。未据此认定生产缺陷。

### 8.4 边界

本轮证明了真实消费者内快速编辑的失败保留草稿、显式重试成功、刷新服务端规范化值、刷新调用
增加、保存后选择仍可参与真实批量动作、搜索/分页保持且无导航，但不证明真实 Provider/RBAC、
服务端持久化、网络错误分类、幂等、真实浏览器/读屏或发布。
它也不覆盖独立“编辑完整路由页面”；本段形成时该页面仍未验收，后续已由
`resource-workspace-browser-20261022.md` 第 6 节的 Chromium desktop **1/1**
受控闭环及主线程独立复核补齐。该补充仍不证明真实 Provider/RBAC、持久化、读屏或发布，
不得用全部受控证据外推为 B3-01 全量闭环。
真实服务、浏览器/读屏等未验收边界继续保留；完整编辑路由的本地 Playwright 验证已在后续证据
中独立完成，不归类为“必须等待外部环境”的阻塞项，也未被本轮 35/35 计数。

### 8.5 状态

本版（主线程补强审查后）pi 自测 **35/35、原始 exit code 0、duration 12.90s**，`git diff --check`
原始 exit code 0；本版主线程已独立复核 **35/35、原始 exit code 0、duration 13.50s**，
`git diff --check` 原始 exit code 0。初版记录单独保留：pi 自测 **35/35、原始 exit code 0、
duration 28.40s**，主线程初版独立复核 **35/35、原始 exit code 0、duration 13.42s**，两者为两次
独立运行，不合并；历史 34/34 基线亦单独保留。调试中的中间态失败不计入最终结果，仅作为过程
记录。真实 Provider/RBAC、服务端持久化、浏览器/读屏与发布仍未验收；完整编辑路由已由后续
Chromium desktop 1/1 受控证据补齐，但不改变本轮 35/35 的计数。B3-01 仍为局部证据不足、
需外部验收。
## B3-04 当前页批量执行补测（2026-10-23）

- pi 新增真实 `ResourceOperationsPage -> AutoTable` 消费者用例，主线程独立复核 `resource-workspace.test.svelte.ts`：36/36 passed、exit 0、11.46s，`git diff --check` exit 0。
- 用例只验证当前页选择载荷：第一页全选并执行为 `[1]`，翻到未选择的第二页再次执行不加入第二页记录，`currentPageIds` 为空。未修改生产代码。
- 该结果不证明服务端批量写入、事务、幂等、取消、RBAC 或跨页全量删除。
