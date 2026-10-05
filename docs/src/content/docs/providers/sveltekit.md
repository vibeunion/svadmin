---
title: SvelteKit Integration
description: SvelteKit RouterProvider for svadmin — file-based routing with goto and page stores
---

The `@svadmin/sveltekit` package provides a RouterProvider that integrates with SvelteKit's native routing system.

## Installation

```bash
bun add @svadmin/sveltekit
```

## Usage

```typescript
import { createSvelteKitRouterProvider } from '@svadmin/sveltekit';
import { setRouterProvider } from '@svadmin/core';

const routerProvider = createSvelteKitRouterProvider();
setRouterProvider(routerProvider);
```

## How It Works

| RouterProvider Method | SvelteKit Implementation |
|----------------------|-------------------------|
| `go({ to, type })` | `goto(url)` / `goto(url, { replace: true })` |
| `back()` | `history.back()` |
| `parse()` | Reads from `$app/state` `page` state |

### Navigation

The provider uses SvelteKit's `goto()` for navigation with full support for:
- **Push navigation** — default behavior
- **Replace navigation** — `type: 'replace'`
- **Query parameters** — automatically appended to URL

### Route Parsing

The `parse()` method reads the current route from SvelteKit's `page` store:
- `pathname` from `$page.url.pathname`
- `params` from `$page.params` + URL search params
- Falls back to `window.location` in SSR or non-SvelteKit contexts

## Full Setup Example

```svelte
<!-- +layout.svelte -->
<script>
  import { setDataProvider, setAuthProvider, setRouterProvider } from '@svadmin/core';
  import { createSvelteKitRouterProvider } from '@svadmin/sveltekit';
  import { createSimpleRestProvider } from '@svadmin/simple-rest';

  setRouterProvider(createSvelteKitRouterProvider());
  setDataProvider(createSimpleRestProvider('https://api.example.com'));
</script>

<slot />
```

## Comparison with Built-in Router Providers

| Feature | `@svadmin/sveltekit` | `createHashRouterProvider` | `createHistoryRouterProvider` |
|---------|---------------------|---------------------------|-------------------------------|
| Routing | SvelteKit file-based | Hash-based (`#/path`) | History API |
| SSR | ✅ | ❌ | ❌ |
| SEO | ✅ | ❌ | ✅ |
| SvelteKit features | ✅ Full (layouts, load, etc.) | ❌ | ❌ |
| Dependencies | `$app/navigation` | None | None |
