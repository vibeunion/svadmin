import { describe, expect, mock, test } from 'bun:test';
import { createClient, type RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { LiveEvent } from '@svadmin/core';
import { requireValue } from '../../../scripts/test-assertions';
import {
  createSupabaseLiveProvider, type SupabaseLiveError, type SupabaseRealtimeChannel,
} from './live-provider';

async function flush(): Promise<void> {
  for (let index = 0; index < 20; index++) await Promise.resolve();
}

function deferred() {
  let resolve: ((value: unknown) => void) | undefined;
  let reject: ((reason: unknown) => void) | undefined;
  const promise = new Promise<unknown>((complete, fail) => { resolve = complete; reject = fail; });
  return {
    promise,
    resolve(value: unknown) { requireValue(resolve)(value); },
    reject(reason: unknown) { requireValue(reject)(reason); },
  };
}

class Channel implements SupabaseRealtimeChannel {
  readonly handlers = new Map<string, (event: unknown) => void>();
  status: ((value: unknown) => void) | undefined;
  readonly on = mock((type: string, _filter: { event: string }, callback: (event: unknown) => void) => {
    this.handlers.set(type, callback);
    return this;
  });
  readonly subscribe = mock((status: (value: unknown) => void) => {
    this.status = status;
    status('SUBSCRIBED');
    return this;
  });
  readonly send = mock(async (_message: { type: 'broadcast'; event: 'live-event'; payload: LiveEvent }): Promise<unknown> => 'ok');
  emit(type: string, event: unknown): void { requireValue(this.handlers.get(type))(event); }
}

function fixture() {
  const instances: Channel[] = [];
  const channel = mock((_name: string, _options: { config: { broadcast: { ack: true } } }) => {
    const created = new Channel();
    instances.push(created);
    return created;
  });
  const removeChannel = mock(async (_channel: Channel): Promise<unknown> => 'ok');
  const onError = mock((_error: SupabaseLiveError) => {});
  const client = { channel, removeChannel };
  return {
    client, instances, onError, provider: createSupabaseLiveProvider(client, { onError }),
    instance: (index = 0) => requireValue(instances[index]),
    codes: () => onError.mock.calls.map(([error]) => error.code),
  };
}

function postgres(eventType: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT'): RealtimePostgresChangesPayload<Record<string, unknown>> {
  const base = { schema: 'public', table: 'posts', commit_timestamp: '2026-09-09T00:00:00Z', errors: [] };
  if (eventType === 'DELETE') return { ...base, eventType, new: {}, old: { id: 1 } };
  return { ...base, eventType, new: { id: 1, nested: { count: 1 } }, old: {} };
}

function broadcast(payload: unknown = { type: 'UPDATE', resource: 'posts', payload: { id: 1 } }) {
  return { type: 'broadcast', event: 'live-event', payload };
}

describe('Supabase realtime boundaries', () => {
  test('uses the old row for deletes and validates all actions', async () => {
    const f = fixture();
    const events: LiveEvent[] = [];
    const cancel = f.provider.subscribe({ resource: 'posts', callback: event => events.push(event) });
    await flush();
    for (const action of ['INSERT', 'UPDATE', 'DELETE'] as const) f.instance().emit('postgres_changes', postgres(action));
    expect(events.map(event => event.type)).toEqual(['INSERT', 'UPDATE', 'DELETE']);
    expect(events[2]).toEqual({ type: 'DELETE', resource: 'posts', payload: { id: 1 } });
    expect(f.client.channel).toHaveBeenCalledWith('live-posts', { config: { broadcast: { ack: true } } });
    cancel();
    await flush();
    expect(f.client.removeChannel).toHaveBeenCalledTimes(1);
  });

  test('rejects malformed database and broadcast envelopes before dispatch', async () => {
    const f = fixture();
    const callback = mock((_event: LiveEvent) => {});
    const cancel = f.provider.subscribe({ resource: 'posts', callback });
    await flush();
    const invalidPostgres: unknown[] = [
      null, [], {}, { ...postgres(), eventType: 'TRUNCATE' }, { ...postgres(), table: 'users' },
      { ...postgres(), schema: 'private' }, { ...postgres(), new: null }, { ...postgres(), new: [] },
      { ...postgres('DELETE'), old: {} }, { ...postgres(), errors: ['secret decoding failure'] },
      { ...postgres(), new: { id: 1, value: undefined } }, { ...postgres(), errors: false },
    ];
    const invalidBroadcast: unknown[] = [
      null, {}, broadcast(null), broadcast({ type: 'UPDATE', resource: 'users', payload: {} }),
      broadcast({ type: 'UPDATE', resource: 'posts', payload: [] }),
      broadcast({ type: 'UPDATE', resource: 'posts', payload: {}, extra: 'secret' }),
      { ...broadcast(), event: 'different' }, { ...broadcast(), type: 'presence' },
    ];
    for (const event of invalidPostgres) f.instance().emit('postgres_changes', event);
    for (const event of invalidBroadcast) f.instance().emit('broadcast', event);
    expect(callback).not.toHaveBeenCalled();
    expect(f.codes()).toEqual([...invalidPostgres, ...invalidBroadcast].map(() => 'INVALID_EVENT'));
    expect(f.onError.mock.calls.every(([error]) => !error.message.includes('secret'))).toBe(true);
    cancel();
    await flush();
  });

  test('rejects non-JSON data, getters, proxies and cycles without invoking getters', async () => {
    const f = fixture();
    const callback = mock((_event: LiveEvent) => {});
    const cancel = f.provider.subscribe({ resource: 'posts', callback });
    await flush();
    let reads = 0;
    const cycle: Record<string, unknown> = {};
    cycle['self'] = cycle;
    const invalid = [
      { get id() { reads++; return 'secret'; } }, { date: new Date() }, { value: Number.NaN },
      { run: () => {} }, { rows: new Array(1) }, { [Symbol('secret')]: 'secret' }, cycle,
      Object.defineProperty({}, 'secret', { value: 1 }),
      new Proxy({}, { ownKeys() { throw new Error('secret'); } }),
    ];
    for (const payload of invalid) f.instance().emit('broadcast', broadcast({ type: 'UPDATE', resource: 'posts', payload }));
    expect(callback).not.toHaveBeenCalled();
    expect(reads).toBe(0);
    expect(f.codes()).toEqual(invalid.map(() => 'INVALID_EVENT'));
    cancel();
    await flush();
  });

  test('isolates subscriber mutation and exceptions while preserving later listeners', async () => {
    const f = fixture();
    const events: LiveEvent[] = [];
    const cancelFirst = f.provider.subscribe({ resource: 'posts', callback: event => {
      event.payload['nested'] = 'changed';
      throw new Error('secret callback error');
    } });
    const cancelSecond = f.provider.subscribe({ resource: 'posts', callback: event => events.push(event) });
    await flush();
    f.instance().emit('postgres_changes', postgres());
    expect(events[0]?.payload['nested']).toEqual({ count: 1 });
    expect(f.codes()).toEqual(['CALLBACK_FAILED']);
    expect(f.client.channel).toHaveBeenCalledTimes(1);
    expect(f.instance().subscribe).toHaveBeenCalledTimes(1);
    cancelFirst();
    expect(f.client.removeChannel).not.toHaveBeenCalled();
    cancelSecond();
    await flush();
  });

  test('keeps identical callback registrations independent and cancellation idempotent', async () => {
    const f = fixture();
    const callback = mock((_event: LiveEvent) => {});
    const first = f.provider.subscribe({ resource: 'posts', callback });
    const second = f.provider.subscribe({ resource: 'posts', callback });
    await flush();
    f.instance().emit('broadcast', broadcast());
    expect(callback).toHaveBeenCalledTimes(2);
    first();
    first();
    f.instance().emit('broadcast', broadcast());
    expect(callback).toHaveBeenCalledTimes(3);
    second();
    f.instance().emit('broadcast', broadcast());
    await flush();
    expect(callback).toHaveBeenCalledTimes(3);
    expect(f.client.removeChannel).toHaveBeenCalledTimes(1);
  });

  test('cancels before channel creation without opening a socket', async () => {
    const f = fixture();
    const cancel = f.provider.subscribe({ resource: 'posts', callback: () => {} });
    cancel();
    await flush();
    expect(f.client.channel).not.toHaveBeenCalled();
    expect(f.client.removeChannel).not.toHaveBeenCalled();
  });

  test('waits for retiring channels before subscribing again to the same SDK topic', async () => {
    const f = fixture();
    const removal = deferred();
    f.client.removeChannel.mockImplementation(() => removal.promise);
    const cancel = f.provider.subscribe({ resource: 'posts', callback: () => {} });
    await flush();
    cancel();
    const callback = mock((_event: LiveEvent) => {});
    const next = f.provider.subscribe({ resource: 'posts', callback });
    await flush();
    expect(f.client.channel).toHaveBeenCalledTimes(1);
    f.instance().emit('broadcast', broadcast());
    expect(callback).not.toHaveBeenCalled();
    removal.resolve('ok');
    await flush();
    expect(f.client.channel).toHaveBeenCalledTimes(2);
    f.instance(1).emit('broadcast', broadcast());
    expect(callback).toHaveBeenCalledTimes(1);
    next();
    await flush();
  });

  test('rejects invalid resources and publish inputs before SDK dispatch', () => {
    const f = fixture();
    expect(() => f.provider.subscribe({ resource: '../posts', callback: () => {} })).toThrow('invalid input');
    const publish = requireValue(f.provider.publish);
    expect(() => publish({ type: 'INSERT', resource: 'posts', payload: { value: undefined } })).toThrow('invalid input');
    let reads = 0;
    expect(() => publish({ type: 'UPDATE', resource: 'posts', get payload() { reads++; return {}; } })).toThrow('invalid input');
    expect(reads).toBe(0);
    expect(f.client.channel).not.toHaveBeenCalled();
  });

  test('publishes a snapshot on the same topic and removes publish-only channels', async () => {
    const f = fixture();
    const event: LiveEvent = { type: 'INSERT', resource: 'posts', payload: { count: 1 } };
    requireValue(f.provider.publish)(event);
    event.payload['count'] = 2;
    await flush();
    expect(f.instance().send).toHaveBeenCalledWith({
      type: 'broadcast', event: 'live-event', payload: { type: 'INSERT', resource: 'posts', payload: { count: 1 } },
    });
    expect(f.instance().subscribe).not.toHaveBeenCalled();
    expect(f.client.channel).toHaveBeenCalledWith('live-posts', { config: { broadcast: { ack: true } } });
    expect(f.client.removeChannel).toHaveBeenCalledTimes(1);
  });

  test('retains a shared channel until an in-flight publish settles after cancellation', async () => {
    const f = fixture();
    const cancel = f.provider.subscribe({ resource: 'posts', callback: () => {} });
    await flush();
    const sent = deferred();
    f.instance().send.mockImplementation(() => sent.promise);
    requireValue(f.provider.publish)({ type: 'UPDATE', resource: 'posts', payload: {} });
    cancel();
    await flush();
    expect(f.client.removeChannel).not.toHaveBeenCalled();
    sent.resolve('ok');
    await flush();
    expect(f.client.removeChannel).toHaveBeenCalledTimes(1);
  });

  test('marks failed, rejected or malformed send receipts as unknown outcomes', async () => {
    for (const response of ['error', 'timed out', undefined, {}, true, 'ok']) {
      const f = fixture();
      const cancel = f.provider.subscribe({ resource: 'posts', callback: () => {} });
      await flush();
      f.instance().send.mockImplementation(async () => response);
      requireValue(f.provider.publish)({ type: 'UPDATE', resource: 'posts', payload: {} });
      await flush();
      expect(f.codes()).toEqual(response === 'ok' ? [] : ['PUBLISH_OUTCOME_UNKNOWN']);
      f.instance().send.mockImplementation(async () => { throw new Error('secret'); });
      requireValue(f.provider.publish)({ type: 'UPDATE', resource: 'posts', payload: {} });
      await flush();
      expect(f.codes().at(-1)).toBe('PUBLISH_OUTCOME_UNKNOWN');
      cancel();
      await flush();
    }
  });

  test('handles setup failures and releases partially configured channels', async () => {
    for (const phase of ['channel', 'on', 'subscribe']) {
      const f = fixture();
      const channel = new Channel();
      if (phase === 'channel') f.client.channel.mockImplementation(() => { throw new Error('secret'); });
      else f.client.channel.mockImplementation(() => channel);
      if (phase === 'on') channel.on.mockImplementation(() => { throw new Error('secret'); });
      if (phase === 'subscribe') channel.subscribe.mockImplementation(() => { throw new Error('secret'); });
      const cancel = f.provider.subscribe({ resource: 'posts', callback: () => {} });
      await flush();
      expect(f.codes()).toEqual(['SUBSCRIBE_FAILED']);
      expect(f.client.removeChannel).toHaveBeenCalledTimes(phase === 'channel' ? 0 : 1);
      cancel();
      await flush();
    }
  });

  test('handles cleanup failures and rejects invalid status callbacks', async () => {
    for (const response of [
      async () => 'error', async () => undefined,
      async (): Promise<unknown> => { throw new Error('secret'); },
    ]) {
      const f = fixture();
      f.client.removeChannel.mockImplementation(response);
      const cancel = f.provider.subscribe({ resource: 'posts', callback: () => {} });
      await flush();
      requireValue(f.instance().status)('unexpected');
      await flush();
      expect(f.codes()).toEqual(['SUBSCRIBE_FAILED', 'UNSUBSCRIBE_FAILED']);
      cancel();
      const next = f.provider.subscribe({ resource: 'posts', callback: () => {} });
      await flush();
      expect(f.client.channel).toHaveBeenCalledTimes(1);
      expect(f.codes()).toEqual(['SUBSCRIBE_FAILED', 'UNSUBSCRIBE_FAILED', 'SUBSCRIBE_FAILED']);
      next();
      await flush();
    }
  });

  test('reports asynchronous callback rejection without unhandled promises', async () => {
    const f = fixture();
    const cancel = f.provider.subscribe({
      resource: 'posts', callback: async () => { throw new Error('secret'); },
    });
    await flush();
    f.instance().emit('broadcast', broadcast());
    await flush();
    expect(f.codes()).toEqual(['CALLBACK_FAILED']);
    cancel();
    await flush();
  });

  test('serializes publish-only requests through the real SDK HTTP transport', async () => {
    const request = mock(async (_url: RequestInfo | URL, _options?: RequestInit) => new Response(null, { status: 200 }));
    const client = createClient('https://supabase.example', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: Object.assign(request, { preconnect: () => {} }) },
      realtime: { logger: () => {} },
    });
    const onError = mock((_error: SupabaseLiveError) => {});
    const provider = createSupabaseLiveProvider(client, { onError });
    requireValue(provider.publish)({ type: 'UPDATE', resource: 'posts', payload: { id: 1 } });
    await flush();
    const [url, options] = requireValue(request.mock.calls[0]);
    expect(String(url)).toContain('/realtime/v1/api/broadcast');
    expect(options?.body).toBe(JSON.stringify({
      messages: [{
        topic: 'live-posts', event: 'live-event',
        payload: { type: 'UPDATE', resource: 'posts', payload: { id: 1 } }, private: false,
      }],
    }));
    await flush();
    expect(onError).not.toHaveBeenCalled();
    expect(client.getChannels()).toHaveLength(0);
  });

  test('works with actual SDK channel bindings, topic reuse and channel removal', async () => {
    const client = createClient('https://supabase.example', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const channel = client.channel('live-posts', { config: { broadcast: { ack: true } } });
    channel.subscribe = () => channel;
    const provider = createSupabaseLiveProvider(client);
    const events: LiveEvent[] = [];
    const cancel = provider.subscribe({ resource: 'posts', callback: event => events.push(event) });
    await flush();
    requireValue(channel.bindings['postgres_changes']?.[0]).callback(postgres('DELETE'), undefined, 'test-join');
    requireValue(channel.bindings['broadcast']?.[0]).callback(broadcast(), undefined, 'test-join');
    expect(events).toEqual([
      { type: 'DELETE', resource: 'posts', payload: { id: 1 } },
      { type: 'UPDATE', resource: 'posts', payload: { id: 1 } },
    ]);
    expect(client.getChannels()).toHaveLength(1);
    cancel();
    await flush();
    expect(client.getChannels()).toHaveLength(0);
  });
});
