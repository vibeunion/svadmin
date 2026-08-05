# Authentication

svadmin provides a complete authentication system through `AuthProvider` and reactive hooks.

## AuthProvider Interface

```typescript
interface AuthProvider {
  login: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  logout: (params?: Record<string, unknown>) => Promise<AuthActionResult>;
  check: (params?: Record<string, unknown>) => Promise<CheckResult>;
  getIdentity: () => Promise<Identity | null>;
  getPermissions?: (params?: Record<string, unknown>) => Promise<unknown>;
  register?: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  forgotPassword?: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  updatePassword?: (params: Record<string, unknown>) => Promise<AuthActionResult>;
  onError?: (error: unknown) => Promise<{ redirectTo?: string; logout?: boolean }>;
}
```

## Auth Hooks

All hooks are reactive and manage loading/error states automatically.

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

```typescript
const { raw, has, can, isLoading, error } = usePermissions<string[]>();
// raw: whatever trusted authProvider.getPermissions() resolver returns
// has/can: exact client-side UI checks
```

## Auth Pages

Built-in glassmorphism auth pages:

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
    return { id: '1', name: 'Admin', avatar: undefined };
  },
};
```
