---
title: Server-Sent Events (SSE) Live Provider
description: Real-time resource synchronization over HTTP Server-Sent Events for svadmin
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
- **Fetch ReadableStream Transport**: Uses the same fetch parser for named events, authorization headers, and reconnection in browsers and server runtimes.
- **Resilient Reconnection**: Exponential backoff with random jitter ensures automatic recovery from transient network disruptions.
- **Lightweight Event Mapping**: Maps incoming SSE `event:` and `data:` into `@svadmin/core` `LiveEvent` envelopes (`INSERT`, `UPDATE`, `DELETE`).
- **Resource Channel Routing**: Subscribers only receive events targeting their subscribed resource, plus wildcard `*` subscriptions.
- **Optional Publishing**: Dispatch mutations to an upstream webhook/broadcast endpoint with `publishUrl`.

## Event format and recovery

A shared endpoint must identify its resource in each JSON event:

```text
event: updated
id: 42
data: {"resource":"posts","type":"UPDATE","payload":{"id":1,"title":"Updated"}}

```

`event:` or the JSON `type`/`event`/`name`/`action` selects INSERT, UPDATE, or DELETE; unknown actions default to UPDATE. A stream used for only one resource may omit `resource`. Ambiguous events on shared endpoints are rejected through `onError`.

`liveParams` is passed to the URL resolver; use it to select a filtered or tenant-specific endpoint. It does not apply client-side payload filters. The returned subscription disposer is idempotent. `unsubscribe` removes subscriptions matching the resolved URL and resource, including equivalent `liveParams` values.

Every retry resolves authorization headers again and sends the latest SSE `id` as `Last-Event-ID`; an empty `id` clears it. `maxRetries` counts consecutive attempts without a routed event, and an HTTP 204 response stops reconnection. The endpoint must return `Content-Type: text/event-stream`.

`publish` returns a promise. Configure `publishUrl` and await `liveProvider.publish(event)` to observe HTTP and network failures; failures also reach `onError`.
