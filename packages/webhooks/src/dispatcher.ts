import type {
  WebhookSubscription,
  WebhookPayload,
  WebhookDeliveryResult,
  WebhookDispatcherOptions,
} from './types.js';
import { createHmacSignature } from './signature.js';

export function matchesEvent(pattern: string, eventName: string): boolean {
  if (pattern === '*' || pattern === eventName) return true;
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return eventName.startsWith(`${prefix}.`);
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createWebhookDispatcher(options: WebhookDispatcherOptions = {}) {
  const customFetch = options.fetchFn ?? fetch;
  const maxRetries = options.maxRetries ?? 3;
  const backoffBaseMs = options.backoffBaseMs ?? 50;
  const timeoutMs = options.timeoutMs ?? 10000;

  async function sendWithRetry(
    subscription: WebhookSubscription,
    payload: WebhookPayload,
  ): Promise<WebhookDeliveryResult> {
    const serializedPayload = JSON.stringify(payload);
    const signature = await createHmacSignature(serializedPayload, subscription.secret);
    const timestampStr = String(payload.timestamp);

    let lastError: string | undefined;
    let lastStatusCode: number | undefined;
    let lastResponseBody: string | undefined;
    let attempts = 0;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      attempts = attempt;
      payload.attempt = attempt;

      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

        const response = await customFetch(subscription.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'svadmin-webhooks/0.1.0',
            'X-Svadmin-Event': payload.event,
            'X-Svadmin-Delivery': payload.id,
            'X-Svadmin-Timestamp': timestampStr,
            'X-Svadmin-Signature': signature,
            'X-Hub-Signature-256': signature,
            ...(subscription.headers ?? {}),
          },
          body: serializedPayload,
          ...(controller ? { signal: controller.signal } : {}),
        });

        if (timer) clearTimeout(timer);

        lastStatusCode = response.status;
        const text = await response.text().catch(() => '');
        lastResponseBody = text.slice(0, 1024); // capture first 1KB of response

        if (response.ok) {
          const result: WebhookDeliveryResult = {
            subscriptionId: subscription.id,
            url: subscription.url,
            event: payload.event,
            success: true,
            statusCode: lastStatusCode,
            responseBody: lastResponseBody,
            durationMs: Date.now() - startTime,
            attempts,
          };
          options.onDelivery?.(result);
          return result;
        }

        // 4xx client errors (e.g. 400, 404, 401) should generally not retry except maybe 429
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          lastError = `HTTP ${response.status}: Client error`;
          break;
        }

        lastError = `HTTP ${response.status}: Server error`;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      if (attempt < maxRetries) {
        const backoff = backoffBaseMs * Math.pow(2, attempt - 1);
        await delay(backoff);
      }
    }

    const failedResult: WebhookDeliveryResult = {
      subscriptionId: subscription.id,
      url: subscription.url,
      event: payload.event,
      success: false,
      statusCode: lastStatusCode,
      responseBody: lastResponseBody,
      durationMs: Date.now() - startTime,
      attempts,
      error: lastError ?? 'Delivery failed',
    };

    options.onDelivery?.(failedResult);
    return failedResult;
  }

  return {
    async dispatch(
      event: string,
      data: unknown,
      subscriptions: WebhookSubscription[],
    ): Promise<WebhookDeliveryResult[]> {
      const activeSubs = subscriptions.filter(
        (sub) => sub.active && sub.events.some((pattern) => matchesEvent(pattern, event)),
      );

      if (activeSubs.length === 0) {
        return [];
      }

      const basePayload: Omit<WebhookPayload, 'attempt'> = {
        id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        event,
        timestamp: Date.now(),
        data,
      };

      const promises = activeSubs.map((sub) =>
        sendWithRetry(sub, { ...basePayload }),
      );

      return Promise.all(promises);
    },

    async ping(subscription: WebhookSubscription): Promise<WebhookDeliveryResult> {
      const pingPayload: WebhookPayload = {
        id: `wh_ping_${Date.now()}`,
        event: 'ping',
        timestamp: Date.now(),
        data: {
          zen: 'Keep it simple, flexible, and robust.',
          hook_id: subscription.id,
        },
      };

      return sendWithRetry(subscription, pingPayload);
    },
  };
}
