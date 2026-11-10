---
title: Ably Live Provider
description: Real-time Pub/Sub event streaming through Ably Realtime channels
---

`@svadmin/ably` implements the svadmin `LiveProvider` contract to automatically invalidate and refetch TanStack Query caches whenever backend entities change across distributed clients.

## Installation

```bash
bun add @svadmin/ably ably
```

## Basic Usage

```typescript
import * as Ably from 'ably';
import { createAblyLiveProvider } from '@svadmin/ably';
import { setLiveProvider } from '@svadmin/core';

const client = new Ably.Realtime({
  key: 'YOUR_ABLY_API_KEY',
});

const liveProvider = createAblyLiveProvider(client, {
  channelPrefix: 'enterprise-app',
});

setLiveProvider(liveProvider);
```

## Channel Resolution

By default, channels are formatted as `${channelPrefix}:${resource}`. For complex multi-tenant environments, supply a custom `channelName` resolver:

```typescript
const liveProvider = createAblyLiveProvider(client, {
  channelName: (resource, liveParams) =>
    `tenant-${liveParams?.tenantId ?? 'global'}:${resource}`,
});
```

## Event Dispatching & Mapping

Incoming Ably messages map to standard `LiveEvent['type']` values:
- `create`, `created`, `insert` -> `INSERT`
- `update`, `updated`, `patch` -> `UPDATE`
- `delete`, `deleted`, `remove` -> `DELETE`

You can also broadcast real-time events to Ably channels using `liveProvider.publish`:

```typescript
liveProvider.publish?.({
  type: 'UPDATE',
  resource: 'orders',
  payload: { id: 42, status: 'shipped' },
});
```
