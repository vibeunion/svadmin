---
title: Pusher Live Provider
description: Real-time live event streaming with Pusher Channels
---

`@svadmin/pusher` implements the svadmin `LiveProvider` contract to automatically invalidate and refetch TanStack Query caches when backend records change.

## Installation

```bash
bun add @svadmin/pusher pusher-js
```

## Basic Usage

```typescript
import Pusher from 'pusher-js';
import { createPusherLiveProvider } from '@svadmin/pusher';
import { setLiveProvider } from '@svadmin/core';

const pusher = new Pusher('YOUR_APP_KEY', {
  cluster: 'mt1',
});

const liveProvider = createPusherLiveProvider(pusher, {
  channelPrefix: 'my-app',
});

setLiveProvider(liveProvider);
```
