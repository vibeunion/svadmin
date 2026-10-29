---
title: Data Hooks
description: TanStack Query-powered CRUD hooks
---

All data hooks are powered by TanStack Query v6 with automatic caching, background refetch, and optimistic updates.

## Type Safety

All data hooks use `<TData extends BaseRecord>` generics for type-safe data access:

```typescript
import type { BaseRecord } from '@svadmin/core';

interface Post extends BaseRecord {
  id: number;
  title: string;
  status: 'draft' | 'published';
}

// TData is inferred as Post
const query = useList<Post>({ resource: 'posts' });
```

If you register a [`ResourceTypeMap`](/guides/resource-type-registry/), hooks auto-infer types and validate resource names at compile time.

## Query Hooks

All query hooks accept either static options or a **getter function** for reactive options:

```typescript
// Static
useList({ resource: 'posts', filters: [{ field: 'status', operator: 'eq', value: 'published' }] });

// Reactive getter — re-fetches when $state changes
useList(() => ({ resource: 'posts', pagination, sorters, filters }));
```

### `useList`

```typescript
const query = useList<Post>({ resource: 'posts', pagination: { current: 1, pageSize: 10 } });
// query.data → { data: Post[], total: number }
```

### `useOne`

```typescript
const query = useOne<Post>({ resource: 'posts', id: 1 });
// query.data → { data: Post }
```

### `useShow` (alias for useOne)

```typescript
const query = useShow<Post>({ resource: 'posts', id: 1 });
```

### `useMany`

```typescript
const query = useMany<Post>({ resource: 'posts', ids: [1, 2, 3] });
// query.data → { data: Post[] }
```

### `useSelect`

```typescript
const query = useSelect({
  resource: 'categories',
  optionLabel: 'name',
  optionValue: 'id',
  defaultValue: [1, 2],       // pre-selected values
  searchField: 'name',        // server-side search
  debounce: 300,               // search debounce (ms)
});
// query.options → [{ label: 'Tech', value: '1' }, ...]
// query.onSearch → (value: string) => void
```

### `useInfiniteList`

```typescript
const query = useInfiniteList<Post>({ resource: 'posts', pageSize: 20 });
// query.fetchNextPage() — loads the next page
// query.hasNextPage — boolean
```

### `useCustom`

```typescript
const query = useCustom<{ stats: number[] }>({
  url: '/api/dashboard/stats',
  method: 'get',
});
// query.data → { data: { stats: number[] } }
```

### `useApiUrl`

```typescript
const apiUrl = useApiUrl(); // → 'https://api.example.com'
```

## Mutation Hooks

### `useCreate`

```typescript
const mutation = useCreate<Post>();
mutation.mutate({ resource: 'posts', variables: { title: 'Hello' } });
```

### `useUpdate`

```typescript
const mutation = useUpdate<Post>();
mutation.mutate({ resource: 'posts', id: 1, variables: { title: 'Updated' } });
```

### `useDelete`

```typescript
const mutation = useDelete();
mutation.mutate({ resource: 'posts', id: 1 });
```

### `useCustomMutation`

```typescript
const mutation = useCustomMutation();
mutation.mutate({ url: '/api/posts/publish', method: 'post', values: { ids: [1, 2] } });
```

### Bulk: `useCreateMany`, `useUpdateMany`, `useDeleteMany`

Same pattern with arrays of items.

### `useInvalidate`

Manually invalidate cached queries:

```typescript
const invalidate = useInvalidate();
invalidate({ resource: 'posts', invalidates: ['list', 'one'] });
```

## Delete undo mode

`useDelete` is the hook that exposes a deferred, undoable delete:

```typescript
const { mutation } = useDelete({
  resource: posts,
  id: 1,
  undoable: true,
  undoableTimeout: 5000,
});
```

The record is removed from owned list/detail caches immediately, a toast offers undo,
and the provider call is deferred for `undoableTimeout` ms. Undo restores the cache
snapshot; the server call is cancelled when it has not been dispatched.

`useUpdate` and `useDeleteMany` are pessimistic by default. Global mutation behavior
(`mutationMode`, `undoableTimeout`) is configured on the admin options and applies to
the legacy mutation path; per-hook optimistic updates should use `useQueryClient`
cache writes with `onMutate`/`onError` rollback.



## Audit hooks

```typescript
import { useLog, useLogList } from '@svadmin/core';

const log = useLog();
await log.log({ action: 'export', resource: 'orders', outcome: 'success' });

const logs = useLogList({ resource: 'orders', action: 'export' });
```

- `useLog` waits for `AuditLogProvider.create` when configured; without a provider it
  falls back to the local audit handler. Input is validated by the same audit contract.
- `useLogList` reads `AuditLogProvider.get` and keys the cache by resource, action,
  tenant, and auth session.
