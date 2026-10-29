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

## 删除撤销模式

`useDelete` 提供延迟撤销的删除：

```typescript
const { mutation } = useDelete({
  resource: posts,
  id: 1,
  undoable: true,
  undoableTimeout: 5000,
});
```

记录先从当前列表/详情缓存移除并显示撤销提示，provider 调用延后 `undoableTimeout` 毫秒；
撤销会恢复缓存快照，尚未派发的请求会被取消。

`useUpdate` 与 `useDeleteMany` 默认悲观提交。全局变更行为（`mutationMode`、`undoableTimeout`）
在 admin options 上配置，作用于旧的 mutation 路径；单个 hook 的乐观更新请用
`useQueryClient` 在 `onMutate` 写缓存、`onError` 回滚。

## 审计 Hook

```typescript
import { useLog, useLogList } from '@svadmin/core';

const log = useLog();
await log.log({ action: 'export', resource: 'orders', outcome: 'success' });

const logs = useLogList({ resource: 'orders', action: 'export' });
```

- 配置 `AuditLogProvider` 时 `useLog` 会等待 `create` 回执；没有 provider 时退化为本地审计 handler，输入沿用同一审计契约校验。
- `useLogList` 读取 `AuditLogProvider.get`，缓存按资源、动作、租户和认证会话隔离。
