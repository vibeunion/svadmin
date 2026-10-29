/**
 * Ably LiveProvider adapter.
 *
 * Pass an Ably Realtime client (or a compatible shape) so svadmin does not take
 * a dependency on `ably`. One channel is opened per resource.
 */
import type { LiveEvent, LiveProvider } from '../live.svelte';
import { createLiveSubscribers } from '../live-transport';
import { liveEventFrom } from './live-event';

export interface AblyMessage {
  name?: string;
  data?: unknown;
}

export interface AblyChannelLike {
  subscribe(callback: (message: AblyMessage) => void): unknown;
  unsubscribe?(callback: (message: AblyMessage) => void): void;
  publish?(name: string, data: unknown): unknown;
}

export interface AblyClientLike {
  channels: { get(name: string): AblyChannelLike };
}

export interface AblyAdapterOptions {
  /** Channel name; defaults to the svadmin resource. */
  channel?: (resource: string) => string;
}

export function createAblyLiveProvider(client: AblyClientLike, options: AblyAdapterOptions = {}): LiveProvider {
  if (typeof client !== 'object' || client === null || typeof client.channels?.get !== 'function') {
    throw new TypeError('Ably adapter requires a client with channels.get()');
  }
  const subscribers = createLiveSubscribers();
  const channelName = options.channel ?? ((resource: string) => resource);

  return {
    subscribe: ({ resource, callback }) => {
      const name = channelName(resource);
      const channel = client.channels.get(name);
      const entry = subscribers.add({ resource, callback });
      const listener = (message: AblyMessage) => {
        const event = liveEventFrom(message.data, resource, message.name);
        if (event) subscribers.notify(event, () => true);
      };
      void channel.subscribe(listener);
      return () => {
        entry.remove();
        channel.unsubscribe?.(listener);
      };
    },
    publish: (event: LiveEvent) => {
      const name = channelName(event.resource);
      void client.channels.get(name).publish?.(event.type, event.payload);
    },
  };
}