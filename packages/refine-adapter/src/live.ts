/**
 * Refine LiveProvider → svadmin LiveProvider.
 *
 * Refine emits `created | updated | deleted` while svadmin uses
 * `INSERT | UPDATE | DELETE`. Channels map to svadmin resources.
 */
import type { LiveEvent, LiveProvider } from '@svadmin/core';
import { snapshotLiveEvent } from '@svadmin/core/contracts';

type RefineEventType = 'created' | 'updated' | 'deleted' | string;
type RefineLiveEvent = {
  type: RefineEventType;
  channel: string;
  payload?: unknown;
  date?: Date | string;
};
type RefineLiveSource = {
  subscribe: (params: {
    channel: string;
    types?: RefineEventType[];
    params?: Record<string, unknown>;
    callback: (event: RefineLiveEvent) => void;
    onError?: (error: unknown) => void;
  }) => unknown;
  unsubscribe?: (params: { channel: string; params?: Record<string, unknown> }) => void;
  publish?: (event: RefineLiveEvent) => unknown;
};

const toEventType: Record<string, LiveEvent['type']> = {
  created: 'INSERT', updated: 'UPDATE', deleted: 'DELETE',
  INSERT: 'INSERT', UPDATE: 'UPDATE', DELETE: 'DELETE',
};
const fromEventType: Record<LiveEvent['type'], RefineEventType> = {
  INSERT: 'created', UPDATE: 'updated', DELETE: 'deleted',
};

function toLiveEvent(event: RefineLiveEvent, resource: string): LiveEvent | undefined {
  const type = toEventType[String(event.type)];
  if (!type) return undefined;
  const payload = typeof event.payload === 'object' && event.payload !== null
    ? event.payload as Record<string, unknown>
    : {};
  return snapshotLiveEvent({ type, resource, payload });
}

export function createRefineLiveAdapter(source: unknown): LiveProvider {
  if (typeof source !== 'object' || source === null || typeof (source as RefineLiveSource).subscribe !== 'function') {
    throw new TypeError('createRefineLiveAdapter: expected a subscribe() method');
  }
  const input = source as RefineLiveSource;
  return {
    subscribe: ({ resource, liveParams, callback }) => {
      const dispose = input.subscribe.call(input, {
        channel: resource,
        ...(liveParams === undefined ? {} : { params: liveParams }),
        callback: (event) => {
          if (typeof event !== 'object' || event === null) return;
          const decoded = toLiveEvent(event, resource);
          if (decoded) callback(decoded);
        },
      });
      return typeof dispose === 'function' ? dispose as () => void : () => {};
    },
    ...(typeof input.unsubscribe === 'function' ? {
      unsubscribe: (params: { resource: string; liveParams?: Record<string, unknown> }) => {
        input.unsubscribe?.call(input, {
          channel: params.resource,
          ...(params.liveParams === undefined ? {} : { params: params.liveParams }),
        });
      },
    } : {}),
    ...(typeof input.publish === 'function' ? {
      publish: (event: LiveEvent) => {
        const checked = snapshotLiveEvent(event);
        if (!checked) throw new TypeError('Invalid live event');
        void input.publish?.call(input, {
          channel: checked.resource,
          type: fromEventType[checked.type],
          payload: checked.payload,
          date: new Date(),
        });
      },
    } : {}),
  };
}