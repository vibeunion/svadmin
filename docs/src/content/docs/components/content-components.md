---
title: Content Components
description: Admin UI page composition, metrics, toolbars, status, and data states
---

The content component family provides a stable page contract for custom admin
workflows that do not fit the default CRUD wrappers.

## Page composition

Use `ContentPageShell` as the width and spacing owner, then add a single
`ContentPageHeader` and task-based sections.

Both components accept `density="comfortable"` (the default) or
`density="compact"`. Keep ordinary business pages `comfortable`. Choose
`compact` only for explicitly justified specialist scanning regions after
checking readability and actionability. Keep a standalone `ContentPageHeader`
aligned with its owning page; a compact child table does not require a compact
page shell or header. This does not change existing component sizes or APIs.

The shell exposes `data-svadmin-content-page`,
`data-svadmin-content-page-width`, and `data-density`; the header exposes
`data-svadmin-content-header` while retaining `data-svadmin-page-header` for
existing integrations.

```svelte
<ContentPageShell pageId="access-review" width="wide" density="comfortable">
  <ContentPageHeader density="comfortable" title="Access review" description="Review unresolved access before approval." />
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
