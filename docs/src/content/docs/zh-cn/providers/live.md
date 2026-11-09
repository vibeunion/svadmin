---
title: 实时 Provider
description: 通过 WebSocket 和 SSE 实现实时数据订阅
---

LiveProvider 通过 WebSocket 或 Server-Sent Events 实现实时数据更新。

## 接口

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

## 内置 Provider

### WebSocket

```typescript
import { createWebSocketLiveProvider } from '@svadmin/core';
const liveProvider = createWebSocketLiveProvider({ url: 'ws://localhost:3001' });
```

内置 Provider 使用轻量 JSON 协议，不依赖 Socket.IO。客户端发送带有 `resource` 的 `SUBSCRIBE` 和 `UNSUBSCRIBE` 消息，服务端返回带有 `resource` 与 `payload` 的 `INSERT`、`UPDATE` 或 `DELETE` 事件。任何兼容 WebSocket 的客户端都可以实现该协议。在 Node 环境中，可传入 `webSocketFactory` 使用 `ws` 等客户端，无需把 WebSocket 挂到全局对象。

### Server-Sent Events（SSE）

```typescript
import { createSSELiveProvider } from '@svadmin/core';
const liveProvider = createSSELiveProvider({ url: 'http://localhost:3001/events' });
```

### Supabase 实时

```typescript
import { createSupabaseLiveProvider } from '@svadmin/supabase';
const liveProvider = createSupabaseLiveProvider(supabaseClient);
```

支持通过 Supabase Realtime 广播频道发布事件。

如果你还需要 `@supacloud/js` 的任务状态订阅，可以使用 `@svadmin/supabase/supacloud` 里的 [`createSupaCloudTaskLiveProvider()`](/zh-cn/providers/supacloud)。它会把 `tasks.subscribe()` 桥接成标准的 svadmin `LiveProvider` 接口。

### Appwrite 实时

```typescript
import { createAppwriteLiveProvider } from '@svadmin/appwrite';
const liveProvider = createAppwriteLiveProvider({ client, databaseId: 'main' });
```

### PocketBase 实时

```typescript
import { createPocketBaseLiveProvider } from '@svadmin/pocketbase';
const liveProvider = createPocketBaseLiveProvider({ pb });
```

PocketBase 使用基于 SSE 的实时订阅。

## Hook

### `useLive` — 自动刷新查询

```typescript
useLive(liveProvider, 'posts', {
  liveMode: 'auto',           // 'auto' | 'manual' | 'off'
  onLiveEvent: (event) => {}, // 可选回调
});
```

### `useSubscription` — 手动频道订阅

```typescript
useSubscription({
  resource: 'notifications',
  liveProvider,
  onLiveEvent: (event) => console.log(event),
});
```

### `usePublish` — 发布自定义事件

```typescript
const publish = usePublish(liveProvider);
publish({ type: 'UPDATE', resource: 'posts', payload: { id: 1 } });
```

## 实时模式

| 模式 | 行为 |
|------|------|
| `auto` | 收到事件后自动刷新查询（默认） |
| `manual` | 触发 `onLiveEvent` 但不自动刷新 — 由你决定 |
| `off` | 不订阅 |
