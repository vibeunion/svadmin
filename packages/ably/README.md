# @svadmin/ably

Ably Pub/Sub LiveProvider adapter for svadmin

## Install

```bash
bun add @svadmin/ably
```

## Usage

```ts
import { createAblyLiveProvider } from '@svadmin/ably';

const liveProvider = createAblyLiveProvider(ablyClient);
```

Bridges an Ably Realtime client to the svadmin LiveProvider contract for list, one, and many subscriptions.

Documentation: https://svadmin.nestjs.cn

License: MIT
