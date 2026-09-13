---
title: Auth Provider
description: Authentication, identity management, and permissions
---

svadmin provides a complete authentication system through `AuthProvider` and 9 reactive hooks.

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

`getPermissions` is intentionally a UI hint hook. It should return permissions only when the application provides a trusted resolver; it must not replace API, backend, or database authorization.

## Auth Hooks

| Hook | Purpose |
|------|---------|
| `useLogin()` | Login mutation |
| `useLogout()` | Logout mutation |
| `useRegister()` | Registration mutation |
| `useForgotPassword()` | Password reset request |
| `useUpdatePassword()` | Password update |
| `useGetIdentity()` | Get current user info |
| `useIsAuthenticated()` | Check auth status |
| `useOnError()` | Handle API errors (401→logout) |
| `usePermissions()` | Get UI-only permission hints |

### Usage

```typescript
const login = useLogin();
await login.mutate({ email: 'user@example.com', password: 'secret' });
```

Core hooks validate plain-data inputs and provider replies at runtime. Mutation
inputs are required except for logout; profile updates also accept avatar files.
Return local `/` paths in `redirectTo`, omit absent fields, and do not rely on
raw provider error text reaching the UI. Provider-specific credential schemas and
server authorization remain the provider/backend's responsibility. See
[Auth Hooks](/hooks/auth) for error codes and lifecycle guarantees.

The built-in Supabase and SSO providers expose `getPermissions()`, but it returns `null` until
the application configures a trusted resolver. Resolver values may change labels, navigation,
or disabled controls, but browser-visible values never authorize API, RLS, or action requests;
the backend must enforce those separately.

## Auth Pages

Built-in glassmorphism auth pages included:
- `LoginPage` — Email/password login
- `RegisterPage` — User registration
- `ForgotPasswordPage` — Password reset request
- `UpdatePasswordPage` — Set new password

Routes: `/#/login`, `/#/register`, `/#/forgot-password`, `/#/update-password`

## `<Authenticated>` Component

```svelte
<Authenticated>
  {#snippet children()}<p>Protected content</p>{/snippet}
  {#snippet fallback()}<p>Please log in</p>{/snippet}
  {#snippet loading()}<p>Checking auth...</p>{/snippet}
</Authenticated>
```

## Mock AuthProvider

```typescript
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
  check: async () => ({ authenticated: !!localStorage.getItem('auth') }),
  getIdentity: async () => {
    const auth = localStorage.getItem('auth');
    return auth ? { id: '1', name: 'Admin' } : null;
  },
};
```

## Built-in Auth Providers

### Supabase

```typescript
import { Type } from '@sinclair/typebox';
import { checkExact, snapshotPlainData } from '@svadmin/core/schema';
import { createSupabaseAuthProvider } from '@svadmin/supabase';

const grantsResponse = Type.Object({
  data: Type.Array(Type.Object({ permission: Type.String() })),
  error: Type.Null(),
});

const authProvider = createSupabaseAuthProvider(supabaseClient, {
  getPermissions: async ({ client }) => {
    const response: unknown = await client
      .from('effective_permission_grants')
      .select('permission');
    const candidate = snapshotPlainData(response);
    if (!checkExact(grantsResponse, candidate)) {
      throw new Error('Permission lookup failed.');
    }
    return candidate.data.map((grant) => grant.permission);
  },
});
```

Credentials, sessions, SDK receipts, and permission results are validated before
use. A valid stored token alone does not establish identity: the adapter verifies
its user through the SDK and discards identity/permission results when the session
changes. The resolver receives a schema-derived user snapshot, not the SDK's
unchecked metadata type. Its results are UI hints, not server authorization.

The built-in pages' `username` field must match `email` when present. Registration
supports `email`, `password`, optional `username`, and optional string `name`;
arbitrary extra profile properties are no longer forwarded. Password updates
validate optional `confirmPassword` before dispatch. SDK error messages are
replaced with sanitized error codes, and sign-out success requires both a valid
receipt and confirmed empty local session state.

`@supacloud/js` does not change the auth flow. Keep using the official Supabase client with `createSupabaseAuthProvider()`, and layer any task APIs separately through [`@svadmin/supabase/supacloud`](/providers/supacloud).
Do not use user-editable metadata as an authorization fact.

### Appwrite

```typescript
import { Account, Client } from 'appwrite';
import { createAppwriteAuthProvider } from '@svadmin/appwrite';

const client = new Client().setEndpoint('https://cloud.appwrite.io/v1').setProject('PROJECT_ID');
const account = new Account(client);
const authProvider = createAppwriteAuthProvider({ account });
```

### PocketBase

```typescript
import PocketBase from 'pocketbase';
import { createPocketBaseAuthProvider } from '@svadmin/pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');
const authProvider = createPocketBaseAuthProvider({ pb });
```

PocketBase auth supports custom collection names via the `collection` param in `login()` and `register()`.
