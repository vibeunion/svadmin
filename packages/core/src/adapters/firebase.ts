/**
 * Firebase Realtime Database / Firestore LiveProvider adapter.
 *
 * Pass a transport that resolves a path and registers a listener, so svadmin
 * does not depend on the Firebase SDK. Values are expected to look like
 * `{ type: 'created' | 'updated' | 'deleted', payload }`.
 */
import type { LiveEvent, LiveProvider } from '../live.svelte';
import { createLiveSubscribers } from '../live-transport';
import { liveEventFrom } from './live-event';

export interface FirebaseLiveTransport {
  subscribe(path: string, callback: (value: unknown) => void, onError?: (error: unknown) => void): () => void;
  publish?(path: string, value: unknown): unknown;
}

export interface FirebaseAdapterOptions {
  /** Database path per resource; defaults to the resource name. */
  path?: (resource: string) => string;
}

export function createFirebaseLiveProvider(transport: FirebaseLiveTransport, options: FirebaseAdapterOptions = {}): LiveProvider {
  if (typeof transport !== 'object' || transport === null || typeof transport.subscribe !== 'function') {
    throw new TypeError('Firebase adapter requires a subscribe() transport');
  }
  const subscribers = createLiveSubscribers();
  const pathFor = options.path ?? ((resource: string) => resource);

  return {
    subscribe: ({ resource, callback, liveParams }) => {
      const path = pathFor(resource);
      const entry = subscribers.add({ resource, callback, ...(liveParams === undefined ? {} : { liveParams }) });
      const dispose = transport.subscribe(path, (value) => {
        const event = liveEventFrom(value, resource);
        if (event) subscribers.notify(event, () => true);
      });
      return () => {
        entry.remove();
        dispose();
      };
    },
    ...(typeof transport.publish === 'function' ? {
      publish: (event: LiveEvent) => { void transport.publish?.(pathFor(event.resource), event); },
    } : {}),
  };
}
