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
const permissionHints = usePermissions<string[]>();

// Change navigation or a disabled control from a UI hint.
if (permissionHints.has('admin')) { /* ... */ }

// Read a UI hint using the resource:action naming convention.
if (permissionHints.can('posts', 'edit')) { /* ... */ }

await permissionHints.refetch();
```

The built-in Supabase and SSO providers leave `getPermissions()` undefined. A custom
implementation can supply UI hints only; do not use these browser-visible values as an API,
RLS, or action authorization decision. The backend must authenticate and authorize every request.

### `useOnError()`

```typescript
const { mutate } = useOnError();
mutate(error); // Calls authProvider.onError → may logout or redirect
```

### `useRegister()`, `useForgotPassword()`, `useUpdatePassword()`

Same mutation pattern as `useLogin()`.
