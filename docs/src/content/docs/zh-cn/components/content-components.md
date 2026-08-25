---
title: 内容组件
description: Stripe-first 页面组合、指标、工具栏、状态和数据状态
---

内容组件为不适合默认 CRUD 包装器的自定义管理工作流提供稳定页面契约。

## 页面组合

使用 `ContentPageShell` 负责宽度和间距，再加入一个
`ContentPageHeader`，并按真实任务划分 Section。

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
