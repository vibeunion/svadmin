import type { LiveProvider, LiveEvent } from '@svadmin/core';

export interface PusherChannelLike {
  bind: (eventName: string, callback: (data: unknown) => void) => void;
  unbind: (eventName: string, callback?: (data: unknown) => void) => void;
  unbind_all?: () => void;
}

export interface PusherClientLike {
  subscribe: (channelName: string) => PusherChannelLike;
  unsubscribe: (channelName: string) => void;
  trigger?: (channelName: string, eventName: string, data: unknown) => void;
  connection?: {
    bind: (event: string, callback: () => void) => void;
    unbind: (event: string, callback?: () => void) => void;
  };
}

export interface PusherLiveOptions {
  channelPrefix?: string;
}

type PusherEventType = 'created' | 'updated' | 'deleted';
const eventTypes: Record<PusherEventType, LiveEvent['type']> = {
  created: 'INSERT',
  updated: 'UPDATE',
  deleted: 'DELETE',
};
const pusherEventTypes: Record<LiveEvent['type'], PusherEventType> = {
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

export function createPusherLiveProvider(
  pusher: PusherClientLike,
  options: PusherLiveOptions = {},
): LiveProvider {
  const prefix = options.channelPrefix ?? 'svadmin';

  return {
    subscribe({ resource, callback }): () => void {
      const channelName = `${prefix}-${resource}`;
      const channel = pusher.subscribe(channelName);

      const handler = (type: PusherEventType) => (data: unknown) => {
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

      channel.bind('created', handleCreated);
      channel.bind('updated', handleUpdated);
      channel.bind('deleted', handleDeleted);

      return () => {
        channel.unbind('created', handleCreated);
        channel.unbind('updated', handleUpdated);
        channel.unbind('deleted', handleDeleted);
        pusher.unsubscribe(channelName);
      };
    },

    unsubscribe({ resource }): void {
      const channelName = `${prefix}-${resource}`;
      pusher.unsubscribe(channelName);
    },

    publish(event: LiveEvent): void {
      if (!pusher.trigger) return;
      const channelName = `${prefix}-${event.resource}`;
      pusher.trigger(channelName, pusherEventTypes[event.type], event.payload);
    },
  };
}
