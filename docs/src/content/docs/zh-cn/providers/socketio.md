---
title: Socket.IO 实时提供器
description: 将 Socket.IO 实时数据流与协作事件接入 svadmin
---

`@svadmin/socketio` 将 Socket.IO 客户端桥接为标准的 svadmin `LiveProvider`。
适配器不捆绑 Socket.IO 运行时，客户端由宿主应用自行安装和创建。

## 安装

```bash
bun add @svadmin/socketio socket.io-client
```

## 基本用法

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

## 特性

- **资源事件监听**: 自动监听资源或房间的变更事件。
- **事件规范对齐**: 将服务端的 `created`、`updated`、`deleted` 自动转换为规范的 `INSERT`、`UPDATE`、`DELETE` 事件载荷。
- **房间生命周期管理**: 可选开启 `useRooms`，在订阅/取消订阅时向服务端发送 `join`/`leave` 信令。
- **事件命名**: 默认只监听带命名空间的事件；只有服务端同时发送无前缀资源事件时才设置 `listenToDirectEvents: true`。
- **双向消息发布**: 支持通过 `publish(event)` 发送客户端事件。
