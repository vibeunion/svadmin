---
title: Router Provider
description: Pluggable routing with hash and history support
---

svadmin supports pluggable routing through the `RouterProvider` interface.

## RouterProvider Interface

```typescript
interface RouterProvider {
  go: (options: { to: string; query?: Record<string, string>; type?: 'push' | 'replace' }) => void;
  back: () => void;
  parse: () => { resource?: string; action?: string; id?: string; params: Record<string, string>; pathname: string };
}
```

## Built-in Providers

### Hash Router (default)

Uses URL hash (`#/posts/edit/42`). Works everywhere, no server config needed.

```svelte
<AdminApp {dataProvider} {resources} routerProvider={createHashRouterProvider()} />
```

### History Router

Uses HTML5 pushState (`/posts/edit/42`). Requires server-side fallback.

```svelte
<AdminApp {dataProvider} {resources} routerProvider={createHistoryRouterProvider('/admin')} />
```

## Custom Router (SvelteKit)

```typescript
import { goto } from '$app/navigation';

export const svelteKitRouter: RouterProvider = {
  go({ to, query, type }) {
    const url = new URL(to, window.location.origin);
    if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
    goto(url.pathname + url.search, { replace: type === 'replace' });
  },
  back: () => history.back(),
  parse: () => {
    const url = new URL(window.location.href);
    const segments = url.pathname.split('/').filter(Boolean);
    const params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { params[k] = v; });
    return { resource: segments[0], action: segments[1], id: segments[2], params, pathname: url.pathname };
  },
};
```

## `useParsed` Hook

```typescript
const { resource, action, id, params, parentParams } = useParsed();
// /#/posts/edit/42?tab=details
// -> { resource: 'posts', action: 'edit', id: '42', params: { tab: 'details' }, parentParams: {} }

// /#/teams/123/users?tenantId=1
// -> { resource: 'users', action: 'list', params: { tenantId: '1' }, parentParams: { teamId: '123' } }
```

`params` only contains query string values. Nested route parameters are exposed through `parentParams`, and `useList` only uses `parentParams` for automatic parent filters. This means a regular query string such as `?tenantId=1` will not be silently converted into a list filter.
