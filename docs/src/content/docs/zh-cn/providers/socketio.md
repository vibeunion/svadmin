---
title: Socket.IO 实时提供器
description: 将 Socket.IO 实时数据流与协作事件接入 svadmin
---

`@svadmin/socketio` 将 Socket.IO 客户端桥接为标准的 svadmin `LiveProvider`。

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
- **双向消息发布**: 支持通过 `publish(event)` 发送客户端事件。
