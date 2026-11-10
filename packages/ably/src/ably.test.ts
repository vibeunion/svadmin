import { describe, it, expect, mock } from 'bun:test';
import type { LiveEvent } from '@svadmin/core';
import {
  createAblyLiveProvider,
  type AblyRealtimeClientLike,
  type AblyChannelLike,
  type AblyMessageLike,
  type AblyMessageListener,
} from './ably-live-provider.js';

function createMockAblyClient() {
  const listeners = new Map<string, Set<AblyMessageListener>>();
  const published = new Map<string, Array<{ name: string; data: unknown }>>();

  const getChannel = (channelName: string): AblyChannelLike => {
    if (!listeners.has(channelName)) {
      listeners.set(channelName, new Set());
    }
    if (!published.has(channelName)) {
      published.set(channelName, []);
    }

    return {
      subscribe(
        nameOrListener: string | AblyMessageListener,
        listener?: AblyMessageListener,
      ) {
        const fn = typeof nameOrListener === 'function' ? nameOrListener : listener;
        const set = listeners.get(channelName);
        if (fn && set) {
          set.add(fn);
        }
      },
      unsubscribe(
        nameOrListener?: string | AblyMessageListener,
        listener?: AblyMessageListener,
      ) {
        const fn = typeof nameOrListener === 'function' ? nameOrListener : listener;
        const set = listeners.get(channelName);
        if (set) {
          if (fn) {
            set.delete(fn);
          } else {
            set.clear();
          }
        }
      },
      publish(name: string, data: unknown) {
        const list = published.get(channelName);
        if (list) {
          list.push({ name, data });
        }
      },
    };
  };

  const client: AblyRealtimeClientLike = {
    channels: {
      get: mock((name: string) => getChannel(name)),
    },
  };

  const emit = (channelName: string, message: AblyMessageLike) => {
    const set = listeners.get(channelName);
    if (set) {
      for (const listener of set) {
        listener(message);
      }
    }
  };

  return { client, listeners, published, emit };
}

describe('@svadmin/ably live provider adapter', () => {
  it('subscribes to channel and dispatches mapped LiveEvent', () => {
    const { client, emit } = createMockAblyClient();
    const provider = createAblyLiveProvider(client);

    const received: LiveEvent[] = [];
    const unsubscribe = provider.subscribe({
      resource: 'posts',
      callback: (event) => received.push(event),
    });

    expect(client.channels.get).toHaveBeenCalledWith('resources:posts');

    emit('resources:posts', {
      name: 'create',
      data: { id: 101, title: 'Realtime Architecture' },
    });

    expect(received.length).toBe(1);
    expect(received[0]).toEqual({
      type: 'INSERT',
      resource: 'posts',
      payload: { id: 101, title: 'Realtime Architecture' },
    });

    unsubscribe();
  });

  it('correctly maps update and delete actions', () => {
    const { client, emit } = createMockAblyClient();
    const provider = createAblyLiveProvider(client);

    const received: LiveEvent[] = [];
    provider.subscribe({
      resource: 'users',
      callback: (event) => received.push(event),
    });

    emit('resources:users', {
      name: 'updated',
      data: { id: 'u-1', status: 'active' },
    });
    emit('resources:users', {
      name: 'delete',
      data: { id: 'u-2' },
    });

    expect(received.length).toBe(2);
    expect(received[0]?.type).toBe('UPDATE');
    expect(received[1]?.type).toBe('DELETE');
  });

  it('unwraps typed payload envelopes without removing other subscribers', () => {
    const { client, emit } = createMockAblyClient();
    const provider = createAblyLiveProvider(client);
    const first: LiveEvent[] = [];
    const second: LiveEvent[] = [];
    provider.subscribe({ resource: 'posts', callback: (event) => first.push(event) });
    provider.subscribe({ resource: 'posts', callback: (event) => second.push(event) });

    emit('resources:posts', { data: { type: 'created', payload: { id: 'p-1' } } });
    expect(first[0]?.payload).toEqual({ id: 'p-1' });
    expect(second[0]?.payload).toEqual({ id: 'p-1' });

    provider.unsubscribe?.({ resource: 'posts' });
    expect(client.channels.get('resources:posts')).toBeDefined();
  });

  it('maps event names carried by an envelope', () => {
    const { client, emit } = createMockAblyClient();
    const provider = createAblyLiveProvider(client);
    const received: LiveEvent[] = [];

    provider.subscribe({ resource: 'posts', callback: (event) => received.push(event) });
    emit('resources:posts', { data: { event: 'deleted', payload: { id: 'p-2' } } });

    expect(received[0]).toEqual({ type: 'DELETE', resource: 'posts', payload: { id: 'p-2' } });
  });

  it('unsubscribes cleanly via returned callback and explicit unsubscribe method', () => {
    const { client, listeners, emit } = createMockAblyClient();
    const provider = createAblyLiveProvider(client);

    let count = 0;
    const unsub = provider.subscribe({
      resource: 'orders',
      callback: () => count++,
    });

    expect(listeners.get('resources:orders')?.size).toBe(1);

    emit('resources:orders', { name: 'created', data: { id: 'ord-1' } });
    expect(count).toBe(1);

    unsub();
    expect(listeners.get('resources:orders')?.size).toBe(0);

    emit('resources:orders', { name: 'created', data: { id: 'ord-2' } });
    expect(count).toBe(1);

    // Explicit unsubscribe
    provider.subscribe({
      resource: 'orders',
      callback: () => count++,
    });
    expect(listeners.get('resources:orders')?.size).toBe(1);
    provider.unsubscribe?.({ resource: 'orders' });
    expect(listeners.get('resources:orders')?.size).toBe(0);
  });

  it('publishes events to target resource channel', () => {
    const { client, published } = createMockAblyClient();
    const provider = createAblyLiveProvider(client);

    provider.publish?.({
      type: 'INSERT',
      resource: 'notifications',
      payload: { message: 'System alert' },
    });

    const channelHistory = published.get('resources:notifications');
    expect(channelHistory).toBeDefined();
    expect(channelHistory?.length).toBe(1);
    expect(channelHistory?.[0]).toEqual({
      name: 'INSERT',
      data: { message: 'System alert' },
    });
  });

  it('supports custom channel prefix and channelName resolver', () => {
    const { client } = createMockAblyClient();
    const provider = createAblyLiveProvider(client, {
      channelPrefix: 'tenant-42',
      channelName: (resource, liveParams) =>
        `custom:${resource}:${String(liveParams?.['tenantId'] ?? 'default')}`,
    });

    provider.subscribe({
      resource: 'audit_logs',
      liveParams: { tenantId: 'enterprise-org' },
      callback: () => {},
    });

    expect(client.channels.get).toHaveBeenCalledWith('custom:audit_logs:enterprise-org');
  });
});
