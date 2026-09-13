---
title: Auth Hooks
description: Reactive authentication hooks
---

Auth hooks expose reactive loading state and validated provider results. Keep the
returned hook object when reading reactive properties.

## Contract and Lifecycle

Mutation inputs are required except for logout. Inputs are snapshotted; known
identity/profile fields are validated, and profile avatars may be `File` objects.
Credential field names remain provider-specific and require provider-side schemas.
Identity/check/action/error-handler replies pass runtime schema validation before
use. `redirectTo` must be an application-local `/` path, never a protocol-relative
or external URL. Omit absent optional fields instead of returning `undefined`.

Refresh clears old identity and login state immediately. Late requests cannot
publish or navigate after tenant/provider changes, logout, unmount, or a newer
request. Session revisions are isolated by provider. Hook-driven login refreshes
session queries and permission hints; logout revokes them without re-querying the
old session. Without an auth provider the application remains in explicit open mode.

Provider diagnostics are not displayed verbatim. Mutation `result.error.name`
contains a fixed code; transport/receipt failures leave server-side write outcome
unconfirmed. A notification or routing failure does not undo a confirmed action.
Query `error` exposes `AuthQueryError`. Error handling returns a discriminated
`status` and validates logout success before clearing the available cache or
navigating. These client-side checks never replace backend authentication/authorization.

## Hooks Reference

### `useLogin()`

```typescript
const login = useLogin();
await login.mutate({ email: 'admin@example.com', password: 'secret' });
// Read login.isLoading from the hook object.
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

### `usePermissions()`

`usePermissions()` is a client-side rendering helper. It can hide or disable UI, but APIs, data providers, and database policies must enforce authorization independently.

The resolver must return `null`, a non-empty-string array, or a boolean permission
map. The hook validates and freezes these hints. Convert custom role objects in
your resolver; arbitrary generics, sets, and truthy non-booleans are unsupported.
Refreshes, tenant/provider changes, and logout revoke old hints. A failed refresh
never restores stale grants. After logout, call `refetch()` only after a new
authenticated session is established outside the mutation hooks. Hook-driven
login refreshes hints automatically.

```typescript
const permissionHints = usePermissions();

// Change navigation or a disabled control from a UI hint.
if (permissionHints.has('admin')) { /* ... */ }

// Read a UI hint using the resource:action naming convention.
if (permissionHints.can('posts', 'edit')) { /* ... */ }

await permissionHints.refetch();
```

The built-in Supabase and SSO providers expose `getPermissions()`, but it returns `null` until
the application configures a trusted resolver. Resolver values are UI hints only; do not use
these browser-visible values as an API, RLS, or action authorization decision. The backend must
authenticate and authorize every request.

### `useOnError()`

```typescript
const { mutate } = useOnError();
mutate(error); // Calls authProvider.onError → may logout or redirect
```

### `useRegister()`, `useForgotPassword()`, `useUpdatePassword()`

Same mutation pattern as `useLogin()`.

Mutation auth hooks accept `successNotification` and `errorNotification`.
Disable automatic success feedback when the page renders a completed state:

```typescript
const forgot = useForgotPassword({ successNotification: false });
```
