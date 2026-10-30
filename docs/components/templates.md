---
title: Page Templates
description: Composable page shells for workplace, monitor, analysis, list, form, detail, result and profile routes
---

Page templates are composition shells. They own page width, header rhythm,
toolbar placement, secondary columns and sticky action footers, while the host
application supplies data, permissions and navigation.

All templates accept `title`, `pageId` and `width` (`narrow`, `default`, `wide`).
Slots are Svelte snippets, so pages can mix first-party components with custom
business content.

## Template catalog

| Template | Use for | Required slots |
| --- | --- | --- |
| `WorkplaceTemplate` | Daily priorities and activity | `primary` |
| `MonitorTemplate` | Service health and incidents | `metrics`, `chart` |
| `AnalysisTemplate` | Filtered analysis and records | `charts`, `records` |
| `MultiDimensionAnalysisTemplate` | Dimension switching, comparison and insights | `chart` |
| `SearchTableTemplate` | Search and result tables | `table` |
| `CardListTemplate` | Resource and project galleries | `items` |
| `GroupFormTemplate` | Grouped create/edit forms | `form` |
| `StepFormTemplate` | Multi-step workflows | `steps`, `stepContent` or `children` |
| `AdvancedFormTemplate` | Form with summary or activity | `form` |
| `BasicDetailTemplate` | Read-only record summary | `details` |
| `AdvancedDetailTemplate` | Detail with approvals and related work | `details` |
| `ProfileTemplate` | Identity, activity and shared work | `profile` |
| `UserInfoTemplate` | Arco Pro user center | `header` or `projects` |
| `UserSettingsTemplate` | Tabbed basic, security and verification settings | `basic`, `security`, `verification` |
| `ResultTemplate` | Success, failure and status results | `title` |
| `ExceptionTemplate` | 403, 404 and 500 routes | `status` |


## Arco Pro depth slots

The route catalog above covers Arco Pro page families. The following optional
slots close the composition-depth gap without forcing one mock layout:

| Template | Optional Arco Pro sections |
| --- | --- |
| `WorkplaceTemplate` | `secondary`, `contentPercentage`, `media`, `shortcuts`, `announcements`, `docs` |
| `MonitorTemplate` | `chat`, `activity`, `status`, `quickOperations`, `information` |
| `SearchTableTemplate` | `filters`, `bulkActions`, `pagination`, `footer` |
| `CardListTemplate` | `tabs`, `filters`, `addCard` |
| `BasicDetailTemplate` | `steps`, `summary`, `comparison`, `history` |

The host still owns the associated queries, permissions, mutations and
telemetry. The slots only define where those sections render.

## Composition example

```svelte
<script lang="ts">
  import { WorkplaceTemplate, Statistic } from '@svadmin/ui';
</script>

{#snippet metrics()}
  <Statistic title="Open work" value={24} />
{/snippet}

{#snippet primary()}
  <!-- table, list or task content -->
{/snippet}

<WorkplaceTemplate
  title="Workplace"
  description="Today's priorities and pending approvals"
  {metrics}
  {primary}
/>
```

Use `TemplatePageShell` directly when a page needs the shared width and header
contract but none of the predefined slots.

## States

Templates do not fetch data. Render loading, empty, filtered-empty, error and
forbidden states inside the slot that owns the query. This keeps retries and
permission recovery next to the data they affect.

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

## Shell integration

`AdminApp` renders templates inside the shared shell. The shell owns navigation
mode, content width, page transition, density and appearance preferences; page
templates must not re-implement those behaviors.

The example application exposes an interactive gallery at `/templates` and direct routes such as `/templates/workplace`. The gallery is structure evidence, not a data-provider acceptance test.