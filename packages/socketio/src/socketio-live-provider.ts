import type { LiveProvider, LiveEvent } from '@svadmin/core';

export interface SocketLike {
  connected?: boolean;
  on: (event: string, callback: (...args: unknown[]) => void) => unknown;
  off: (event: string, callback?: (...args: unknown[]) => void) => unknown;
  emit: (event: string, ...args: unknown[]) => unknown;
}

export interface SocketIOLiveOptions {
  /** Channel or event prefix, defaults to 'svadmin' */
  channelPrefix?: string;
  /** Whether to emit join/leave room signals to the server. Defaults to false */
  useRooms?: boolean;
  /** Room join event name. Defaults to 'join' */
  joinEvent?: string;
  /** Room leave event name. Defaults to 'leave' */
  leaveEvent?: string;
  /** Listen to unprefixed resource events too. Defaults to false. */
  listenToDirectEvents?: boolean;
}

type SocketEventType = 'created' | 'updated' | 'deleted';
const eventTypes: Record<SocketEventType, LiveEvent['type']> = {
  created: 'INSERT',
  updated: 'UPDATE',
  deleted: 'DELETE',
};
const socketEventTypes: Record<LiveEvent['type'], SocketEventType> = {
  INSERT: 'created',
  UPDATE: 'updated',
  DELETE: 'deleted',
};

function toPayload(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return { value: data };
}

export function createSocketIOLiveProvider(
  socket: SocketLike,
  options: SocketIOLiveOptions = {},
): LiveProvider {
  const prefix = options.channelPrefix ?? 'svadmin';
  const useRooms = options.useRooms ?? false;
  const joinEvent = options.joinEvent ?? 'join';
  const leaveEvent = options.leaveEvent ?? 'leave';
  const listenToDirectEvents = options.listenToDirectEvents ?? false;
  const subscriptions = new Map<string, Set<() => void>>();

  return {
    subscribe({ resource, callback }): () => void {
      const roomName = `${prefix}:${resource}`;
      const resourceSubscriptions = subscriptions.get(roomName) ?? new Set<() => void>();

      if (useRooms && resourceSubscriptions.size === 0) {
        socket.emit(joinEvent, { channel: roomName, resource });
      }

      const handler = (type: SocketEventType) => (data: unknown) => {
        const event: LiveEvent = {
          type: eventTypes[type],
          resource,
          payload: toPayload(data),
        };
        callback(event);
      };

      const handleCreated = handler('created');
      const handleUpdated = handler('updated');
      const handleDeleted = handler('deleted');

      const names = [
        { type: 'created' as const, fn: handleCreated },
        { type: 'updated' as const, fn: handleUpdated },
        { type: 'deleted' as const, fn: handleDeleted },
      ];

      for (const item of names) {
        socket.on(`${prefix}:${resource}:${item.type}`, item.fn);
        if (listenToDirectEvents) socket.on(`${resource}:${item.type}`, item.fn);
      }

      let active = true;
      const cleanup = () => {
        if (!active) return;
        active = false;
        for (const item of names) {
          socket.off(`${prefix}:${resource}:${item.type}`, item.fn);
          if (listenToDirectEvents) socket.off(`${resource}:${item.type}`, item.fn);
        }
        resourceSubscriptions.delete(cleanup);
        if (resourceSubscriptions.size === 0) {
          subscriptions.delete(roomName);
        }
        if (useRooms && resourceSubscriptions.size === 0) {
          socket.emit(leaveEvent, { channel: roomName, resource });
        }
      };
      resourceSubscriptions.add(cleanup);
      subscriptions.set(roomName, resourceSubscriptions);
      return cleanup;
    },

    unsubscribe({ resource }): void {
      const roomName = `${prefix}:${resource}`;
      for (const cleanup of [...(subscriptions.get(roomName) ?? [])]) cleanup();
    },

    publish(event: LiveEvent): void {
      const type = socketEventTypes[event.type] ?? 'updated';
      const eventName = `${prefix}:${event.resource}:${type}`;
      socket.emit(eventName, event.payload);
    },
  };
}
