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

## Mutation Modes

`useUpdate`, `useDelete`, and `useDeleteMany` support three modes via `mutationMode`:

| Mode | Behavior |
|------|----------|
| `pessimistic` | Wait for server response (default) |
| `optimistic` | Update UI immediately, rollback on error |
| `undoable` | Show undo toast, delay server call by `undoableTimeout` ms |

```typescript
const mutation = useUpdate({ mutationMode: 'undoable', undoableTimeout: 5000 });
```

`useDeleteMany` can override the mode, timeout, and notifications for an individual batch without creating another hook instance:

```typescript
const { mutation } = useDeleteMany({ resource: 'posts', mutationMode: 'pessimistic' });

mutation.mutate({
  ids: [1, 2, 3],
  mutationMode: 'undoable',
  undoableTimeout: 10_000,
  successNotification: 'Posts deleted',
  onCancel: () => restoreSelection(),
});
```

Use `mutationOptions` on the hook for lifecycle callbacks such as `onMutate`, `onSuccess`, `onError`, and `onSettled`.
