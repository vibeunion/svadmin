/**
 * GraphQL subscriptions LiveProvider adapter.
 *
 * Pass a `subscribe` function backed by graphql-ws, Apollo, or urql; svadmin
 * keeps the transport seam and validates every delivered event.
 */
import type { LiveEvent, LiveProvider } from '../live.svelte';
import { createLiveSubscribers } from '../live-transport';
import { liveEventFrom } from './live-event';

export interface GraphQLSubscriptionTransport {
  subscribe(
    params: { resource: string; liveParams?: Record<string, unknown> },
    callback: (value: unknown) => void,
    onError?: (error: unknown) => void,
  ): () => void;
  publish?(event: LiveEvent): unknown;
}

export function createGraphQLSubscriptionLiveProvider(transport: GraphQLSubscriptionTransport): LiveProvider {
  if (typeof transport !== 'object' || transport === null || typeof transport.subscribe !== 'function') {
    throw new TypeError('GraphQL subscriptions adapter requires a subscribe() transport');
  }
  const subscribers = createLiveSubscribers();

  return {
    subscribe: ({ resource, callback, liveParams }) => {
      const entry = subscribers.add({ resource, callback, ...(liveParams === undefined ? {} : { liveParams }) });
      const dispose = transport.subscribe(
        { resource, ...(liveParams === undefined ? {} : { liveParams }) },
        (value) => {
          const event = liveEventFrom(value, resource);
          if (event) subscribers.notify(event, () => true);
        },
      );
      return () => {
        entry.remove();
        dispose();
      };
    },
    ...(typeof transport.publish === 'function' ? {
      publish: (event: LiveEvent) => { void transport.publish?.(event); },
    } : {}),
  };
}
