---
title: Keycloak Provider
description: Connect Keycloak enterprise OIDC/PKCE Single Sign-On and RBAC to svadmin
---

`@svadmin/keycloak` bridges Keycloak's open-source Identity and Access Management (IAM) client into svadmin's standard `AuthProvider`.

## Installation

```bash
bun add @svadmin/keycloak keycloak-js
```

## Basic Usage

```typescript
import Keycloak from 'keycloak-js';
import { createKeycloakAuthProvider } from '@svadmin/keycloak';
import { setAuthProvider } from '@svadmin/core';

const keycloak = new Keycloak({
  url: 'https://auth.company.com',
  realm: 'enterprise-realm',
  clientId: 'svadmin-portal',
});

await keycloak.init({
  onLoad: 'check-sso',
  pkceMethod: 'S256',
});

const authProvider = createKeycloakAuthProvider(keycloak, {
  clientId: 'svadmin-portal',
  rolesSource: 'all',
  defaultRole: 'user',
  minTokenValidity: 30,
  logoutRedirectUri: window.location.origin,
});

setAuthProvider(authProvider);
```

## Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `clientId` | `string` | `undefined` | Keycloak client identifier used to extract client resource roles. |
| `rolesSource` | `'realm' \| 'resource' \| 'all'` | `'all'` | Source to extract user roles for `getPermissions()`. |
| `defaultRole` | `string` | `'user'` | Fallback role when no roles exist in token claims. |
| `minTokenValidity` | `number` | `30` | Minimum token validity in seconds before triggering silent token refresh in `check()`. |
| `loginUrl` | `string` | `undefined` | Fallback login path. |
| `logoutRedirectUri` | `string` | `window.location.origin` | Return URI after Keycloak single sign-out. |
| `onTokenRefreshFailed` | `() => void` | `undefined` | Callback fired when silent token refresh fails. |

## Features

- **Enterprise OIDC & PKCE**: Industry standard Authorization Code flow with Proof Key for Code Exchange (PKCE).
- **Silent Token Refresh**: Automatically renews access tokens via `keycloak.updateToken()` during authentication health checks.
- **Realm & Resource RBAC**: Seamlessly extracts and merges `realm_access.roles` and `resource_access[clientId].roles` into svadmin access control.
- **Single Sign-Out (SSO)**: Gracefully terminates sessions and cleans tokens on both local and Keycloak server sides.
