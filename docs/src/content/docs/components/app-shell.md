---
title: App Shell
description: Router-agnostic application shell for hosts that bring their own routing and data layer
---

`AppShellPage` owns the outermost application chrome — sidebar, topbar, primary
region, optional secondary column and footer — without importing a router,
a data provider or an auth context. The host supplies navigation as snippets and
keeps its own routing.

Use it when `AdminApp` does not fit: custom hash routers, embedded workspaces,
or apps that already own their data layer. When `AdminApp` fits, keep using it;
it composes the same tokens.

## Why it exists

Composition used to stop at the primitive layer. Hosts with their own router
could take `Input`, `Select` and `Badge`, but had to hand-write sidebar, topbar
and page chrome in bespoke CSS. That is how a host ends up with a second design
system next to svadmin's. `AppShellPage` closes that gap with presentation only:

- no `routerProvider`, no `resources`, no `dataProvider`, no auth context;
- navigation, search, account menu and page content are snippets;
- every size and color comes from a token, so hosts theme by overriding tokens.

## Usage

```svelte
<script lang="ts">
  import { AppShellPage, PagePattern } from '@svadmin/ui';
</script>

<AppShellPage width="wide" label="Primary">
  {#snippet sidebar()}
    <a href="#/orders" aria-current="page">Orders</a>
    <a href="#/reports">Reports</a>
  {/snippet}

  {#snippet topbar()}
    <input type="search" placeholder="Search" aria-label="Search" />
  {/snippet}

  {#snippet topbarEnd()}
    <button type="button">Account</button>
  {/snippet}

  <PagePattern kind="list" title="Orders" description="Review open orders">
    <!-- page body -->
  </PagePattern>
</AppShellPage>
```

## Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `children` | `Snippet` | — | Primary page content; usually `PagePattern` or `ContentPageShell`. |
| `sidebar` | `Snippet` | — | Navigation region. Omit it and the shell renders a single column. |
| `topbarStart` | `Snippet` | — | Leading topbar region (brand, breadcrumb root). |
| `topbar` | `Snippet` | — | Middle topbar region (search, context switcher). |
| `topbarEnd` | `Snippet` | — | Trailing topbar actions (notifications, account). |
| `aside` | `Snippet` | — | Optional secondary column for workspace/detail pages. |
| `footer` | `Snippet` | — | Footer strip inside the content width. |
| `width` | `'narrow' \| 'default' \| 'wide' \| 'full'` | `'default'` | Content max width. |
| `collapsed` | `boolean` | `false` | Collapses the navigation rail; the host decides what fits inside. |
| `mobileOpen` | `boolean` (bindable) | `false` | Below-breakpoint drawer state. The shell closes it on `Escape` and on scrim click. |
| `label` | `string` | localized "Main navigation" | Accessible name for the navigation landmark. |
| `skipLabel` | `string` | localized "Skip to main content" | Skip link text. |
| `contentId` | `string` | generated | `id` of the primary landmark; the skip link targets it. |
| `class` | `string` | — | Extra classes on the shell root. |

There is deliberately no density modifier. The product baseline is shared, and a
host that needs larger or tighter controls overrides the size tokens once:

```css
.fa-app-shell {
  --svadmin-control-h: 2.75rem; /* 44px comfortable enterprise forms */
  --svadmin-row-h: 2.75rem;
  --svadmin-section-gap: var(--svadmin-space-6);
}
```

## Hooks

| Hook | Owner |
| --- | --- |
| `data-slot="app-shell-topbar"` | Topbar |
| `data-slot="app-shell-sidebar"` | Navigation landmark |
| `data-slot="app-shell-body"` / `app-shell-content` | Content width owner |
| `data-slot="app-shell-aside"` | Secondary column |
| `data-slot="app-shell-footer"` | Footer |
| `data-width` | `narrow` / `default` / `wide` / `full` |
| `data-collapsed` / `data-mobile-open` | Rail and drawer state |

## Accessibility

- The skip link is the first focusable element and targets the `main` landmark.
- The navigation landmark is labelled; `Escape` closes the mobile drawer and the
  scrim is a non-focusable overlay.
- `main` is focusable through `tabindex="-1"` so the skip link can move focus,
  and it has no visible outline of its own.

## Sizing tokens

`AppShellPage` reads the size rhythm published by `@svadmin/ui/app.css`:

| Token | Default | Meaning |
| --- | --- | --- |
| `--svadmin-control-h-sm` | `1.75rem` | Compact control |
| `--svadmin-control-h` | `2.25rem` | Default control height |
| `--svadmin-control-h-lg` | `2.5rem` | Large control |
| `--svadmin-row-h` | `3rem` | Table/list row rhythm |
| `--svadmin-table-head-h` | `2.75rem` | Table header height |
| `--svadmin-table-state-min-h` | `8rem` | Table empty/loading state height |
| `--svadmin-space-1…6` | `4px … 32px` | Spacing scale |
| `--svadmin-section-gap` | `--svadmin-space-5` | Gap between page sections |
| `--svadmin-text-caption/label/body/section/title` | `12/13/14/16/20px` | Type sizes |
| `--svadmin-leading-tight/snug/body` | `1.25 / 1.35 / 1.5` | Line heights |
| `--svadmin-measure` | `65ch` | Reading measure for descriptions |
| `--svadmin-shell-sidebar-w` | `15rem` | Expanded rail width |
| `--svadmin-shell-sidebar-w-collapsed` | `3.5rem` | Collapsed rail width |
| `--svadmin-shell-topbar-h` | `3.5rem` | Topbar height |
| `--svadmin-shell-gutter` | `--svadmin-space-5` | Page gutter |
| `--svadmin-shell-max` | `74rem` | Content max width |
| `--svadmin-shell-aside-w` | `22rem` | Secondary column width |
| `--svadmin-chrome-basis` | `16rem` | Page-header flex basis before wrapping |

Each token is declared exactly once in `app.css`; a second declaration would
create a competing density baseline, and the CSS contract test fails if one
appears. Override tokens on the shell or on a nested theme root instead.

## Contract tests

- `packages/ui/src/components/app-shell-page.test.svelte.ts` — landmarks, slots,
  skip link, width/collapsed hooks, drawer behaviour.
- `packages/ui/src/size-token-css.test.ts` — no hardcoded lengths or colors,
  every `var()` resolves to a declared token, namespace-only class names, single
  token declaration, and core controls bound to `--svadmin-control-h`.
