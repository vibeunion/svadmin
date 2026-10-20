---
title: Content Components
description: Admin UI page composition, metrics, toolbars, status, and data states
---

The content component family provides a stable page contract for custom admin
workflows that do not fit the default CRUD wrappers.

## Page composition

Use `ContentPageShell` as the width and spacing owner, then add a single
`ContentPageHeader` and task-based sections.

Both components use a single comfortable rhythm so custom pages match built-in
page families; there is no density modifier.

The shell exposes `data-svadmin-content-page` and
`data-svadmin-content-page-width`; the header exposes
`data-svadmin-content-header` while retaining `data-svadmin-page-header` for
existing integrations.

```svelte
<ContentPageShell pageId="access-review" width="wide">
  <ContentPageHeader title="Access review" description="Review unresolved access before approval." />
  <SectionHeader id="exceptions" title="Exceptions" />
  <!-- primary work area -->
</ContentPageShell>
```

`SectionHeader` accepts `id` so its owning section can use `aria-labelledby`.

## Metrics and status

`MetricBlock` supports semantic trend meaning instead of assuming every trend is
positive:

```svelte
<MetricBlock label="Failed checks" value={3} trend="+2" trendTone="negative" />
<StatusBadge status="warning" label="Needs review" />
```

`trendTone` is `positive`, `negative`, `warning`, or `neutral`.

## Toolbars

`PageToolbar` owns the bounded toolbar surface. `FilterToolbar` owns search,
filter, and action alignment. Supply `placeholder` and `clearLabel` for localized
interfaces.

```svelte
<PageToolbar>
  {#snippet leading()}
    <FilterToolbar bind:query placeholder="Search members" clearLabel="Clear member search" />
  {/snippet}
</PageToolbar>
```

## Data panels

`DataPanel` is the titled surface that holds one data set: a table, a list, or a
form block. Reach for it instead of a hand-rolled card so panel radius, padding,
and heading rhythm stay on the shared size tokens. Use `padding="none"` when a
table or list should meet the panel edge, and `padding="compact"` for dense
sidebars.

```svelte
<DataPanel title="委托单明细" description="审核通过后自动归档">
  {#snippet actions()}
    <Button variant="outline" size="sm">导出</Button>
  {/snippet}
  <AutoTable resource="orders" />
  {#snippet footer()}<span>共 12 条</span>{/snippet}
</DataPanel>
```

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `title` / `description` | `string` | — | Heading; omitting `title` drops the header, and the panel is then unlabelled. |
| `actions` | `Snippet` | — | Header actions. |
| `children` | `Snippet` | — | Panel body. |
| `footer` | `Snippet` | — | Footer strip with a top border. |
| `padding` | `'default' \| 'compact' \| 'none'` | `'default'` | Body padding; `none` lets a table meet the panel edge. |
| `headingLevel` | `'h2' \| 'h3'` | `'h2'` | Heading level, so nesting keeps outline order. |

`PageHeader`, `FilterToolbar`, and `DataPanel` all read the size tokens
(`--svadmin-control-h`, `--svadmin-space-*`, `--svadmin-text-*`,
`--svadmin-measure`). A host that needs a taller enterprise form density
overrides `--svadmin-control-h` once; there is no per-component height override.

## Data states

Use one `DataState` location for loading, empty, recoverable error, and permission
states so the page does not jump between unrelated layouts.

```svelte
<DataState
  state="error"
  title="Unable to load members"
  description="The directory service did not respond."
  retry={reload}
  retryLabel="Try again"
  loadingLabel="Loading members"
/>
```

Use `FeedbackNotice` for unresolved partial results or blocking context. Routine
success belongs in a Toast, not a persistent success banner.

## Standard page states

Use `PagePattern` for custom business pages that are not resource CRUD routes.
It provides one stable page skeleton and a shared state contract:

```svelte
<PagePattern
  kind="list"
  title="Projects"
  state={loading ? 'loading' : error ? 'error' : rows.length === 0 ? 'empty' : 'ready'}
  retry={load}
>
  {#snippet children()}
    <NetworkTable rows={rows} columns={columns} />
  {/snippet}
</PagePattern>
```

The supported states are `ready`, `loading`, `empty`, `error`, and `forbidden`.
While a non-ready state is active, page content is not rendered as if it were
current. The shared state UI owns loading, empty, retry, and access-denied
feedback; use `stateAction` only for a specific next step such as clearing
filters. Do not create a second page shell or a second error/empty pattern.
