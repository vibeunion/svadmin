---
title: Server-Sent Events (SSE) Live Provider
description: Real-time resource synchronization over HTTP/2 Server-Sent Events for svadmin
---

`@svadmin/sse` provides a native `LiveProvider` adapter communicating directly with standard Server-Sent Events (`text/event-stream`) endpoints. It enables instant, low-overhead real-time UI synchronization without requiring third-party cloud PubSub services.

## Installation

```bash
bun add @svadmin/sse
```

## Basic Usage

```typescript
import { createSseLiveProvider } from '@svadmin/sse';
import { setLiveProvider } from '@svadmin/core';

const liveProvider = createSseLiveProvider({
  url: 'https://api.example.com/api/realtime/stream',
  headers: () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  }),
  reconnect: {
    initialDelayMs: 1000,
    maxDelayMs: 15000,
  },
});

setLiveProvider(liveProvider);
```

## Dynamic Resource Endpoints

When your backend exposes individual streaming endpoints per resource (e.g. FastAPI, Spring Boot, or NestJS):

```typescript
const liveProvider = createSseLiveProvider({
  url: (resource) => `https://api.example.com/api/live/${resource}`,
  headers: {
    'X-Tenant-Id': 'tenant-prod-01',
  },
});
```

## Features

- **Zero Cloud Vendor Lock-In**: Connect directly to your own self-hosted microservices or API gateways without Pusher/Ably subscriptions.
- **Fetch ReadableStream Fallback**: Automatically handles custom authorization headers (e.g. Bearer tokens) where native browser `EventSource` cannot pass custom headers.
- **Resilient Reconnection**: Exponential backoff with random jitter ensures automatic recovery from transient network disruptions.
- **Lightweight Event Mapping**: Maps incoming SSE `event:` and `data:` into `@svadmin/core` `LiveEvent` envelopes (`INSERT`, `UPDATE`, `DELETE`).
- **Resource Channel Routing**: Subscribers only receive events targeting their subscribed resource or namespace.
- **Optional Publishing**: Dispatch mutations to an upstream webhook/broadcast endpoint with `publishUrl`.
