import { describe, expect, it } from 'bun:test';
import { createPusherLiveProvider, type PusherClientLike, type PusherChannelLike } from './pusher-live-provider';
import type { LiveEvent } from '@svadmin/core';

describe('@svadmin/pusher LiveProvider', () => {
  it('subscribes to resource channels and formats live events', () => {
    const boundEvents = new Map<string, (data: unknown) => void>();
    let subscribedChannel = '';
    let unsubscribedChannel = '';

    const mockChannel: PusherChannelLike = {
      bind: (event, cb) => {
        boundEvents.set(event, cb);
      },
      unbind: (event) => {
        boundEvents.delete(event);
      },
    };

    const mockPusher: PusherClientLike = {
      subscribe: (channelName) => {
        subscribedChannel = channelName;
        return mockChannel;
      },
      unsubscribe: (channelName) => {
        unsubscribedChannel = channelName;
      },
    };

    const liveProvider = createPusherLiveProvider(mockPusher, { channelPrefix: 'app' });

    let receivedEvent: LiveEvent | null = null;
    const unsubscribe = liveProvider.subscribe({
      resource: 'posts',
      callback: (event) => {
        receivedEvent = event;
      },
    });

    expect(subscribedChannel).toBe('app-posts');
    expect(boundEvents.has('created')).toBe(true);
    expect(boundEvents.has('updated')).toBe(true);
    expect(boundEvents.has('deleted')).toBe(true);

    // Trigger an update event
    boundEvents.get('updated')?.({ id: 101, title: 'Realtime Title' });

    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent?.type).toBe('updated');
    expect(receivedEvent?.payload.ids).toEqual(['101']);
    expect(receivedEvent?.payload.data.title).toBe('Realtime Title');

    // Unsubscribe
    unsubscribe();
    expect(unsubscribedChannel).toBe('app-posts');
    expect(boundEvents.size).toBe(0);
  });
});
