---
title: Webhooks 出站事件派发驱动
description: 企业级 Webhook 事件派发调度、HMAC-SHA256 签名计算与验证套件
---

`@svadmin/webhooks` 为 svadmin 提供工业级出站 Webhook 事件派发调度引擎，具备 HMAC-SHA256 签名计算、时间戳防重放验证与指数退避自动重试能力。

## 安装

```bash
bun add @svadmin/webhooks
```

## 基础用法

### 派发出站业务事件

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
    console.log(`派发至 ${result.url}: 状态码=${result.statusCode}, 耗时=${result.durationMs}ms`);
  },
});

// 广播事件至所有匹配且启用的订阅端点
const results = await dispatcher.dispatch('order.created', {
  orderId: 'ORD-2026-001',
  amount: 299.0,
  currency: 'CNY',
}, subscriptions);
```

### 接收并验证入站 Webhook 签名

作为接收方时，校验来源真实性并规避重放攻击：

```typescript
import { verifyHmacSignature } from '@svadmin/webhooks';

const rawBody = await request.text();
const signatureHeader = request.headers.get('X-Svadmin-Signature') || request.headers.get('X-Hub-Signature-256');
const timestampHeader = Number(request.headers.get('X-Svadmin-Timestamp'));

const isValid = await verifyHmacSignature(rawBody, 'whsec_prod_secret_key', signatureHeader, {
  timestamp: timestampHeader,
  maxAgeMs: 300000, // 允许最大 5 分钟时间戳偏差
});

if (!isValid) {
  return new Response('未授权的 Webhook 签名', { status: 401 });
}
```

## 配置项

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `maxRetries` | `number` | `3` | 瞬时网络异常或 5xx 服务端错误的最大自动重试次数。 |
| `backoffBaseMs` | `number` | `50` | 重试之间的指数退避基数毫秒数。 |
| `timeoutMs` | `number` | `10000` | HTTP 请求超时毫秒数。 |
| `onDelivery` | `(result) => void` | `undefined` | 单个端点完成派发或重试耗尽后的结果生命周期回调。 |

## 核心特性

- **工业级 HMAC-SHA256 签名**：遵循 GitHub / Stripe 标准，在 `X-Svadmin-Signature` 和 `X-Hub-Signature-256` 中传递 `sha256=${hex}` 签名；
- **防时序攻击（Timing Attack）**：采用严格的常量时间字符串比对验证；
- **通配符事件订阅匹配**：支持精确匹配（`order.created`）、前缀通配（`order.*`）以及全局通配（`*`）；
- **智能重试与退避**：遭遇 5xx 故障自动触发指数退避重试，遭遇 4xx 客户端错误快速截断返回；
- **一键测试 Ping**：提供标准的连通性探测接口，用于在管理控制台中测试第三方 Webhook 地址是否联通。
