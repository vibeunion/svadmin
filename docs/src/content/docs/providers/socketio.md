---
title: Socket.IO Live Provider
description: Connect Socket.IO realtime events to svadmin
---

`@svadmin/socketio` bridges Socket.IO client instances into svadmin's standard `LiveProvider`.
The adapter has no Socket.IO runtime dependency; install and construct the client in the host application.

## Installation

```bash
bun add @svadmin/socketio socket.io-client
```

## Basic Usage

```typescript
import { io } from 'socket.io-client';
import { createSocketIOLiveProvider } from '@svadmin/socketio';
import { setLiveProvider } from '@svadmin/core';

const socket = io('https://api.yourdomain.com', {
  transports: ['websocket'],
});

const liveProvider = createSocketIOLiveProvider(socket, {
  channelPrefix: 'svadmin',
  useRooms: true,
});

setLiveProvider(liveProvider);
```

## Features

- **Resource Subscription**: Automatically subscribes to model changes and channels.
- **Event Translation**: Maps `created`, `updated`, and `deleted` into standard `INSERT`, `UPDATE`, and `DELETE` `LiveEvent` payloads.
- **Room Management**: Optional automatic emission of `join` / `leave` room events when subscribing and unsubscribing.
- **Event Naming**: Namespaced events are used by default; set `listenToDirectEvents: true` only when the server also emits unprefixed resource events.
- **Bi-directional Publishing**: Publishes outbound events using `publish(event)`.
