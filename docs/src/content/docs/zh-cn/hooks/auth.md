---
title: 认证 Hook
description: 响应式认证 Hook
---

所有认证 Hook 使用 TanStack Query 变更/查询实现自动加载状态和错误处理。

## Hook 参考

### `useLogin()`

```typescript
const { mutate, isPending } = useLogin();
mutate({ email: 'admin@example.com', password: 'secret' });
```

### `useLogout()`

```typescript
const { mutate } = useLogout();
mutate(); // 重定向到 /login
```

### `useGetIdentity()`

```typescript
const query = useGetIdentity();
// query.data → { id: '1', name: '管理员', avatar: '...' } | null
```

### `useIsAuthenticated()`

```typescript
const { isAuthenticated, isLoading } = useIsAuthenticated();
```

### `usePermissions<T>()`

`usePermissions()` 只是客户端渲染辅助。它可以隐藏或禁用 UI，但 API、DataProvider 和数据库策略必须独立执行授权。

```typescript
const permissionHints = usePermissions<string[]>();

// 使用 UI 提示调整导航或禁用控件。
if (permissionHints.has('admin')) { /* ... */ }

// 使用 resource:action 命名读取 UI 提示。
if (permissionHints.can('posts', 'edit')) { /* ... */ }

await permissionHints.refetch();
```

内置 Supabase 与 SSO Provider 会提供 `getPermissions()`，但在应用配置可信 resolver 前返回
`null`。resolver 的返回值只能作为 UI 提示，绝不能将浏览器中的值作为 API、RLS 或动作授权
决定；后端必须认证并授权每一个请求。

### `useOnError()`

```typescript
const { mutate } = useOnError();
mutate(error); // 调用 authProvider.onError → 可能登出或重定向
```

### `useRegister()`、`useForgotPassword()`、`useUpdatePassword()`

与 `useLogin()` 相同的变更模式。
