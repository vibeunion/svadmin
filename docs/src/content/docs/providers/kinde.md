---
title: Kinde Provider
description: Connect Kinde modern cloud identity and authentication to svadmin
---

`@svadmin/kinde` bridges the Kinde Auth SDK into svadmin's standard `AuthProvider`.

## Installation

```bash
bun add @svadmin/kinde @kinde-oss/kinde-auth-pkce-js
```

## Basic Usage

```typescript
import createKindeClient from '@kinde-oss/kinde-auth-pkce-js';
import { createKindeAuthProvider } from '@svadmin/kinde';
import { setAuthProvider } from '@svadmin/core';

const kinde = await createKindeClient({
  client_id: 'your-kinde-client-id',
  domain: 'https://your-domain.kinde.com',
  redirect_uri: window.location.origin,
  logout_redirect_uri: window.location.origin,
});

const authProvider = createKindeAuthProvider({
  client: kinde,
  loginRedirectUri: window.location.origin,
  logoutRedirectUri: window.location.origin,
});

setAuthProvider(authProvider);
```

## Features

- **Modern Cloud Auth**: Supports social logins, enterprise SSO, and passwordless authentication via Kinde.
- **Identity & Profiles**: Automatic mapping of user profiles (`id`, `name`, `email`, `picture`).
- **Permissions & Feature Flags**: Built-in `getPermissions()` resolution from Kinde tokens.
- **Session Management**: Full lifecycle management with standard svadmin authentication hooks.
