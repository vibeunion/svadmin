---
title: 页面模板
description: 工作台、监控、分析、列表、表单、详情、结果与个人资料页面的组合式外壳
---

页面模板是组合外壳，只负责页面宽度、标题节奏、工具栏位置、次栏和吸底操作区。
数据、权限、路由和业务操作由宿主应用提供。

所有模板都支持 `title`、`pageId` 和 `width`（`narrow`、`default`、`wide`）。
插槽使用 Svelte snippet，可以在官方组件和自定义业务内容之间自由组合。

## 模板目录

| 模板 | 使用场景 | 必填插槽 |
| --- | --- | --- |
| `WorkplaceTemplate` | 日常待办与动态 | `primary` |
| `MonitorTemplate` | 服务健康与告警 | `metrics`、`chart` |
| `AnalysisTemplate` | 筛选分析与记录 | `charts`、`records` |
| `SearchTableTemplate` | 搜索与结果表格 | `table` |
| `CardListTemplate` | 资源、项目卡片列表 | `items` |
| `GroupFormTemplate` | 分组创建/编辑表单 | `form` |
| `StepFormTemplate` | 分步流程 | `steps`，以及 `stepContent` 或 `children` |
| `AdvancedFormTemplate` | 带摘要或动态的表单 | `form` |
| `BasicDetailTemplate` | 只读记录摘要 | `details` |
| `AdvancedDetailTemplate` | 带审批和相关内容的详情 | `details` |
| `ProfileTemplate` | 身份、动态与共享内容 | `profile` |
| `ResultTemplate` | 成功、失败与状态结果 | `title` |
| `ExceptionTemplate` | 403、404、500 页面 | `status` |

## 组合示例

```svelte
<script lang="ts">
  import { WorkplaceTemplate, Statistic } from '@svadmin/ui';
</script>

{#snippet metrics()}
  <Statistic title="待处理" value={24} />
{/snippet}

{#snippet primary()}
  <!-- 表格、列表或任务内容 -->
{/snippet}

<WorkplaceTemplate
  title="工作台"
  description="今日重点与待审批事项"
  {metrics}
  {primary}
/>
```

需要共享宽度和标题契约、但不使用预设插槽时，可以直接使用
`TemplatePageShell`。

## 状态

模板不负责请求数据。加载中、空数据、筛选为空、错误和无权限状态应放在拥有
查询的插槽内部，这样重试和权限恢复始终贴近对应数据。

```svelte
{#snippet table()}
  {#if query.isLoading}
    <Skeleton />
  {:else if query.isError}
    <DataState state="error" onRetry={query.refetch} />
  {:else if rows.length === 0}
    <DataState state="empty" />
  {:else}
    <AutoTable {rows} />
  {/if}
{/snippet}
```

## 外壳集成

`AdminApp` 负责把模板放入统一外壳。导航模式、内容宽度、页面动效、密度和外观
偏好由外壳管理，页面模板不要重复实现。

示例应用提供 `/templates` 交互式页面，可以用真实内容查看全部模板。