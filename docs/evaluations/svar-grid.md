# SVAR DataGrid 评估与可选接入

评估日期：2026-09-19。核对的上游接口：`@svar-ui/svelte-grid@2.7.3`。

## 结论与范围

采用 **可选的只读适配组件**，暂不替换 `AutoTable`、`VirtualTable` 或 `TreeTable`。SVAR 负责网格布局、本地排序过滤、虚拟滚动和树展开；资源契约、服务端请求、缓存、租户和访问检查仍由 svadmin 负责。没有增加第二套 REST 数据层。

两个组件通过已有深导出使用，不进入 UI 根 barrel：

- `@svadmin/ui/components/SvarDataGrid.svelte`：传入已授权的记录和显式列配置，可选择本地或受控服务端查询模式。
- `@svadmin/ui/components/SvarResourceTable.svelte`：读取现有 AdminContext 的资源定义，连接 `useResourceContract`、`useCan` 和 `useList`，提供分页、刷新及列排序/文本过滤。

宿主显式注入真正的 `Grid` 和 `Willow`。这是为了让未选择 SVAR 的消费者既不安装其依赖，也不加载其运行时代码；并非以占位实现代替 SVAR。实际引擎及类型在独立消费者 fixture 中验证。原有 UI 依赖和根锁文件保持不变。

## 上游核实

| 评估项 | 核实结果与本次决定 |
| --- | --- |
| 许可 | [官方入门](https://docs.svar.dev/svelte/grid/getting_started/)声明 MIT；发行包[清单](https://github.com/svar-widgets/grid/blob/main/svelte/package.json)同样标记 MIT。没有购买商业许可或引入 PRO 包。 |
| 框架与接口 | 使用 Svelte 5 组件，核对[上游声明](https://github.com/svar-widgets/grid/blob/main/svelte/types/index.d.ts)。固定消费者测试版本，升级后重跑验证。 |
| 服务端操作 | [intercept](https://docs.svar.dev/svelte/grid/api/methods/intercept/)可返回 false 取消默认动作。本次将 `sort-rows` 和 `filter-rows` 转换为 core 查询条件；不使用上游 RestDataProvider。 |
| 主题 | [主题指南](https://docs.svar.dev/svelte/grid/guides/styling/)提供 CSS 变量。变量映射位于 Theme 内部，使用 svadmin 语义 tokens，`fonts={false}` 禁止自动外部字体。 |
| 冻结列 | [公开 split API](https://docs.svar.dev/svelte/grid/api/properties/split/)只有左侧冻结。本次仅暴露 `freezeLeft`，不依赖内部 right 字段。 |
| 树 | 传入 `childrenKey` 的完整树，映射至上游 `data` 子数组并初始折叠；不实现懒加载。 |
| 性能 | 准备 20,000 行真实引擎浏览器测试，检查 DOM 行窗口而不是渲染全部记录。尚无与 TanStack 相同场景的耗时/内存对照，不宣称更快或更小。 |

## 使用

在消费应用安装明确版本，而不是给全部 UI 用户增加依赖：

```sh
bun add @svar-ui/svelte-grid@2.7.3
```

已有 `AdminContext`、资源 `contract` 和 `QueryClientProvider` 的页面中：

```svelte
<script lang="ts">
  import { Grid, Willow } from '@svar-ui/svelte-grid';
  import SvarResourceTable from '@svadmin/ui/components/SvarResourceTable.svelte';
</script>

<SvarResourceTable
  {Grid}
  Theme={Willow}
  resourceName="products"
  pageSize={25}
  freezeLeft={1}
/>
```

资源必须带真实 TypeBox `contract`，不是从可见字段推测 schema。`sortable: true` 开启该列排序；`filterable: true` 且字段类型为文本、邮件、URL 或 textarea 时开启 contains 列过滤。数值、日期及复合约束由宿主的 `filters` 传入；后端必须实现对应操作。宿主 filters 与用户列过滤使用 AND 组合。`initialSorters` 只设置挂载时的初始顺序。

不使用资源查询层的静态数据：

```svelte
<script lang="ts">
  import { Grid, Willow } from '@svar-ui/svelte-grid';
  import SvarDataGrid from '@svadmin/ui/components/SvarDataGrid.svelte';
  const items = [{ id: 1, name: 'Parent', children: [{ id: 2, name: 'Child' }] }];
  const columns = [{ key: 'name', label: 'Name', width: 240, sortable: true }];
</script>

<SvarDataGrid {Grid} Theme={Willow} {items} {columns} childrenKey="children" freezeLeft={1} />
```

本地模式仅处理已传入的数据，不能对部分服务端分页结果冒充全量查询。服务端模式必须为启用的排序/过滤提供 `onSortChange` / `onFilterChange`，并回传受控 `sorters` / `filters`。

## 数据及权限边界

所有传给引擎的记录都是独立投影，只包含声明的标量列。业务字段 `id`、`data`、`open` 与引擎配置使用不同命名空间；数字 ID 与字符串 ID 不会互相覆盖。缺失或重复 ID、循环树和读取访问器会被拒绝。复杂对象暂显示 `—`，不会隐式调用对象转换方法。默认单元格不接受 HTML 模板或执行函数。

资源组件在读取前使用 core 的访问检查；拒绝时卸载网格，不发送新的数据查询。框架管理的认证会话、租户、Provider 或访问控制变化会重建相应视图。只有 `SvarResourceTable` 接入了这些自动作用域约束；`SvarDataGrid` 的宿主必须自行提供已授权数据并更新 `scopeKey`。

宿主绕过 core API 修改内部凭据或身份时，更新非敏感的 `dataScopeKey`。该值同时进入 core 查询 meta 的 `svadminSvarScope` 字段以及网格作用域，不只是重新挂载组件。不要传 token。后端授权不可由这些前端检查替代。

## 明确未覆盖

本阶段是读取集成，不是 AutoTable 完整替代：不开放单元格编辑、行新增/删除/复制、批量选择、拖动变更、撤销重做、导出或打印。相应事件被拦截，未绑定任何写 Provider；后续编辑需专门接入记录权限、字段契约及 mutation 流程。

没有右冻结列、服务端滚动窗口/无限加载、异步树、复杂字段格式化、保存视图迁移或 AutoTable snippets 兼容。网格有固定视口和固定密度行高，不宣称任意行高支持。本次不注册 Surface catalog、不扩展 AI schema、不移除 TanStack Table，也不改 PandaCSS/Tailwind。

SSR 输出最多 20 个根节点的静态表格预览，浏览器挂载后切换为真实 Grid；这不是完整的无 JS 高级网格。Theme 字体关闭后本次补足树形开关图标，其余图标和键盘行为需要真实消费者检查。

## 可复现验证

`scripts/fixtures/svar-grid` 位于工作区之外，固定安装上游包；不是运行时模拟引擎。fixture 提供 20,000 行数据、树、真实 core 查询、权限撤销、租户和宿主作用域切换，以及亮暗主题的正常/加载/空/错误/禁用状态。

```sh
bun install --frozen-lockfile
npm install --prefix scripts/fixtures/svar-grid --ignore-scripts --no-audit --no-fund
bun run --cwd packages/ui test src/components/svar-grid-contract.test.ts
bun x --no-install svelte-check --tsgo-experimental-api --tsconfig scripts/fixtures/svar-grid/tsconfig.json --threshold error
node scripts/fixtures/svar-grid/ssr.mjs
node node_modules/vite/bin/vite.js build --config scripts/fixtures/svar-grid/vite.config.ts
bun x --no-install playwright install chromium
bun x --no-install playwright test --config scripts/fixtures/svar-grid/playwright.config.ts
```

`.github/workflows/svar-grid.yml` 将上述验证纳入 PR；归档真实浏览器截图、失败 trace、消费者产物及此次解析的 npm 锁文件。视口为 1440×1000 和 390×844。仅依赖安装本身不算验收，必须查看类型检查和浏览器结果。

初次本地验证：23 个纯契约用例以 Node 测试运行器执行通过，仅替换测试框架导入，生产代码不变；严格 helper TypeScript 检查通过。当前本地环境缺少 Bun/Svelte 依赖且无法联网，所以不能把这些结果当成真实 SVAR/Svelte 的组件、SSR、视觉或全仓验收。以对应 PR 最新提交的 CI 结果为准。
