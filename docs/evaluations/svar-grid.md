# SVAR DataGrid 接入、兼容层与验收

更新日期：2026-09-19。独立真实消费者固定 `@svar-ui/svelte-grid@2.7.3`、Svelte `5.56.10`，并将 `@svar-ui/lib-state` 统一为 `1.9.7`。

## 组件选择与范围

SVAR 是可选引擎，不是默认 AutoTable 的强制替换。资源契约、Provider 路由、查询缓存、认证、租户和写入校验仍由 svadmin 负责；没有接入第二套 REST 数据层。下面三个入口服务于不同迁移需求，不能把某个入口的能力自动视为另外两个入口已经具备。

| 入口 | 适用场景 | 状态与业务的所有者 |
| --- | --- | --- |
| `@svadmin/ui/components/SvarDataGrid.svelte` | 已授权数据、原生自定义单元格、本地/受控服务端查询、树和滚动窗口 | 宿主负责数据、授权及查询作用域；适配器负责引擎交互与加载隔离 |
| `@svadmin/ui/components/SvarResourceTable.svelte` | 资源级分页、窗口/无限加载、懒树、受控编辑/批量/导出 | 现有 core 资源契约及查询/mutation hooks |
| `@svadmin/ui/components/SvarAutoTable.svelte` | 迁移已有 AutoTable 页面，保留工具栏、URL、偏好和 snippets | 原有 AutoTable；SVAR 只替换非空列表的表体 |

宿主显式注入真正的 `Grid` 和 `Willow`。这些组件不进入 UI 根 barrel，未选择 SVAR 的应用不需要安装 SVAR。Surface 原生 CSS 与 UI Tailwind 产物保持各自构建边界。

## 安装与基本用法

消费应用添加依赖并提交自己的锁文件：

```json
{
  "dependencies": { "@svar-ui/svelte-grid": "2.7.3" },
  "overrides": { "@svar-ui/lib-state": "1.9.7" }
}
```

`lib-state` override 用于统一上游依赖声明，不是跳过类型检查，也不是修改上游运行时代码。真实消费者不启用 `skipLibCheck`。使用 Vite 且显式设置 `compilerOptions.types` 的应用，应保留 `vite/client` 以识别 CSS 资源导入。

```svelte
<script lang="ts">
  import '@svadmin/ui/app.css';
  import { Grid, Willow } from '@svar-ui/svelte-grid';
  import SvarResourceTable from '@svadmin/ui/components/SvarResourceTable.svelte';
</script>

<SvarResourceTable
  {Grid}
  Theme={Willow}
  resourceName="products"
  pageSize={25}
  freezeLeft={1}
  freezeRight={1}
  loadingMode="window"
/>
```

资源组件必须位于已有 `AdminContext`、`QueryClientProvider` 下，资源必须带真实 TypeBox `contract`。`sortable: true` 开启服务端排序；文本类字段的 `filterable: true` 开启列过滤。宿主 `filters` 与用户过滤组合，不把部分服务端数据误当作全量本地查询。

## 高级数据加载与冻结列

`loadingMode="page"` 为默认分页。`window` 将 Grid 的零起点、右端不含窗口映射为现有 Provider 的一基分页；请求范围有界，并验证返回条数、重复 ID 和总数。`infinite` 使用相同 core 查询追加后续页面，保留滚动位置，并提供可键盘访问的“加载更多”按钮。高级读取仍共享资源契约、租户/会话缓存和权限检查。

懒树使用分页模式，不能与 flat window/infinite 模式混用：

```svelte
<SvarResourceTable
  {Grid}
  Theme={Willow}
  resourceName="categories"
  lazyTree={{ parentField: 'parentId', rootValue: null, hasChildrenKey: 'hasChildren', maxChildren: 10000 }}
  childrenKey="children"
  freezeRight={1}
/>
```

`parentId` 必须属于资源字段。根查询添加根父级过滤，展开时按父 ID 加载所有子页；超过 `maxChildren` 会报错而不是悄悄截断分支。重复展开去重，失败可重试，过期作用域响应不得写回当前树。分页过程中总数变化会拒绝结果，但这不等于数据库快照隔离；需要强一致列表时，后端仍须提供稳定排序和相应一致性机制。

左冻结使用上游公开 `split.left`。右冻结使用两个同步的 Grid 面板，不读取或修改未公开的 `split.right`，不引入 PRO 包。面板同步垂直滚动、排序/过滤、树展开和键盘边界焦点。行高固定为 compact 32px / comfortable 44px，右侧面板在窄屏占宽最多 55%。

底层 `SvarDataGrid` 也可以直接接收 `windowSource`、`loadChildren`、`onLoadMore`。这时宿主必须自行授权数据，并在查询/身份/租户变化时改变非敏感 `scopeKey`；同一数据集的正常追加不需要更换该版本。

## 写入、选择和导出

`SvarResourceTable` 的 `editable`、`selectable`、`batchUpdate`、`batchDelete`、`exportable` 默认关闭，由可信宿主显式开启。写入限制为契约允许的字段，禁止改主键，提交走 core `useUpdate` / `useDelete`。批量操作最多 100 条，先检查所有记录权限，再分派；部分失败保留成功/失败/未执行结果，不宣称事务回滚，不自动重试失败写入。删除需要确认。

如果契约声明 `delete: Type.Object({})`，应传入 `deleteVariables={{}}`；如果没有声明删除输入 schema，则沿用该契约本身的输入要求。不能为了让按钮“能用”而绕过 core 的删除输入校验。动态页面应保持相同删除参数的对象引用稳定，避免把参数重建误当作作用域变化。

操作使用实际已加载记录的独立快照，包含懒树已加载后代及无限追加页。普通分页导出当前页；高级模式按钮明确为“导出已加载记录”，不是全量资源导出。CSV 在首次异步授权前固定内容和 ID，对后代逐记录检查，防公式注入，并在作用域变化后取消下载。数值、货币、百分比、日期、日期时间及布尔格式可由宿主选择。

`dataScopeKey` 同时进入数据查询和权限查询 meta 的 `svadminSvarScope`，不是单纯的组件 key。宿主在 core 之外改变凭据或授权环境时须更新它，但不要传入 token。服务端必须独立授权所有操作。

## AutoTable 兼容入口

```svelte
<script lang="ts">
  import '@svadmin/ui/app.css';
  import { Grid, Willow } from '@svar-ui/svelte-grid';
  import SvarAutoTable from '@svadmin/ui/components/SvarAutoTable.svelte';
</script>

<SvarAutoTable {Grid} Theme={Willow} resourceName="products" freezeRight={1}>
  {#snippet headerActions()}<button type="button">宿主操作</button>{/snippet}
  {#snippet rowActions({ record, id })}<a href={`/products/${encodeURIComponent(String(id))}`}>{String(record['name'])}</a>{/snippet}
</SvarAutoTable>
```

`SvarAutoTable` 透传 AutoTable 的公开业务参数，包括 `columns`、`defaultCellRenderer`、`rowActions`、`headerActions`、`batchActions`、`emptyState`、`expandedRowRender`、`summary`、受控 `pagination` / `sorters` 和 `deleteVariables`。排序、过滤、搜索、分页、URL 同步、列偏好、保存视图、选择、默认行操作、详情/快速编辑及 mutation 均保留在原 AutoTable，不复制另一套业务状态或偏好存储。内部 `gridBody` 是可信宿主渲染扩展，不进入 AI schema。

**兼容不表示像素布局相同：** 自定义单元格仍处于固定行高的虚拟网格内；展开详情和 summary 在网格后的原生表格区域呈现，选择全页/列重排控制位于“表格选择与列顺序”区域。空、加载、错误状态复用原 AutoTable。若页面依赖任意行高、详情紧跟每一行或原移动端卡片布局，应继续使用默认 AutoTable。这一入口仍保留 TanStack 的原有表格状态，并未宣称移除 TanStack 依赖。

需要资源窗口/懒树的页面使用 `SvarResourceTable`；`SvarAutoTable` 不会把原 AutoTable 的受控分页接口暗中改为无限加载。`SvarResourceTable.savedViews` 使用独立作用域存储，可显式导入原 AutoTable 视图；`SvarAutoTable` 直接沿用原偏好存储，无须迁移。

自定义单元格使用 SVAR 的原生 `cell` 组件和 Svelte snippet。宿主接收独立记录副本，不接收引擎 `api` / `exec`。默认单元格只接受文本/标量，不接受 AI 注入的 HTML 或可执行模板。

## AI / Surface

通过 `@svadmin/surface/svar` 导入 `createSvarSurfaceCatalog` 和 `SvarSurfaceProvider`，显式扩展目录并注入宿主引擎。目录版本追加 `+svar/v1`，新增 widget 类型是 **`data-grid`**；默认 Surface 目录不被隐式改变。

```svelte
<script lang="ts">
  import { Grid, Willow } from '@svar-ui/svelte-grid';
  import { SurfaceRenderer } from '@svadmin/surface/svelte';
  import { createSvarSurfaceCatalog, SvarSurfaceProvider } from '@svadmin/surface/svar';
  const catalog = createSvarSurfaceCatalog();
  // spec、policy、dataProvider 由宿主定义；spec.catalogVersion 应等于 catalog.version。
</script>

<SvarSurfaceProvider {Grid} Theme={Willow} scopeKey="session-revision-1">
  <SurfaceRenderer {spec} {catalog} {policy} {dataProvider} />
</SvarSurfaceProvider>
```

`data-grid` 使用已有资源数据源和字段白名单，主键也是必须授权的读取字段。JSON schema 只允许标题、列、有限格式、密度、尺寸和冻结配置，拒绝额外字段、回调、任意 URL、编辑配置及写操作。Agent prompt/提案验证器使用相同目录。**当前 AI 入口是只读 Grid，不是把宿主的全部写入、懒加载回调或 AutoTable snippets 开放给 AI。**

## 可复现验收

工作流 `.github/workflows/svar-grid.yml` 对真实消费者执行以下检查；清单描述检查范围，不代表某个尚未完成的运行已通过：

```sh
bun install --frozen-lockfile
bun run --cwd packages/ui build:styles
bun run --cwd packages/surface build
npm ci --prefix scripts/fixtures/svar-grid --ignore-scripts --no-audit --no-fund
bun run --cwd packages/ui test src/components/svar-grid
bun run --cwd packages/ui test src/components/auto-table
bun run --cwd packages/surface test src/svar-schema.test.ts
bun x --no-install svelte-check --tsgo-experimental-api --tsconfig scripts/fixtures/svar-grid/tsconfig.json --threshold error
node scripts/fixtures/svar-grid/ssr.mjs
node node_modules/vite/bin/vite.js build --config scripts/fixtures/svar-grid/vite.config.ts
bun x --no-install playwright install chromium
bun x --no-install playwright test --config scripts/fixtures/svar-grid/playwright.config.ts
```

验收覆盖：真实 20,000 行窗口渲染、低于 300 个 DOM gridcell 的指定场景、左右面板、懒树和窗口重试、资源分页适配、无限追加的选择/CSV、作用域撤权和旧响应、写入契约和部分失败、原生 snippets、AutoTable 工具栏/行操作/详情/快速编辑/URL/保存视图，以及 Surface 字段和 mutation 越权拒绝。截图覆盖 1440×900、1920×1080、390×844；状态和亮暗主题按各用例断言。

`svar-grid-verification` 产物包含实际测试源码归档、测试提交号、JSON 单测/浏览器报告、原始截图和消费者构建。GitHub `pull_request` 默认测试的是合并提交；`evidence/tested-commit.txt` 记录实际执行版本，应同时核对运行的 head SHA 和 base，而不是用旧版本通过记录替代最新结果。CI 运行状态和本次验收数目以 PR #429 的最新验证记录为准。

仓库中的旧 [svar-evidence.json](assets/svar-evidence.json) 及两张 `svar-grid-*.png` 是 `c75394f` 只读基线的历史证据（23 单测/8 浏览器用例/30 截图），不是当前高级功能或 AutoTable 兼容层的验收证据。

## 保留的边界

底层 SSR 输出最多 20 个根节点的静态文本预览，挂载后切换真实 Grid；不宣称完整 SvelteKit hydration 验收。没有同场景 TanStack 耗时、内存、包体积对照，没有完整辅助技术认证，不宣称更快、更小或全部键盘路径已认证。任意行高、拖动写入、引擎 undo/redo、打印仍未开放。默认 AutoTable、VirtualTable、TreeTable 保留，不自动全量替换业务页面；是否切换默认实现应由上述真实验收及具体页面需求决定。
