---
title: Server-Sent Events (SSE) 实时提供者
description: 基于标准 HTTP SSE 的轻量级低延迟实时数据同步提供者
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
- **统一 Fetch 流式传输**：浏览器与服务端使用同一解析器处理命名事件、鉴权 Header 和重连，支持 Bearer Token 与多租户头。
- **抗网络抖动重连**：内置带随机抖动的指数退避（Exponential Backoff）算法，网络闪断后自动恢复连接与订阅列表。
- **标准事件自动映射**：将接收到的 `event:` 与 `data:` 规范化解析为 `@svadmin/core` 的 `LiveEvent` 事件（`INSERT`、`UPDATE`、`DELETE`）。
- **精准频道路由**：仅派发事件至对应 resource 的订阅回调函数，保证资源隔离与性能。
- **可选广播发布**：配置 `publishUrl` 即可通过 POST 请求向上游广播事件。

## 事件格式与恢复

共享端点的 JSON 事件必须声明所属资源：

```text
event: updated
id: 42
data: {"resource":"posts","type":"UPDATE","payload":{"id":1,"title":"已更新"}}

```

`event:` 或 JSON 的 `type`、`event`、`name`、`action` 决定 INSERT、UPDATE 或 DELETE；未知操作默认 UPDATE。仅供单一资源使用的流可省略 `resource`。共享端点无法确定归属的事件通过 `onError` 报告并丢弃；`*` 订阅接收明确归属的所有资源事件。

`liveParams` 传入 URL 解析函数，用于选择过滤端点或租户端点，不执行客户端数据过滤。订阅返回的清理函数可重复调用；`unsubscribe` 清理解析后 URL 和资源相同的订阅，支持传入等值的 `liveParams`。

每次重连重新解析鉴权 Header，并将最新 SSE `id` 作为 `Last-Event-ID` 发送；空 `id` 清除游标。`maxRetries` 限制连续未收到可路由事件的重试次数，HTTP 204 停止重连。端点须返回 `Content-Type: text/event-stream`。

`publish` 返回 Promise。配置 `publishUrl` 后通过 `await liveProvider.publish(event)` 接收 HTTP 和网络失败，错误也会通知 `onError`。
