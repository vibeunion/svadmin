# @svadmin/clerk

Clerk AuthProvider adapter for svadmin

## Install

```bash
bun add @svadmin/clerk
```

## Usage

```ts
import { createClerkAuthProvider } from '@svadmin/clerk';

const authProvider = createClerkAuthProvider(clerk, {
  signInUrl: '/auth/signin',
});
```

Pass the Clerk SPA instance. The adapter exposes Clerk sessions, identity, and sign-in/sign-out through svadmin AuthProvider.

Documentation: https://svadmin.nestjs.cn

License: MIT
