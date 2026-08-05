---
title: SSO Provider
description: OIDC/OAuth2 SSO authentication — Okta, Azure AD, Cognito, Keycloak, Google
---

The `@svadmin/sso` package provides an AuthProvider that implements OIDC Authorization Code Flow with PKCE — no client secret needed in the browser.

## Installation

```bash
bun add @svadmin/sso
```

## Supported Identity Providers

Any OIDC-compliant provider works out of the box:

| Provider | Issuer URL Example |
|----------|------------------|
| Okta | `https://your-tenant.okta.com` |
| Azure AD / Entra ID | `https://login.microsoftonline.com/{tenant}/v2.0` |
| Amazon Cognito | `https://cognito-idp.{region}.amazonaws.com/{userPoolId}` |
| Keycloak | `https://your-keycloak.com/realms/{realm}` |
| Google | `https://accounts.google.com` |
| Auth0 | `https://your-tenant.auth0.com` |

## Basic Usage

```typescript
import { createSSOAuthProvider } from '@svadmin/sso';
import { setAuthProvider } from '@svadmin/core';

const authProvider = createSSOAuthProvider({
  issuer: 'https://your-tenant.okta.com',
  clientId: 'your-client-id',
  redirectUri: window.location.origin + '/callback',
});

setAuthProvider(authProvider);
```

## Configuration

```typescript
interface SSOConfig {
  /** OIDC Issuer URL */
  issuer: string;
  /** OAuth2 Client ID */
  clientId: string;
  /** Redirect URI after login */
  redirectUri: string;
  /** OAuth2 scopes. Default: ['openid', 'profile', 'email'] */
  scopes?: string[];
  /** Redirect after logout */
  postLogoutRedirectUri?: string;
  /** Public RP-Initiated Logout endpoint override */
  endSessionEndpoint?: string;
  /** Token storage. Default: 'local' (localStorage) */
  storage?: 'local' | 'session' | TokenStorage;
  /** Storage namespace. Defaults to an issuer/client-specific key. */
  storageKey?: string;
  /** Explicit legacy namespace to migrate after confirming provider ownership. */
  legacyStorageKey?: string;
  /** Custom identity mapper */
  mapIdentity?: (userinfo: Record<string, unknown>) => Identity;
  /** Auto-refresh tokens. Default: true */
  autoRefresh?: boolean;
  /** Seconds before expiry to refresh. Default: 60 */
  refreshBuffer?: number;
  /** Extra authorization request params, e.g. audience or prompt */
  authorizationParams?: Record<string, string>;
  /** Atomic authentication coordination lock override for runtimes without Web Locks. */
  refreshLock?: RefreshLock;
  /** Injectable fetch implementation for tests and SSR runtimes. */
  fetcher?: typeof fetch;
  /** Trusted permission resolver for UI hints. */
  getPermissions?: (context: SSOPermissionResolverContext) => Promise<unknown> | unknown;
}
```

## Features

### PKCE Flow

All auth flows use the Authorization Code Flow with PKCE (Proof Key for Code Exchange) — the recommended approach for browser-based apps. No client secret is stored in the frontend.

### Auto Discovery

The provider automatically fetches your IdP's configuration from `/.well-known/openid-configuration`. No need to manually specify endpoints.

### Token Refresh

When `autoRefresh: true` (default), the provider schedules refresh before the access token expires. Browser refreshes and authentication commits use the atomic Web Locks API, and concurrent refresh calls in one provider share a single result. A browser without Web Locks fails refresh and token commits closed unless an atomic cross-context `refreshLock` is configured; it never falls back to a non-atomic local-storage lease. Local logout still clears the current tab.

Retryable failures such as network errors, `503`, or lock acquisition failures retain the current session for a later retry. Terminal OAuth errors such as `invalid_grant`, `refresh_token_not_found`, or refresh-token reuse clear the session and require a new login.

The default storage key is isolated by issuer and client ID. Ambiguous `svadmin_sso_*` sessions are not claimed automatically because they contain no issuer/client ownership metadata. For a verified single-provider upgrade, set `legacyStorageKey: 'svadmin_sso'`; alternatively, keep using the legacy namespace with `storageKey: 'svadmin_sso'`.

Cross-tab rotation coordination requires both Web Locks (or a custom atomic `refreshLock`) and a shared storage backend. `sessionStorage` remains tab-isolated; use the default local storage or provide a shared `TokenStorage` when tabs must converge on the same rotated session.

If local storage is unavailable, the default browser adapter falls back to `sessionStorage`; that fallback is intentionally tab-isolated.

### Custom Identity Mapping

```typescript
const authProvider = createSSOAuthProvider({
  issuer: 'https://your-tenant.okta.com',
  clientId: 'abc',
  redirectUri: '/callback',
  mapIdentity: (userinfo) => ({
    id: userinfo.sub as string,
    name: userinfo.preferred_username as string,
    avatar: userinfo.picture as string,
    email: userinfo.email as string,
  }),
});
```

### Trusted Permissions Resolver

`getPermissions()` returns `null` unless you configure a trusted resolver. Use the resolver to call your application authorization endpoint or another backend-controlled source. ID Token claims can be useful display hints, but they are not a replacement for API or database authorization.

```typescript
const authProvider = createSSOAuthProvider({
  issuer: 'https://your-tenant.okta.com',
  clientId: 'abc',
  redirectUri: '/callback',
  getPermissions: async ({ createAuthenticatedFetch }) => {
    const response = await createAuthenticatedFetch()(new URL('/api/me/permissions', window.location.origin));
    if (!response.ok) throw new Error('Failed to load permissions');
    return response.json();
  },
});
```

### Calling Protected APIs

Use `createAuthenticatedFetch()` for protected API calls. It adds the current access token, refreshes after one `401`, and safely replays the request once. A `403` is returned unchanged and does not refresh or sign out the user.

```typescript
const authProvider = createSSOAuthProvider({
  issuer: 'https://your-tenant.okta.com',
  clientId: 'abc',
  redirectUri: '/callback',
  authorizationParams: { audience: 'admin-api' },
});

const authFetch = authProvider.createAuthenticatedFetch();
const response = await authFetch('/api/reports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ range: '30d' }),
});
```

The original request must be replayable. A consumed `Request` body fails explicitly with `request_not_replayable` instead of sending a partial retry.

For non-idempotent operations, use an idempotency key accepted by the API before enabling automatic replay. A transport-level retry cannot prove whether an upstream processed a request before returning `401`.

Use `getAccessToken()` only when a library requires the raw token and owns its own retry behavior:

```typescript
const token = await authProvider.getAccessToken({ minValiditySeconds: 60 });
```

### Session Events

Subscribe to rotation and logout changes when application state must follow the auth session:

```typescript
const unsubscribe = authProvider.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') updateApiSession(session);
  if (event === 'SIGNED_OUT') clearPrivateState();
});

// Call during application teardown.
unsubscribe();
authProvider.destroy();
```

## Callback Page

Create a callback page at your `redirectUri` path:

```svelte
<!-- /callback/+page.svelte -->
<script>
  import { useIsAuthenticated } from '@svadmin/core';
  const { isLoading } = useIsAuthenticated();
</script>

{#if isLoading}
  <p>Authenticating...</p>
{/if}
```

The `check()` method automatically detects the callback URL, exchanges the authorization code for tokens, and cleans up the URL.
