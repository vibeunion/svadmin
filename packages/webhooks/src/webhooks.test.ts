import { describe, expect, it, vi } from 'vitest';
import {
  createHmacSignature,
  verifyHmacSignature,
  matchesEvent,
  createWebhookDispatcher,
} from './index.js';
import type { WebhookSubscription } from './types.js';

describe('HMAC Signature Suite', () => {
  const secret = 'whsec_test_secret_123456';
  const payload = JSON.stringify({ event: 'order.created', id: 'ord_123' });

  it('generates consistent sha256 signatures', async () => {
    const sig1 = await createHmacSignature(payload, secret);
    const sig2 = await createHmacSignature(payload, secret);

    expect(sig1).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(sig1).toBe(sig2);
  });

  it('verifies valid signatures correctly', async () => {
    const signature = await createHmacSignature(payload, secret);
    const isValid = await verifyHmacSignature(payload, secret, signature);
    expect(isValid).toBe(true);
  });

  it('rejects tampered payload or incorrect secret', async () => {
    const signature = await createHmacSignature(payload, secret);
    const tamperedPayload = JSON.stringify({ event: 'order.created', id: 'ord_999' });

    const isValidTampered = await verifyHmacSignature(tamperedPayload, secret, signature);
    expect(isValidTampered).toBe(false);

    const isValidWrongSecret = await verifyHmacSignature(payload, 'wrong_secret', signature);
    expect(isValidWrongSecret).toBe(false);
  });

  it('rejects expired timestamp if tolerance exceeded', async () => {
    const signature = await createHmacSignature(payload, secret);
    const oldTimestamp = Date.now() - 600000; // 10 minutes ago

    const isValid = await verifyHmacSignature(payload, secret, signature, {
      timestamp: oldTimestamp,
      maxAgeMs: 300000, // 5 minutes max
    });
    expect(isValid).toBe(false);
  });
});

describe('matchesEvent Pattern Matcher', () => {
  it('matches exact event names', () => {
    expect(matchesEvent('user.created', 'user.created')).toBe(true);
    expect(matchesEvent('user.created', 'user.updated')).toBe(false);
  });

  it('matches wildcards', () => {
    expect(matchesEvent('*', 'any.event')).toBe(true);
    expect(matchesEvent('order.*', 'order.paid')).toBe(true);
    expect(matchesEvent('order.*', 'order.refund.requested')).toBe(true);
    expect(matchesEvent('order.*', 'customer.created')).toBe(false);
  });
});

describe('Webhook Dispatcher', () => {
  const subscriptions: WebhookSubscription[] = [
    {
      id: 'sub-1',
      url: 'https://api.example.com/webhooks/orders',
      secret: 'secret-1',
      events: ['order.*'],
      active: true,
      headers: { 'X-Custom-Tenant': 'tenant-alpha' },
    },
    {
      id: 'sub-2',
      url: 'https://api.example.com/webhooks/all',
      secret: 'secret-2',
      events: ['*'],
      active: true,
    },
    {
      id: 'sub-inactive',
      url: 'https://api.example.com/webhooks/inactive',
      secret: 'secret-3',
      events: ['order.*'],
      active: false,
    },
  ];

  it('dispatches to active and matching subscriptions only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const dispatcher = createWebhookDispatcher({
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const results = await dispatcher.dispatch('order.created', { orderId: '1001' }, subscriptions);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Verify headers sent to sub-1
    const sub1Call = fetchMock.mock.calls.find((call) => call[0] === subscriptions[0].url);
    expect(sub1Call).toBeDefined();
    const headers = sub1Call[1].headers;
    expect(headers['X-Svadmin-Event']).toBe('order.created');
    expect(headers['X-Custom-Tenant']).toBe('tenant-alpha');
    expect(headers['X-Svadmin-Signature']).toMatch(/^sha256=/);
  });

  it('retries on 500 server error up to maxRetries', async () => {
    let attemptCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        return Promise.resolve(new Response('Internal Server Error', { status: 500 }));
      }
      return Promise.resolve(new Response('OK', { status: 200 }));
    });

    const dispatcher = createWebhookDispatcher({
      fetchFn: fetchMock as unknown as typeof fetch,
      maxRetries: 3,
      backoffBaseMs: 1, // fast backoff for tests
    });

    const results = await dispatcher.dispatch(
      'order.created',
      { orderId: '1002' },
      [subscriptions[0]],
    );

    expect(results[0].success).toBe(true);
    expect(results[0].attempts).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('supports sending test ping to endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('Pong', { status: 200 }));
    const dispatcher = createWebhookDispatcher({
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const result = await dispatcher.ping(subscriptions[0]);
    expect(result.success).toBe(true);
    expect(result.event).toBe('ping');

    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.event).toBe('ping');
    expect(sentBody.data.hook_id).toBe('sub-1');
  });
});
