---
title: Cerbos Access Control Provider
description: Fine-grained, cloud-native policy PDP authorization adapter
---

`@svadmin/cerbos` implements the svadmin `AccessControlProvider` contract to evaluate fine-grained permissions against a Cerbos Policy Decision Point (PDP).

## Installation

```bash
bun add @svadmin/cerbos @cerbos/http
```

## Basic Usage with Cerbos Client

```typescript
import { GRPC as Cerbos } from '@cerbos/grpc';
import { createCerbosAccessControl } from '@svadmin/cerbos';
import { setAccessControlProvider } from '@svadmin/core';

const cerbosClient = new Cerbos('localhost:3593', { tls: false });

const accessControlProvider = createCerbosAccessControl({
  client: cerbosClient,
  principal: () => ({
    id: 'user-42',
    roles: ['editor'],
    attr: {
      department: 'Marketing',
    },
  }),
});

setAccessControlProvider(accessControlProvider);
```

## Lightweight HTTP PDP Usage

If you prefer calling the Cerbos HTTP REST endpoint directly without installing client SDKs:

```typescript
import { createCerbosAccessControl } from '@svadmin/cerbos';

const accessControlProvider = createCerbosAccessControl({
  apiUrl: 'http://localhost:3592',
  token: 'optional-bearer-token',
  principal: () => ({
    id: 'user-42',
    roles: ['admin'],
  }),
});
```

## Dynamic Attribute Contexts

Pass resource-level and action parameters dynamically via `can`:

```typescript
const { can, reason } = await accessControlProvider.can({
  resource: 'expense_report',
  action: 'approve',
  id: 'exp-99',
  params: {
    amount: 1500,
    currency: 'USD',
  },
});
```
