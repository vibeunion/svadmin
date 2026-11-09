import { describe, expect, it, mock } from 'bun:test';
import { createSocketIOLiveProvider, type SocketLike } from './index.js';
import type { LiveEvent } from '@svadmin/core';

describe('createSocketIOLiveProvider', () => {
  function createMockSocket(): {
    socket: SocketLike;
    listeners: Map<string, Array<(...args: unknown[]) => void>>;
    emitted: Array<{ event: string; args: unknown[] }>;
  } {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const emitted: Array<{ event: string; args: unknown[] }> = [];

    const socket: SocketLike = {
      connected: true,
      on: mock((event: string, callback: (...args: unknown[]) => void) => {
        const list = listeners.get(event) ?? [];
        list.push(callback);
        listeners.set(event, list);
      }),
      off: mock((event: string, callback?: (...args: unknown[]) => void) => {
        if (!callback) {
          listeners.delete(event);
          return;
        }
        const list = listeners.get(event) ?? [];
        listeners.set(event, list.filter(cb => cb !== callback));
      }),
      emit: mock((event: string, ...args: unknown[]) => {
        emitted.push({ event, args });
      }),
    };

    return { socket, listeners, emitted };
  }

  it('subscribes and maps created events to INSERT LiveEvent', () => {
    const { socket, listeners } = createMockSocket();
    const provider = createSocketIOLiveProvider(socket);
    const received: LiveEvent[] = [];

    const unsubscribe = provider.subscribe({
      resource: 'posts',
      callback: (event) => received.push(event),
    });

    const handlers = listeners.get('svadmin:posts:created') ?? [];
    expect(handlers.length).toBeGreaterThan(0);

    // Trigger event
    handlers[0]?.({ id: '101', title: 'New Post' });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      type: 'INSERT',
      resource: 'posts',
      payload: { id: '101', title: 'New Post' },
    });

    unsubscribe?.();
    expect(socket.off).toHaveBeenCalled();
  });

  it('subscribes with rooms and emits join/leave signals', () => {
    const { socket, emitted } = createMockSocket();
    const provider = createSocketIOLiveProvider(socket, { useRooms: true });

    const unsubscribe = provider.subscribe({
      resource: 'users',
      callback: () => {},
    });

    expect(emitted).toContainEqual({
      event: 'join',
      args: [{ channel: 'svadmin:users', resource: 'users' }],
    });

    unsubscribe?.();

    expect(emitted).toContainEqual({
      event: 'leave',
      args: [{ channel: 'svadmin:users', resource: 'users' }],
    });
  });

  it('keeps a room joined until its last subscription is released', () => {
    const { socket, emitted } = createMockSocket();
    const provider = createSocketIOLiveProvider(socket, { useRooms: true });

    const first = provider.subscribe({ resource: 'users', callback: () => {} });
    const second = provider.subscribe({ resource: 'users', callback: () => {} });

    expect(emitted.filter(item => item.event === 'join')).toHaveLength(1);
    first();
    expect(emitted.filter(item => item.event === 'leave')).toHaveLength(0);
    second();
    expect(emitted.filter(item => item.event === 'leave')).toHaveLength(1);
  });

  it('removes all listeners when unsubscribe is called directly', () => {
    const { socket, listeners } = createMockSocket();
    const provider = createSocketIOLiveProvider(socket);

    provider.subscribe({ resource: 'users', callback: () => {} });
    provider.unsubscribe?.({ resource: 'users' });

    expect([...listeners.values()].flat()).toHaveLength(0);
  });

  it('only listens to direct event names when explicitly enabled', () => {
    const defaultSocket = createMockSocket();
    createSocketIOLiveProvider(defaultSocket.socket).subscribe({ resource: 'users', callback: () => {} });
    expect(defaultSocket.listeners.has('users:created')).toBe(false);

    const directSocket = createMockSocket();
    createSocketIOLiveProvider(directSocket.socket, { listenToDirectEvents: true }).subscribe({ resource: 'users', callback: () => {} });
    expect(directSocket.listeners.has('users:created')).toBe(true);
  });

  it('publishes LiveEvent via socket emit', () => {
    const { socket, emitted } = createMockSocket();
    const provider = createSocketIOLiveProvider(socket, { channelPrefix: 'custom-app' });

    provider.publish?.({
      type: 'UPDATE',
      resource: 'orders',
      payload: { id: 'order_1', status: 'shipped' },
    });

    expect(emitted).toContainEqual({
      event: 'custom-app:orders:updated',
      args: [{ id: 'order_1', status: 'shipped' }],
    });
  });
});
