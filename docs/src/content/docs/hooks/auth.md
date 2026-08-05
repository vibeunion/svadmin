---
title: Auth Hooks
description: Reactive authentication hooks
---

All auth hooks use TanStack Query mutations/queries for automatic loading states and error handling.

## Hooks Reference

### `useLogin()`

```typescript
const { mutate, isPending } = useLogin();
mutate({ email: 'admin@example.com', password: 'secret' });
```

### `useLogout()`

```typescript
const { mutate } = useLogout();
mutate(); // Redirects to /login
```

### `useGetIdentity()`

```typescript
const query = useGetIdentity();
// query.data → { id: '1', name: 'Admin', avatar: '...' } | null
```

### `useIsAuthenticated()`

```typescript
const { isAuthenticated, isLoading } = useIsAuthenticated();
```

### `usePermissions<T>()`

`usePermissions()` is a client-side rendering helper. It can hide or disable UI, but APIs, data providers, and database policies must enforce authorization independently.

```typescript
const { raw, has, can, isLoading, refetch } = usePermissions<string[]>();

// Check specific permission
if (has('admin')) { /* ... */ }

// Check resource:action permission
if (can('posts', 'edit')) { /* ... */ }

// Session-level refresh (e.g. after role upgrade)
await refetch();
```

### `useOnError()`

```typescript
const { mutate } = useOnError();
mutate(error); // Calls authProvider.onError → may logout or redirect
```

### `useRegister()`, `useForgotPassword()`, `useUpdatePassword()`

Same mutation pattern as `useLogin()`.
