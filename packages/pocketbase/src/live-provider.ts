import { Type, type Static } from '@sinclair/typebox';
import type { LiveProvider, LiveEvent } from '@svadmin/core';
import { collectionName, decode, nonempty } from './boundary';

export interface PocketBaseRealtimeClient {
  collection(name: string): {
    subscribe(topic: string, callback: (event: unknown) => void): Promise<unknown>;
  };
}

type LiveErrorCode = 'INVALID_EVENT' | 'SUBSCRIBE_FAILED' | 'UNSUBSCRIBE_FAILED' | 'CALLBACK_FAILED';

export class PocketBaseLiveError extends Error {
  constructor(readonly code: LiveErrorCode) {
    super(`PocketBase realtime ${code.toLowerCase().replaceAll('_', ' ')}`);
    this.name = 'PocketBaseLiveError';
  }
}

export interface PocketBaseLiveOptions {
  pb: PocketBaseRealtimeClient;
  onError?: (error: PocketBaseLiveError) => void;
}

const eventSchema = Type.Object({
  action: Type.Union([Type.Literal('create'), Type.Literal('update'), Type.Literal('delete')]),
  record: Type.Object({ id: nonempty }),
}, { additionalProperties: false });

function mapAction(action: Static<typeof eventSchema>['action']): LiveEvent['type'] {
  switch (action) {
    case 'create': return 'INSERT';
    case 'update': return 'UPDATE';
    case 'delete': return 'DELETE';
  }
}

/** Each subscription owns the SDK-provided disposer, including cancellation during setup. */
export function createPocketBaseLiveProvider(options: PocketBaseLiveOptions): LiveProvider {
  const report = (code: LiveErrorCode): void => {
    const error = new PocketBaseLiveError(code);
    if (!options.onError) {
      console.error(error);
      return;
    }
    try {
      void Promise.resolve(options.onError(error)).catch(() => {
        console.error('PocketBase realtime error handler failed');
      });
    } catch {
      console.error('PocketBase realtime error handler failed');
    }
  };

  return {
    subscribe({ resource, callback }) {
      const name = decode(collectionName, resource, 'input');
      let active = true;
      let dispose: (() => unknown) | undefined;
      let disposed = false;
      const cleanup = (): void => {
        if (!dispose || disposed) return;
        disposed = true;
        try {
          const result = dispose();
          void Promise.resolve(result).catch(() => report('UNSUBSCRIBE_FAILED'));
        } catch {
          report('UNSUBSCRIBE_FAILED');
        }
      };
      const handler = (value: unknown): void => {
        if (!active) return;
        let event: LiveEvent;
        try {
          const data = decode(eventSchema, value, 'event');
          event = { type: mapAction(data.action), resource: name, payload: data.record };
        } catch {
          report('INVALID_EVENT');
          return;
        }
        try {
          void Promise.resolve(callback(event)).catch(() => report('CALLBACK_FAILED'));
        } catch {
          report('CALLBACK_FAILED');
        }
      };
      try {
        const result = options.pb.collection(name).subscribe('*', handler);
        void Promise.resolve(result).then((unsubscribe: unknown) => {
          if (typeof unsubscribe !== 'function') {
            active = false;
            report('SUBSCRIBE_FAILED');
            return;
          }
          dispose = (): unknown => unsubscribe();
          if (!active) cleanup();
        }, () => {
          const wasActive = active;
          active = false;
          if (wasActive) report('SUBSCRIBE_FAILED');
        });
      } catch {
        active = false;
        report('SUBSCRIBE_FAILED');
      }
      return () => {
        active = false;
        cleanup();
      };
    },
  };
}
