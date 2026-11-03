---
title: Pusher 实时提供器
description: 基于 Pusher 托管 WebSocket 的实时数据流订阅
---

`@svadmin/pusher` 实现 svadmin `LiveProvider` 契约，支持在后端触发事件时，自动让前台关联页面的 TanStack Query 缓存失效并重新拉取。

## 安装

```bash
bun add @svadmin/pusher pusher-js
```

## 基本用法

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
