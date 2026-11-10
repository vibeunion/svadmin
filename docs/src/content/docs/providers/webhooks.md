---
title: Webhooks Dispatcher
description: Enterprise outgoing webhook event dispatcher and HMAC-SHA256 signature verification suite for svadmin
---

`@svadmin/webhooks` provides an enterprise-ready outgoing event dispatcher with HMAC-SHA256 signatures, replay attack protection, and automated exponential backoff retries.

## Installation

```bash
bun add @svadmin/webhooks
```

## Basic Usage

### Dispatching Outgoing Events

```typescript
import { createWebhookDispatcher, type WebhookSubscription } from '@svadmin/webhooks';

const subscriptions: WebhookSubscription[] = [
  {
    id: 'sub-feishu-bot',
    url: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxx',
    secret: 'whsec_prod_secret_key',
    events: ['order.*', 'user.banned'],
    active: true,
  },
  {
    id: 'sub-zapier',
    url: 'https://hooks.zapier.com/hooks/catch/xxxxxx',
    secret: 'whsec_zapier_secret_key',
    events: ['*'],
    active: true,
  },
];

const dispatcher = createWebhookDispatcher({
  maxRetries: 3,
  backoffBaseMs: 200,
  onDelivery: (result) => {
    console.log(`Delivered to ${result.url}: status=${result.statusCode}, duration=${result.durationMs}ms`);
  },
});

// Broadcast event to matching active subscriptions
const results = await dispatcher.dispatch('order.created', {
  orderId: 'ORD-2026-001',
  amount: 299.0,
  currency: 'USD',
}, subscriptions);
```

### Verifying Inbound Webhook Signatures

When receiving webhook callbacks, verify authenticity and avoid replay attacks:

```typescript
import { verifyHmacSignature } from '@svadmin/webhooks';

const rawBody = await request.text();
const signatureHeader = request.headers.get('X-Svadmin-Signature') || request.headers.get('X-Hub-Signature-256');
const timestampHeader = Number(request.headers.get('X-Svadmin-Timestamp'));

const isValid = await verifyHmacSignature(rawBody, 'whsec_prod_secret_key', signatureHeader, {
  timestamp: timestampHeader,
  maxAgeMs: 300000, // 5 minutes max timestamp tolerance
});

if (!isValid) {
  return new Response('Unauthorized Webhook Signature', { status: 401 });
}
```

## Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `maxRetries` | `number` | `3` | Maximum retry attempts for transient server errors (5xx/network error). |
| `backoffBaseMs` | `number` | `50` | Base exponential backoff delay in milliseconds between retries. |
| `timeoutMs` | `number` | `10000` | HTTP request timeout in milliseconds. |
| `onDelivery` | `(result) => void` | `undefined` | Lifecycle callback invoked upon delivery completion or final failure. |

## Features

- **Standard HMAC-SHA256**: Generates standard `sha256=${hex}` signature sent in `X-Svadmin-Signature` and `X-Hub-Signature-256`.
- **Timing Attack Safe**: Utilizes constant-time string comparison for cryptographic verification.
- **Event Wildcards**: Supports exact matching (`order.created`), prefix wildcards (`order.*`), and global catch-all (`*`).
- **Transient Error Retries**: Automatically retries 5xx server errors with exponential backoff while fast-failing on 4xx client errors.
- **Test Ping Support**: One-click test ping dispatching to verify webhook endpoint connectivity.
