---
title: CRUD Pages
description: Pre-built page wrappers for list, create, edit, and show
---

CRUD page wrappers compose PageHeader, Breadcrumbs, AutoTable/AutoForm, and
action buttons for zero-boilerplate admin pages. For resource-backed business
lists, `ListPage` is the standard composition boundary: do not recreate its
header, status view, filter row, or table shell around `AutoTable`.

## ListPage

```svelte
<script>
  import { ListPage } from '@svadmin/ui';
</script>

<ListPage resourceName="posts" />
```

Includes: PageHeader + Breadcrumbs + AutoTable + Create button.

### Enterprise list composition

Use the named regions in this order:

```svelte
<ListPage resourceName="users" selectable allowSelectAllMatching>
  {#snippet statusTabs()}
    <StatusTabs items={statusItems} value={status} onchange={setStatus} />
  {/snippet}

  {#snippet filterToolbar()}
    <FilterToolbar
      bind:query
      activeFilterCount={activeFilterCount}
    />
  {/snippet}

  {#snippet batchActions({ selectedIds, selection })}
    <Button onclick={() => archive(selectedIds, selection)}>批量归档</Button>
  {/snippet}
</ListPage>
```

`ListPage` owns page composition. The host owns the query, status value,
permission-aware actions, persistence, and mutation result. A batch action must
use the supplied `selection` scope and must not assume that selected IDs always
mean “all matching records”.

Pass `savedViewProvider` to `ListPage` when saved views are part of the workflow;
the view control remains inside `AutoTable`, while the search and filter controls
remain in `FilterToolbar`.

### Props

| Prop | Type | Default |
|------|------|---------|
| `resourceName` | `string` | required |
| `title` | `string?` | resource label |
| `canCreate` | `boolean?` | from resource def |
| `headerActions` | `Snippet?` | extra buttons |
| `statusTabs` | `Snippet?` | status or queue tabs above filters |
| `filterToolbar` | `Snippet?` | search, filters, and saved-view controls |
| `selectable` | `boolean?` | row selection |
| `allowSelectAllMatching` | `boolean?` | explicit cross-page selection |
| `savedViewProvider` | `SavedListViewProvider?` | team or personal saved views |
| `batchActions` | `Snippet?` | permission-aware actions for selected scope |
| `rowActions` | `Snippet?` | frequent row actions |
| `emptyState` | `Snippet?` | initial or filtered-empty content |

## CreatePage

```svelte
<CreatePage resourceName="posts" />
```

Includes: PageHeader + Breadcrumbs + AutoForm (create mode) + Back button.

Use `formActions` only for actions that belong to the current form transaction.
The callback receives the submitting state and the same submit function used by
the default form action:

```svelte
<CreatePage resourceName="posts">
  {#snippet formActions({ isLoading, onSubmit })}
    <Button disabled={isLoading} onclick={onSubmit}>保存并继续</Button>
  {/snippet}
</CreatePage>
```

The page keeps the navigation guard around the header back action and list
navigation. Form validation, mutation, dirty state, and success ownership stay
with `AutoForm` and the host mutation contract.

## EditPage

```svelte
<EditPage resourceName="posts" id={42} />
```

Includes: PageHeader + Breadcrumbs + AutoForm (edit mode) + Back button + Delete button.

`EditPage` uses the same `formActions` contract as `CreatePage`. Delete remains
a separate destructive action in the page header and must not be duplicated as
a normal form submit action.

### Props

| Prop | Type | Default |
|------|------|---------|
| `resourceName` | `string` | required |
| `id` | `string \| number` | required |
| `canDelete` | `boolean?` | from resource def |
| `formActions` | `Snippet?` | custom form transaction actions |

## ShowPage

```svelte
<ShowPage resourceName="posts" id={42} />
```

Detail view with formatted fields, edit button, and back navigation.

`ShowPage` exposes a stable content contract:

- `data-svadmin-crud-page="show"` identifies the detail page.
- `data-svadmin-detail-state` is `loading`, `forbidden`, `error`, `ready`, or
  `empty`.
- `children` renders related data, audit history, or an explicitly scoped
  extension below the primary record fields.

Related content must not replace the primary record state. When the record is
loading, forbidden, or failed, extensions stay hidden so stale related data
cannot appear current.

## Breadcrumbs

Auto-generated from current route and resource definitions:

```
Home / Posts / Edit #42
```

Supports: list, create, edit, and show routes.

## Sidebar

The `Sidebar` component provides navigation automatically generated from your resources. It supports a `routeMode` prop arraying to different routing environments:

```svelte
<Sidebar 
  {collapsed} {identity} {title} {onToggle} {onLogout} {menu}
  routeMode="auto" 
/>
```

### Route Modes

| Mode | Description |
|------|-------------|
| `auto` | (Default) Dynamically detects the environment. If `window.location.hash.startsWith('#/')` is true, falls back to `hash`, otherwise defaults to `path`. Perfect for seamless SvelteKit and SPA interoperability. |
| `path` | Uses standard filesystem `/path` routing (SvelteKit default). |
| `hash` | Uses `#` based hash routing (SPA default). |
