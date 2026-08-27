---
title: 数据 Hook
description: 基于 TanStack Query 的 CRUD Hook
---

所有数据 Hook 都基于 TanStack Query v6，支持自动缓存、后台刷新和乐观更新。

## 类型安全

所有数据 Hook 使用 `<TData extends BaseRecord>` 泛型实现类型安全的数据访问：

```typescript
import type { BaseRecord } from '@svadmin/core';

interface Post extends BaseRecord {
  id: number;
  title: string;
  status: 'draft' | 'published';
}

// TData 被推断为 Post
const query = useList<Post>({ resource: 'posts' });
```

如果注册了 [`ResourceTypeMap`](/zh-cn/guides/resource-type-registry/)，Hook 会自动推断类型并在编译时验证资源名称。

## 查询 Hook

所有查询 Hook 接受静态选项或**getter 函数**实现响应式选项：

```typescript
// 静态
useList({ resource: 'posts', filters: [{ field: 'status', operator: 'eq', value: 'published' }] });

// 响应式 getter — 当 $state 变化时自动重新请求
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

### `useShow`（useOne 的别名）

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
  defaultValue: [1, 2],       // 预选值
  searchField: 'name',        // 服务端搜索
  debounce: 300,               // 搜索防抖（毫秒）
});
// query.options → [{ label: '技术', value: '1' }, ...]
// query.onSearch → (value: string) => void
```

### `useInfiniteList`

```typescript
const query = useInfiniteList<Post>({ resource: 'posts', pageSize: 20 });
// query.fetchNextPage() — 加载下一页
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

## 变更 Hook

### `useCreate`

```typescript
const mutation = useCreate<Post>();
mutation.mutate({ resource: 'posts', variables: { title: '你好' } });
```

### `useUpdate`

```typescript
const mutation = useUpdate<Post>();
mutation.mutate({ resource: 'posts', id: 1, variables: { title: '已更新' } });
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

### 批量操作：`useCreateMany`、`useUpdateMany`、`useDeleteMany`

与单条操作相同的模式，使用数组。

### `useInvalidate`

手动刷新缓存的查询：

```typescript
const invalidate = useInvalidate();
invalidate({ resource: 'posts', invalidates: ['list', 'one'] });
```

## 变更模式

`useUpdate`、`useDelete` 和 `useDeleteMany` 通过 `mutationMode` 支持三种模式：

| 模式 | 行为 |
|------|------|
| `pessimistic` | 等待服务端响应（默认） |
| `optimistic` | 立即更新 UI，出错时回滚 |
| `undoable` | 显示撤销提示，延迟 `undoableTimeout` 毫秒后再调用服务端 |

```typescript
const mutation = useUpdate({ mutationMode: 'undoable', undoableTimeout: 5000 });
```

`useDeleteMany` 可以为单次批量操作覆盖模式、超时和通知，无需重新创建 Hook：

```typescript
const { mutation } = useDeleteMany({ resource: 'posts', mutationMode: 'pessimistic' });

mutation.mutate({
  ids: [1, 2, 3],
  mutationMode: 'undoable',
  undoableTimeout: 10_000,
  successNotification: '文章已删除',
  onCancel: () => restoreSelection(),
});
```

在 Hook 上通过 `mutationOptions` 配置 `onMutate`、`onSuccess`、`onError` 和 `onSettled` 等生命周期回调。
