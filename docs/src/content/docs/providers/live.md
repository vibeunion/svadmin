---
title: Live Provider
description: Real-time data subscriptions via WebSocket and SSE
---

LiveProvider enables real-time data updates through WebSocket or Server-Sent Events.

## Interface

```typescript
interface LiveProvider {
  subscribe(params: { resource: string; callback: (event: LiveEvent) => void }): () => void;
  unsubscribe?(params: { resource: string }): void;
  publish?(event: LiveEvent): void;
}

interface LiveEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  resource: string;
  payload: Record<string, unknown>;
}
```

## Built-in Providers

### WebSocket

```typescript
import { createWebSocketLiveProvider } from '@svadmin/core';
const liveProvider = createWebSocketLiveProvider({ url: 'ws://localhost:3001' });
```

The built-in provider uses a small JSON protocol and has no Socket.IO dependency. The client sends `SUBSCRIBE` and `UNSUBSCRIBE` messages with a `resource`; the server sends `INSERT`, `UPDATE`, or `DELETE` events with `resource` and `payload`. Any WebSocket-compatible client can speak this protocol. In a Node runtime, pass `webSocketFactory` to use a client such as `ws` without installing a global `WebSocket`.

### Server-Sent Events (SSE)

```typescript
import { createSSELiveProvider } from '@svadmin/core';
const liveProvider = createSSELiveProvider({ url: 'http://localhost:3001/events' });
```

### Supabase Realtime

```typescript
import { createSupabaseLiveProvider } from '@svadmin/supabase';
const liveProvider = createSupabaseLiveProvider(supabaseClient);
```

Supports `publish()` via Supabase Realtime broadcast channels.

If you need task-status subscriptions from `@supacloud/js`, use the optional [`createSupaCloudTaskLiveProvider()`](/providers/supacloud) helper from `@svadmin/supabase/supacloud`. It bridges `tasks.subscribe()` into the standard svadmin `LiveProvider` contract.

### Appwrite Realtime

```typescript
import { createAppwriteLiveProvider } from '@svadmin/appwrite';
const liveProvider = createAppwriteLiveProvider({ client, databaseId: 'main' });
```

### PocketBase Realtime

```typescript
import { createPocketBaseLiveProvider } from '@svadmin/pocketbase';
const liveProvider = createPocketBaseLiveProvider({ pb });
```

PocketBase uses SSE-based realtime subscriptions.

## Hooks

### `useLive` — Auto-invalidate queries

```typescript
useLive(liveProvider, 'posts', {
  liveMode: 'auto',           // 'auto' | 'manual' | 'off'
  onLiveEvent: (event) => {}, // optional callback
});
```

### `useSubscription` — Manual channel subscription

```typescript
useSubscription({
  resource: 'notifications',
  liveProvider,
  onLiveEvent: (event) => console.log(event),
});
```

### `usePublish` — Publish custom events

```typescript
const publish = usePublish(liveProvider);
publish({ type: 'UPDATE', resource: 'posts', payload: { id: 1 } });
```

## Live Modes

| Mode | Behavior |
|------|----------|
| `auto` | Automatically invalidates queries on events (default) |
| `manual` | Calls `onLiveEvent` but doesn't invalidate — you decide |
| `off` | No subscription |
