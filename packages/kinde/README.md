# @svadmin/kinde

Kinde AuthProvider adapter for svadmin

## Install

```bash
bun add @svadmin/kinde @kinde-oss/kinde-auth-svelte
```

## Usage

```ts
import { createKindeAuthProvider } from '@svadmin/kinde';

const authProvider = createKindeAuthProvider(kindeClient, {
  loginUrl: '/auth/kinde',
});
```

Maps Kinde authentication, identity, and permissions to the svadmin AuthProvider contract.

Documentation: https://svadmin.nestjs.cn

License: MIT
