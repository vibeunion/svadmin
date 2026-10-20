---
title: 内容组件
description: Admin UI 页面组合、指标、工具栏、状态和数据状态
---

内容组件为不适合默认 CRUD 包装器的自定义管理工作流提供稳定页面契约。

## 页面组合

使用 `ContentPageShell` 负责宽度和间距，再加入一个
`ContentPageHeader`，并按真实任务划分 Section。

两个组件使用统一的舒适节奏，保证自定义页面与内置页面族一致；不再提供密度修饰符。

Shell 提供 `data-svadmin-content-page` 和
`data-svadmin-content-page-width`；Header 提供
`data-svadmin-content-header`，同时保留 `data-svadmin-page-header` 兼容现有集成。

```svelte
<ContentPageShell pageId="access-review" width="wide">
  <ContentPageHeader title="访问审查" description="批准前处理仍未解决的访问项。" />
  <SectionHeader id="exceptions" title="例外项" />
  <!-- 主工作区 -->
</ContentPageShell>
```

`SectionHeader` 支持 `id`，所属 Section 可以通过 `aria-labelledby` 引用。

## 指标与状态

`MetricBlock` 使用语义趋势，不再默认把所有趋势显示为正向：

```svelte
<MetricBlock label="失败检查" value={3} trend="+2" trendTone="negative" />
<StatusBadge status="warning" label="需要复核" />
```

`trendTone` 可取 `positive`、`negative`、`warning`、`neutral`。

## 工具栏

`PageToolbar` 负责有边界的工具栏表面，`FilterToolbar` 负责搜索、筛选和
操作对齐。中文界面应显式传入 `placeholder` 和 `clearLabel`。

```svelte
<PageToolbar>
  {#snippet leading()}
    <FilterToolbar bind:query placeholder="搜索成员" clearLabel="清除成员搜索" />
  {/snippet}
</PageToolbar>
```

## 数据面板

`DataPanel` 是承载单个数据集的带标题容器：表格、列表或表单区块。用它替代手写的
card，面板圆角、内边距和标题节奏才能共用尺寸 token。表格或列表需要贴边时用
`padding="none"`，密集侧栏用 `padding="compact"`。

```svelte
<DataPanel title="委托单明细" description="审核通过后自动归档">
  {#snippet actions()}
    <Button variant="outline" size="sm">导出</Button>
  {/snippet}
  <AutoTable resource="orders" />
  {#snippet footer()}<span>共 12 条</span>{/snippet}
</DataPanel>
```

| 属性 | 类型 | 默认值 | 用途 |
| --- | --- | --- | --- |
| `title` / `description` | `string` | — | 标题；不传 `title` 时整块头区省略，面板不再有可访问名称。 |
| `actions` | `Snippet` | — | 头区操作。 |
| `children` | `Snippet` | — | 面板主体。 |
| `footer` | `Snippet` | — | 带顶部边框的页脚区。 |
| `padding` | `'default' \| 'compact' \| 'none'` | `'default'` | 主体内边距；`none` 让表格贴住面板边缘。 |
| `headingLevel` | `'h2' \| 'h3'` | `'h2'` | 标题层级，嵌套时保持大纲顺序。 |

`PageHeader`、`FilterToolbar`、`DataPanel` 全部读取尺寸 token
（`--svadmin-control-h`、`--svadmin-space-*`、`--svadmin-text-*`、
`--svadmin-measure`）。需要更高的企业表单密度时，宿主只覆盖一次
`--svadmin-control-h`，不存在按组件的高度覆盖。

## 数据状态

加载、空、可恢复错误和权限状态应复用同一个 `DataState` 位置，避免页面在
互不相关的布局之间跳动。

```svelte
<DataState
  state="error"
  title="无法加载成员"
  description="成员目录服务没有响应。"
  retry={reload}
  retryLabel="重试"
  loadingLabel="正在加载成员"
/>
```

未解决的部分结果或阻塞上下文使用 `FeedbackNotice`。普通成功使用 Toast，
不能使用持久 success banner。

`AuditTimeline` 也遵循同一份状态合同。Provider 已明确知道时间线不可用或被筛选
为空时，传入 `state="loading"`、`state="error"`、`state="forbidden"` 或
`state="filtered-empty"`；可恢复错误同时传入 `retry`。省略 `state` 时，空的
`items` 使用初始 `empty` 状态，非空 `items` 才渲染时间线。

## 标准页面状态

对于不属于资源 CRUD 路由的业务页面，使用 `PagePattern`。它提供统一的
页面骨架和状态合同：

```svelte
<PagePattern
  kind="list"
  title="项目"
  state={loading
    ? 'loading'
    : error
      ? 'error'
      : rows.length === 0
        ? hasCriteria ? 'filtered-empty' : 'empty'
        : 'ready'}
  retry={load}
>
  {#snippet children()}
    <NetworkTable rows={rows} columns={columns} />
  {/snippet}
</PagePattern>
```

支持 `ready`、`loading`、`empty`、`filtered-empty`、`error`、
`forbidden` 六种状态。`empty` 仅表示首次加载完成但资源没有记录；
存在筛选条件且没有匹配结果时必须使用 `filtered-empty`，并通过
`stateAction` 提供清除或调整筛选的恢复路径。非 `ready` 状态下不会继续
渲染看似最新的页面内容；共享状态组件统一负责加载、空数据、重试和无权
访问反馈。不要重新创建页面壳层或另一套错误/空状态组件。
