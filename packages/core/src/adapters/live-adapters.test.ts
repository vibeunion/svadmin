import { describe, expect, test, mock } from 'bun:test';
import { createCerbosAccessControl } from './cerbos';
import { createPermitAccessControl } from './permit';
import { createAblyLiveProvider } from './ably';
import { createFirebaseLiveProvider } from './firebase';
import { createGraphQLSubscriptionLiveProvider } from './graphql-subscription';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('Cerbos access control', () => {
  test('sends the Cerbos resource check and maps EFFECT_ALLOW', async () => {
    const fetch = mock(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.principal).toEqual({ id: 'u1', roles: ['admin'] });
      expect(body.resources[0]).toMatchObject({ resource: { kind: 'posts', id: '1' }, actions: ['edit'] });
      return jsonResponse({ results: [{ actions: { edit: 'EFFECT_ALLOW' } }] });
    });
    const provider = createCerbosAccessControl({
      endpoint: 'https://cerbos.test/',
      principal: () => ({ id: 'u1', roles: ['admin'] }),
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
    await expect(provider.can({ resource: 'posts', action: 'edit', params: { id: 1 } })).resolves.toEqual({ can: true });
  });

  test('maps a denied action and hides transport details', async () => {
    const provider = createCerbosAccessControl({
      endpoint: 'https://cerbos.test',
      principal: () => ({ id: 'u1' }),
      fetch: (async () => jsonResponse({ results: [{ actions: { delete: 'EFFECT_DENY' } }] })) as unknown as typeof globalThis.fetch,
    });
    await expect(provider.can({ resource: 'posts', action: 'delete' })).resolves.toMatchObject({ can: false });
  });
});

describe('Permit access control', () => {
  test('sends the enforcement check and maps allow', async () => {
    const fetch = mock(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://permit.test/api/v2/enforcement/check');
      expect(init.headers).toMatchObject({ authorization: 'Bearer token' });
      const body = JSON.parse(String(init.body));
      expect(body).toMatchObject({
        user: { key: 'u1' },
        action: 'edit',
        resource: { type: 'posts', key: '1' },
      });
      return jsonResponse({ allow: true });
    });
    const provider = createPermitAccessControl({
      endpoint: 'https://permit.test',
      token: 'token',
      user: () => 'u1',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
    await expect(provider.can({ resource: 'posts', action: 'edit', params: { id: 1 } })).resolves.toEqual({ can: true });
  });
});

describe('Ably live provider', () => {
  test('subscribes to a resource channel and maps events', () => {
    const listeners = new Set<(message: { name?: string; data?: unknown }) => void>();
    const channel = {
      subscribe(callback: (message: { name?: string; data?: unknown }) => void) { listeners.add(callback); },
      unsubscribe(callback: (message: { name?: string; data?: unknown }) => void) { listeners.delete(callback); },
      publish: mock(() => undefined),
    };
    const provider = createAblyLiveProvider({ channels: { get: () => channel } });

    const received: unknown[] = [];
    const dispose = provider.subscribe({ resource: 'posts', callback: (event) => received.push(event) });
    for (const listener of listeners) listener({ name: 'created', data: { ids: [1] } });
    for (const listener of listeners) listener({ name: 'deleted', data: { ids: [2] } });
    expect(received).toEqual([
      { type: 'INSERT', resource: 'posts', payload: { ids: [1] } },
      { type: 'DELETE', resource: 'posts', payload: { ids: [2] } },
    ]);

    dispose();
    expect(listeners.size).toBe(0);
    provider.publish?.({ type: 'UPDATE', resource: 'posts', payload: { ids: [3] } });
    expect(channel.publish).toHaveBeenCalledWith('UPDATE', { ids: [3] });
  });
});

describe('Firebase live provider', () => {
  test('maps transport values and clears the listener', () => {
    let emit: ((value: unknown) => void) | undefined;
    const dispose = mock(() => {});
    const provider = createFirebaseLiveProvider({
      subscribe(_path, callback) { emit = callback; return dispose; },
    });

    const received: unknown[] = [];
    const stop = provider.subscribe({ resource: 'posts', callback: (event) => received.push(event) });
    emit?.({ type: 'updated', payload: { ids: [1] } });
    expect(received).toEqual([{ type: 'UPDATE', resource: 'posts', payload: { ids: [1] } }]);
    stop();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('GraphQL subscriptions live provider', () => {
  test('forwards resource params and validated events', () => {
    let emit: ((value: unknown) => void) | undefined;
    let receivedParams: unknown;
    const provider = createGraphQLSubscriptionLiveProvider({
      subscribe(params, callback) { receivedParams = params; emit = callback; return () => {}; },
    });

    const received: unknown[] = [];
    provider.subscribe({ resource: 'posts', liveParams: { room: 'a' }, callback: (event) => received.push(event) });
    expect(receivedParams).toEqual({ resource: 'posts', liveParams: { room: 'a' } });
    emit?.({ type: 'created', resource: 'posts', payload: { ids: [1] } });
    expect(received).toEqual([{ type: 'INSERT', resource: 'posts', payload: { ids: [1] } }]);
  });
});