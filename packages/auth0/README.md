# @svadmin/auth0

Auth0 AuthProvider adapter for svadmin

## Install

```bash
bun add @svadmin/auth0
```

## Usage

```ts
import { createAuth0AuthProvider } from '@svadmin/auth0';

const authProvider = createAuth0AuthProvider(auth0Client, {
  loginUrl: '/auth/login',
});
```

Pass an initialized Auth0 SPA client. The adapter maps Auth0 login, logout, identity, and error handling to the svadmin AuthProvider contract.

Documentation: https://svadmin.nestjs.cn

License: MIT
