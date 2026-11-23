# @svadmin/sse

Native Server-Sent Events (SSE) LiveProvider adapter for svadmin

## Install

```bash
bun add @svadmin/sse
```

## Usage

```ts
import { createSseLiveProvider } from '@svadmin/sse';

const liveProvider = createSseLiveProvider({
  url: '/api/events',
  reconnect: { maxRetries: 5 },
});
```

Native Server-Sent Events live provider with reconnection and chunk parsing.

Documentation: https://svadmin.nestjs.cn

License: MIT
