---
title: Server-Sent Events (SSE) 实时提供者
description: 基于标准 HTTP/2 SSE 的轻量级低延迟实时数据同步提供者
---

`@svadmin/sse` 为 svadmin 提供原生的 `LiveProvider` 实时提供者适配器，直接对接标准 Server-Sent Events (`text/event-stream`) 流式端点，无需依赖任何第三方商业云 PubSub 服务（如 Pusher、Ably）。

## 安装

```bash
bun add @svadmin/sse
```

## 基础用法

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

## 按资源分流端点

若后端（如 FastAPI、Spring Boot 或 NestJS）采用按资源独立的 SSE 流式端点：

```typescript
const liveProvider = createSseLiveProvider({
  url: (resource) => `https://api.example.com/api/live/${resource}`,
  headers: {
    'X-Tenant-Id': 'tenant-prod-01',
  },
});
```

## 核心特性

- **零商业平台绑定**：完全基于 Web 标准与自建后端通信，穿透各类企业网关、反向代理与防火墙。
- **自定义鉴权流式回退**：原生 `EventSource` 不支持自定义 Header，适配器自动启用基于 Fetch ReadableStream 的流解析器，无缝支持 Bearer Token 与多租户头。
- **抗网络抖动重连**：内置带随机抖动的指数退避（Exponential Backoff）算法，网络闪断后自动恢复连接与订阅列表。
- **标准事件自动映射**：将接收到的 `event:` 与 `data:` 规范化解析为 `@svadmin/core` 的 `LiveEvent` 事件（`INSERT`、`UPDATE`、`DELETE`）。
- **精准频道路由**：仅派发事件至对应 resource 的订阅回调函数，保证资源隔离与性能。
- **可选广播发布**：配置 `publishUrl` 即可通过 POST 请求向上游广播事件。
