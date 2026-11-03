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

    const received = { event: undefined as LiveEvent | undefined };
    const unsubscribe = liveProvider.subscribe({
      resource: 'posts',
      callback: (event) => {
        received.event = event;
      },
    });

    expect(subscribedChannel).toBe('app-posts');
    expect(boundEvents.has('created')).toBe(true);
    expect(boundEvents.has('updated')).toBe(true);
    expect(boundEvents.has('deleted')).toBe(true);

    // Trigger an update event
    boundEvents.get('updated')?.({ id: 101, title: 'Realtime Title' });

    expect(received.event).not.toBeUndefined();
    const receivedEvent = received.event;
    if (receivedEvent === undefined) throw new Error('Expected a live event');
    expect(receivedEvent.type).toBe('UPDATE');
    expect(receivedEvent.resource).toBe('posts');
    expect(receivedEvent.payload['id']).toBe(101);
    expect(receivedEvent.payload['title']).toBe('Realtime Title');

    // Unsubscribe
    unsubscribe();
    expect(unsubscribedChannel).toBe('app-posts');
    expect(boundEvents.size).toBe(0);
  });
});
