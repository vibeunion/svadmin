# @svadmin/webhooks

Enterprise outgoing webhook dispatcher and HMAC-SHA256 signature suite for svadmin

## Install

```bash
bun add @svadmin/webhooks
```

## Usage

```ts
import {
  createWebhookDispatcher,
  createHmacSignature,
  verifyHmacSignature,
} from '@svadmin/webhooks';

const dispatcher = createWebhookDispatcher({ maxRetries: 3 });
const signature = await createHmacSignature(payload, secret);
```

Outgoing webhook dispatcher with wildcard event matching, retries, timeouts, and HMAC-SHA256 signatures.

Documentation: https://svadmin.nestjs.cn

License: MIT
