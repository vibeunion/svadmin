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

export function createPusherLiveProvider(
  pusher: PusherClientLike,
  options: PusherLiveOptions = {},
): LiveProvider {
  const prefix = options.channelPrefix ?? 'svadmin';

  return {
    subscribe({ resource, callback }): () => void {
      const channelName = `${prefix}-${resource}`;
      const channel = pusher.subscribe(channelName);

      const handler = (type: 'created' | 'updated' | 'deleted') => (data: unknown) => {
        const payload = data && typeof data === 'object' ? data : {};
        const event: LiveEvent = {
          channel: channelName,
          type,
          payload: {
            ids: 'id' in payload && payload.id !== undefined ? [String(payload.id)] : [],
            data: payload as Record<string, unknown>,
          },
          date: new Date(),
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
      const channelName = event.channel;
      pusher.trigger(channelName, event.type, event.payload);
    },
  };
}
