---
title: Auth0 Provider
description: Connect Auth0 Universal Login and RBAC to svadmin
---

`@svadmin/auth0` bridges Auth0's Single Page Application SDK into svadmin's standard `AuthProvider`.

## Installation

```bash
bun add @svadmin/auth0 @auth0/auth0-spa-js
```

## Basic Usage

```typescript
import { createAuth0Client } from '@auth0/auth0-spa-js';
import { createAuth0AuthProvider } from '@svadmin/auth0';
import { setAuthProvider } from '@svadmin/core';

const auth0Client = await createAuth0Client({
  domain: 'your-tenant.auth0.com',
  clientId: 'your-client-id',
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: 'https://api.yourdomain.com',
  },
});

const authProvider = createAuth0AuthProvider(auth0Client, {
  rolesKey: 'https://svadmin.dev/roles',
  defaultRole: 'user',
  logoutRedirectUri: window.location.origin,
});

setAuthProvider(authProvider);
```

`logoutRedirectUri` is passed to Auth0 as its external logout return URI. The svadmin auth hooks only accept internal paths such as `/login` in their `redirectTo` result, so keep `loginUrl` relative when it is used for an in-app route.

## Features

- **Universal Login**: Seamless redirect or popup authentication via Auth0.
- **Identity Mapping**: Standard `Identity` extraction including `sub`, `name`, `email`, and avatar picture.
- **RBAC & Custom Claims**: Automatic resolution of user roles and permissions from custom namespace claims.
- **Session Expiry Handling**: Intercepts 401/403 errors and handles session logout.
