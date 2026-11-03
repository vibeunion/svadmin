---
title: Clerk Auth Provider
description: Connect Clerk modern identity service to svadmin
---

`@svadmin/clerk` bridges Clerk user authentication into svadmin's standard `AuthProvider`.

## Installation

```bash
bun add @svadmin/clerk @clerk/clerk-js
```

## Basic Usage

```typescript
import { Clerk } from '@clerk/clerk-js';
import { createClerkAuthProvider } from '@svadmin/clerk';
import { setAuthProvider } from '@svadmin/core';

const clerk = new Clerk('pk_test_...');
await clerk.load();

const authProvider = createClerkAuthProvider(clerk, {
  signInUrl: '/login',
  rolesKey: 'role',
});

setAuthProvider(authProvider);
```
