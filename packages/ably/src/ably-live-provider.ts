import type { LiveProvider, LiveEvent } from '@svadmin/core';

export interface AblyMessageLike {
  name?: string;
  data: unknown;
  id?: string;
  clientId?: string;
  timestamp?: number;
}

export type AblyMessageListener = (message: AblyMessageLike) => void;

export interface AblyChannelLike {
  subscribe(listener: AblyMessageListener): Promise<void> | void;
  subscribe(name: string, listener: AblyMessageListener): Promise<void> | void;
  unsubscribe(listener?: AblyMessageListener): Promise<void> | void;
  unsubscribe(name?: string, listener?: AblyMessageListener): Promise<void> | void;
  publish(name: string, data: unknown): Promise<void> | void;
}

export interface AblyRealtimeClientLike {
  channels: {
    get(name: string): AblyChannelLike;
    release?(name: string): void;
  };
  connection?: {
    state?: string;
    on?(event: string, listener: () => void): void;
    off?(event: string, listener: () => void): void;
  };
}

export interface AblyLiveProviderOptions {
  /**
   * Channel prefix prepended to resource names.
   * Defaults to 'resources'.
   * Resulting channel name: `${channelPrefix}:${resource}`.
   */
  channelPrefix?: string;

  /**
   * Custom function to resolve channel name from resource and liveParams.
   */
  channelName?: (resource: string, liveParams?: Record<string, unknown>) => string;
}

type LiveActionType = LiveEvent['type'];

const actionTypeMap: Record<string, LiveActionType> = {
  create: 'INSERT',
  created: 'INSERT',
  insert: 'INSERT',
  'create-record': 'INSERT',
  update: 'UPDATE',
  updated: 'UPDATE',
  patch: 'UPDATE',
  delete: 'DELETE',
  deleted: 'DELETE',
  remove: 'DELETE',
};

function normalizeEventPayload(data: unknown): Record<string, unknown> {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const envelope = data as Record<string, unknown>;
    if ('payload' in envelope && ('type' in envelope || 'event' in envelope || 'name' in envelope)) {
      return normalizeEventPayload(envelope['payload']);
    }
    return envelope;
  }
  return { value: data };
}

function mapEventType(value: unknown): LiveActionType | undefined {
  if (typeof value !== 'string') return undefined;
  return actionTypeMap[value.toLowerCase()];
}

function resolveEventType(name: string | undefined, data: unknown): LiveActionType {
  const mappedName = mapEventType(name);
  if (mappedName) return mappedName;

  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const envelope = data as Record<string, unknown>;
    for (const key of ['type', 'event', 'name']) {
      const mapped = mapEventType(envelope[key]);
      if (mapped) return mapped;
    }
  }
  return 'UPDATE';
}

/**
 * Creates an Ably Pub/Sub LiveProvider adapter for svadmin.
 * Connects resource subscriptions directly to Ably channels.
 */
export function createAblyLiveProvider(
  client: AblyRealtimeClientLike,
  options: AblyLiveProviderOptions = {},
): LiveProvider {
  const channelPrefix = options.channelPrefix ?? 'resources';
  const listenersByChannel = new Map<string, Set<AblyMessageListener>>();

  function getChannelName(resource: string, liveParams?: Record<string, unknown>): string {
    if (options.channelName) {
      return options.channelName(resource, liveParams);
    }
    return `${channelPrefix}:${resource}`;
  }

  return {
    subscribe({ resource, liveParams, callback }): () => void {
      const channelName = getChannelName(resource, liveParams);
      const channel = client.channels.get(channelName);

      const listener: AblyMessageListener = (message: AblyMessageLike) => {
        const type = resolveEventType(message.name, message.data);
        const payload = normalizeEventPayload(message.data);

        const liveEvent: LiveEvent = {
          type,
          resource,
          payload,
        };

        callback(liveEvent);
      };

      void channel.subscribe(listener);
      const listeners = listenersByChannel.get(channelName) ?? new Set<AblyMessageListener>();
      listeners.add(listener);
      listenersByChannel.set(channelName, listeners);

      return () => {
        void channel.unsubscribe(listener);
        const current = listenersByChannel.get(channelName);
        current?.delete(listener);
        if (current && current.size === 0) listenersByChannel.delete(channelName);
      };
    },

    unsubscribe({ resource, liveParams }): void {
      const channelName = getChannelName(resource, liveParams);
      const channel = client.channels.get(channelName);
      const listeners = listenersByChannel.get(channelName);
      for (const listener of listeners ?? []) void channel.unsubscribe(listener);
      listenersByChannel.delete(channelName);
    },

    publish(event: LiveEvent): void {
      const channelName = getChannelName(event.resource);
      const channel = client.channels.get(channelName);
      void channel.publish(event.type, event.payload);
    },
  };
}
