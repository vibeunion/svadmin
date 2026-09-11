import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { checkExact, snapshotPlainData } from '@svadmin/core/schema';
import type { LiveEvent, LiveProvider } from '@svadmin/core';

export interface SupabaseRealtimeChannel {
  on(type: 'postgres_changes', filter: { event: '*'; schema: 'public'; table: string }, callback: (payload: unknown) => void): unknown;
  on(type: 'broadcast', filter: { event: 'live-event' }, callback: (payload: unknown) => void): unknown;
  subscribe(callback: (status: unknown) => void): unknown;
  send(message: { type: 'broadcast'; event: 'live-event'; payload: LiveEvent }): Promise<unknown>;
}

export interface SupabaseRealtimeClient<C extends SupabaseRealtimeChannel> {
  channel(name: string, options: { config: { broadcast: { ack: true } } }): C;
  removeChannel(channel: C): Promise<unknown>;
}

type LiveErrorCode = 'INVALID_INPUT' | 'INVALID_EVENT' | 'SUBSCRIBE_FAILED' |
  'UNSUBSCRIBE_FAILED' | 'PUBLISH_OUTCOME_UNKNOWN' | 'CALLBACK_FAILED';

export class SupabaseLiveError extends Error {
  constructor(readonly code: LiveErrorCode) {
    super(`Supabase realtime ${code.toLowerCase().replaceAll('_', ' ')}`);
    this.name = 'SupabaseLiveError';
  }
}

export interface SupabaseLiveOptions {
  onError?: (error: SupabaseLiveError) => void;
}

const resourceSchema = Type.String({ minLength: 1, pattern: '^[A-Za-z0-9_]+$' });
const action = Type.Union([Type.Literal('INSERT'), Type.Literal('UPDATE'), Type.Literal('DELETE')]);
const record = Type.Record(Type.String(), Type.Unknown());
const eventSchema = Type.Object({
  type: action, resource: resourceSchema, payload: record,
}, { additionalProperties: false });
const broadcastSchema = Type.Object({
  type: Type.Literal('broadcast'), event: Type.Literal('live-event'), payload: eventSchema,
});
const postgresSchema = Type.Object({
  schema: Type.Literal('public'), table: resourceSchema, commit_timestamp: Type.String(),
  eventType: action, new: record, old: record,
  errors: Type.Union([Type.Null(), Type.Array(Type.String())]),
});

function decode<S extends TSchema>(schema: S, value: unknown, code: LiveErrorCode): Static<S> {
  try {
    const candidate = snapshotPlainData(value);
    if (checkExact(schema, candidate)) return candidate;
  } catch {
    // SDK callbacks and payload errors must not expose submitted data.
  }
  throw new SupabaseLiveError(code);
}

function postgresEvent(value: unknown, resource: string): LiveEvent {
  const event = decode(postgresSchema, value, 'INVALID_EVENT');
  if (event.table !== resource || event.errors?.length) throw new SupabaseLiveError('INVALID_EVENT');
  const payload = event.eventType === 'DELETE' ? event.old : event.new;
  if (Object.keys(payload).length === 0) throw new SupabaseLiveError('INVALID_EVENT');
  return { type: event.eventType, resource, payload };
}

interface Subscription {
  callback: (event: LiveEvent) => void;
}

interface ChannelState<C> {
  resource: string;
  listeners: Set<Subscription>;
  pending: number;
  retired: boolean;
  started: boolean;
  channel?: C;
  ready: Promise<C | undefined>;
}

/** All SDK data stays unknown until validated; one channel is owned per resource. */
export function createSupabaseLiveProvider<C extends SupabaseRealtimeChannel>(
  client: SupabaseRealtimeClient<C>, options: SupabaseLiveOptions = {},
): LiveProvider {
  const channels = new Map<string, ChannelState<C>>();
  const closing = new Map<string, Promise<void>>();
  const failedCleanup = new Set<string>();
  const report = (code: LiveErrorCode): void => {
    const error = new SupabaseLiveError(code);
    if (!options.onError) { console.error(error); return; }
    try {
      void Promise.resolve(options.onError(error)).catch(() => {
        console.error('Supabase realtime error handler failed');
      });
    }
    catch { console.error('Supabase realtime error handler failed'); }
  };

  function release(state: ChannelState<C>, force = false): void {
    if (state.retired || (!force && (state.listeners.size > 0 || state.pending > 0))) return;
    state.retired = true;
    if (channels.get(state.resource) === state) channels.delete(state.resource);
    const completion = state.ready.then(async () => {
      if (!state.channel) return;
      const receipt: unknown = await client.removeChannel(state.channel);
      if (receipt !== 'ok') throw new SupabaseLiveError('UNSUBSCRIBE_FAILED');
    }).catch(() => {
      failedCleanup.add(state.resource);
      report('UNSUBSCRIBE_FAILED');
    });
    closing.set(state.resource, completion);
    void completion.then(() => {
      if (closing.get(state.resource) === completion) closing.delete(state.resource);
    });
  }

  function deliver(state: ChannelState<C>, value: unknown, kind: 'postgres' | 'broadcast'): void {
    if (state.retired || state.listeners.size === 0) return;
    let event: LiveEvent;
    try {
      event = kind === 'postgres' ? postgresEvent(value, state.resource)
        : decode(broadcastSchema, value, 'INVALID_EVENT').payload;
      if (event.resource !== state.resource) throw new SupabaseLiveError('INVALID_EVENT');
    } catch {
      report('INVALID_EVENT');
      return;
    }
    // Each registration owns its lifetime and its copy, even with identical callbacks.
    for (const subscription of [...state.listeners]) {
      if (state.retired || !state.listeners.has(subscription)) continue;
      const copy = decode(eventSchema, event, 'INVALID_EVENT');
      try {
        void Promise.resolve(subscription.callback(copy)).catch(() => report('CALLBACK_FAILED'));
      }
      catch { report('CALLBACK_FAILED'); }
    }
  }

  function getChannel(resource: string): ChannelState<C> {
    const existing = channels.get(resource);
    if (existing) return existing;
    const predecessor = closing.get(resource);
    const state: ChannelState<C> = {
      resource, listeners: new Set(), pending: 0, retired: false, started: false,
      ready: Promise.resolve(undefined),
    };
    channels.set(resource, state);
    state.ready = Promise.resolve(predecessor).then(() => {
      if (state.retired) return undefined;
      // An unconfirmed removal may leave the old topic cached in the SDK.
      if (failedCleanup.has(resource)) throw new SupabaseLiveError('SUBSCRIBE_FAILED');
      const channel = client.channel(`live-${resource}`, { config: { broadcast: { ack: true } } });
      state.channel = channel;
      channel.on('postgres_changes', { event: '*', schema: 'public', table: resource },
        value => deliver(state, value, 'postgres'));
      channel.on('broadcast', { event: 'live-event' }, value => deliver(state, value, 'broadcast'));
      return channel;
    }).catch(() => {
      report('SUBSCRIBE_FAILED');
      release(state, true);
      return undefined;
    });
    return state;
  }

  function start(state: ChannelState<C>, channel: C): void {
    if (state.retired || state.started || state.listeners.size === 0) return;
    state.started = true;
    try {
      channel.subscribe(status => {
        if (state.retired || status === 'SUBSCRIBED') return;
        report('SUBSCRIBE_FAILED');
        // The SDK reconnects these two states. Closed or malformed states are terminal.
        if (status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT') release(state, true);
      });
    } catch {
      report('SUBSCRIBE_FAILED');
      release(state, true);
    }
  }

  return {
    subscribe({ resource, callback }) {
      const name = decode(resourceSchema, resource, 'INVALID_INPUT');
      const state = getChannel(name);
      const subscription = { callback };
      state.listeners.add(subscription);
      void state.ready.then(channel => { if (channel) start(state, channel); });
      let cancelled = false;
      return () => {
        if (cancelled) return;
        cancelled = true;
        state.listeners.delete(subscription);
        release(state);
      };
    },

    publish(value) {
      const event = decode(eventSchema, value, 'INVALID_INPUT');
      const state = getChannel(event.resource);
      state.pending++;
      void state.ready.then(async channel => {
        if (!channel || state.retired) throw new SupabaseLiveError('PUBLISH_OUTCOME_UNKNOWN');
        const receipt: unknown = await channel.send({ type: 'broadcast', event: 'live-event', payload: event });
        if (receipt !== 'ok') throw new SupabaseLiveError('PUBLISH_OUTCOME_UNKNOWN');
      }).catch(() => report('PUBLISH_OUTCOME_UNKNOWN')).finally(() => {
        state.pending--;
        release(state);
      });
    },
  };
}
