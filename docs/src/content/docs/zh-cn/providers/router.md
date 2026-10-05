---
title: 路由 Provider
description: 可插拔路由，支持 Hash 和 History 模式
---

svadmin 通过 `RouterProvider` 接口支持可插拔路由。

## RouterProvider 接口

```typescript
interface RouterProvider {
  go: (options: { to: string; query?: Record<string, string>; type?: 'push' | 'replace' }) => void;
  back: () => void;
  parse: () => { resource?: string; action?: string; id?: string; params: Record<string, string>; pathname: string };
}
```

## 内置 Provider

### Hash 路由（默认）

使用 URL hash（`#/posts/edit/42`）。无需任何服务器配置，开箱即用。

```svelte
<AdminApp {dataProvider} {resources} routerProvider={createHashRouterProvider()} />
```

### History 路由

使用 HTML5 pushState（`/posts/edit/42`）。需要服务端 fallback 配置。

```svelte
<AdminApp {dataProvider} {resources} routerProvider={createHistoryRouterProvider('/admin')} />
```

## 自定义路由（SvelteKit）

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

`params` 只包含 query string 参数。嵌套路由中的 parent path 参数会通过 `parentParams` 暴露，`useList` 的 parent filter 自动注入也只读取 `parentParams`。因此普通 query string（例如 `?tenantId=1`）不会被静默转换成列表过滤条件。
