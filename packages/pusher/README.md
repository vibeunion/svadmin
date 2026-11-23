# @svadmin/pusher

Pusher LiveProvider adapter for svadmin

## Install

```bash
bun add @svadmin/pusher pusher-js
```

## Usage

```ts
import { createPusherLiveProvider } from '@svadmin/pusher';

const liveProvider = createPusherLiveProvider(pusherClient, {
  channelPrefix: 'app',
});
```

Maps Pusher channels and events to svadmin live subscriptions.

Documentation: https://svadmin.nestjs.cn

License: MIT
