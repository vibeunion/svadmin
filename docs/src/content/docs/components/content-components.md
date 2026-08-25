---
title: Content Components
description: Stripe-first page composition, metrics, toolbars, status, and data states
---

The content component family provides a stable page contract for custom admin
workflows that do not fit the default CRUD wrappers.

## Page composition

Use `ContentPageShell` as the width and spacing owner, then add a single
`ContentPageHeader` and task-based sections.

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
