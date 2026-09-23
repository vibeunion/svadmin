# Authentication

svadmin provides a complete authentication system through `AuthProvider` and reactive hooks.

## AuthProvider Interface

```typescript
interface AuthProvider {
  login: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  logout: (params?: Record<string, unknown>) => Promise<AuthActionResult>;
  check: (params?: Record<string, unknown>) => Promise<CheckResult>;
  getIdentity: () => Promise<Identity | null>;
  // UI-only hints; API, RLS, and action handlers must authorize independently.
  getPermissions?: (params?: Record<string, unknown>) => Promise<unknown>;
  register?: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  forgotPassword?: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  updatePassword?: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  onError?: (error: unknown) => Promise<{ redirectTo?: string; logout?: boolean }>;
}
```

## Auth Hooks

All hooks are reactive and manage loading/error states automatically.

### Validated Boundaries

Mutation inputs are required except for `logout`. Hooks snapshot plain-data
inputs before calling the captured provider method. Credential field names
remain provider-specific; each provider must validate its business schema.
Identity updates validate the known string fields. Profile updates also support
an `avatar: File`; other metadata must be plain data.

Identity, check, action, and error-handler replies are validated against shared
runtime schemas. Present `undefined` fields, accessors, exotic objects, invalid
booleans, contradictory success/error states, and unknown receipt fields fail
explicitly. `redirectTo` must be an application-local path starting with `/`;
external OAuth navigation belongs inside the provider, not in the hook receipt.
Provider error messages are replaced with fixed, non-sensitive errors.

Identity/check refreshes immediately withdraw old results. Tenant/provider
changes, logout, unmount, and superseded requests prevent late publication and
navigation, including navigation waiting on a route guard. Session revisions
are isolated by auth provider. Successful session-changing mutations refresh
identity and permission hints; logout clears them without querying the old session.
The no-provider mode remains explicitly open; these hooks are not backend authorization.

Mutation failures expose a stable code through `result.error.name`, including
`INVALID_AUTH_INPUT`, `AUTH_METHOD_UNAVAILABLE`, `AUTH_REQUEST_FAILED`,
`INVALID_AUTH_RESULT`, `AUTH_REJECTED`, and `AUTH_RESULT_SUPERSEDED`. Transport or
receipt failures do not prove that a server-side write did not happen. Navigation
and notification failures do not turn a confirmed server action into a failed write.
Query errors expose `AuthQueryError.code`. `useOnError().mutate()` returns a
discriminated `status` (`handled`, `ignored`, `superseded`, or `failed`); failed
handling includes `AuthErrorHandlingError`. Error-driven logout requires a valid
successful receipt before revoking identity, clearing the available query cache,
and navigating.

### `useLogin()`

```typescript
const { mutate, isLoading } = useLogin();
await mutate({ email: 'user@example.com', password: 'secret' });
// On success: shows toast + navigates to redirectTo
// On failure: shows error toast
```

### `useLogout()`

```typescript
const { mutate, isLoading } = useLogout();
await mutate(); // Navigates to /login after logout
```

### `useRegister()`

```typescript
const { mutate, isLoading } = useRegister();
await mutate({ email: 'new@user.com', password: '123', name: 'New User' });
```

### `useForgotPassword()`

```typescript
const { mutate, isLoading } = useForgotPassword();
await mutate({ email: 'user@example.com' });
```

### `useUpdatePassword()`

```typescript
const { mutate, isLoading } = useUpdatePassword();
await mutate({ currentPassword: 'old', newPassword: 'new' });
```

### `useGetIdentity()`

```typescript
const { data, isLoading, error } = useGetIdentity();
// data: { id, name, avatar } | null
```

### `useIsAuthenticated()`

```typescript
const { isAuthenticated, isLoading } = useIsAuthenticated();
// isAuthenticated: boolean (reactive)
```

### `useOnError()`

```typescript
const { mutate } = useOnError();
// Call when a data hook returns an error
mutate(error); // Calls authProvider.onError → may redirect or logout
```

### `usePermissions()`

`usePermissions()` is a client-side rendering helper. It can hide or disable UI, but APIs, data providers, and database policies must enforce authorization independently.

The resolver must return `null`, an array of non-empty permission strings, or a
boolean permission map. Results are validated and exposed as immutable hints;
arbitrary generics, sets, nested role objects, and truthy non-booleans are rejected.
Adapt custom role models in your resolver. Refreshes and scope changes revoke old
hints immediately; failures keep them revoked. After logout, refresh explicitly
only after establishing a new authenticated session outside the mutation hooks.
Successful hook-driven login refreshes hints automatically.

```typescript
const { raw, has, can, isLoading, error } = usePermissions();
// raw: readonly string array, readonly boolean map, or null (UI hints only)
// has/can: exact client-side UI checks
```

The built-in Supabase and SSO providers expose `getPermissions()`, but it returns `null`
until the application configures a trusted resolver. Resolver values may change labels,
navigation, or disabled controls only. API, RLS, and action handlers must independently
authenticate and authorize every request.

## Auth Pages

Built-in auth pages use the shared Stripe-inspired shell and semantic tokens:

```svelte
<AdminApp {dataProvider} {authProvider} {resources} title="My App" />
<!-- Automatically shows LoginPage when not authenticated -->
<!-- Routes: /#/login, /#/register, /#/forgot-password, /#/update-password -->
```

## `<Authenticated>` Component

Guard component that conditionally renders based on auth state:

```svelte
<script>
  import { Authenticated } from '@svadmin/ui';
</script>

<Authenticated>
  {#snippet children()}<p>Protected content</p>{/snippet}
  {#snippet fallback()}<p>Please log in</p>{/snippet}
  {#snippet loading()}<p>Checking auth...</p>{/snippet}
</Authenticated>
```

## Mock AuthProvider (for development)

```typescript
import type { AuthProvider } from '@svadmin/core';

export const mockAuthProvider: AuthProvider = {
  login: async ({ email, password }) => {
    if (password === 'demo') {
      localStorage.setItem('auth', JSON.stringify({ email }));
      return { success: true, redirectTo: '/' };
    }
    return { success: false, error: { message: 'Use password "demo"' } };
  },
  logout: async () => {
    localStorage.removeItem('auth');
    return { success: true, redirectTo: '/login' };
  },
  check: async () => {
    const auth = localStorage.getItem('auth');
    return { authenticated: !!auth };
  },
  getIdentity: async () => {
    const auth = localStorage.getItem('auth');
    if (!auth) return null;
    return { id: '1', name: 'Admin' };
  },
};
```
