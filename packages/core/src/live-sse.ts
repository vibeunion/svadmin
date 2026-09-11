import type { LiveProvider } from './live.svelte';
import { createLiveSubscribers, decodeLiveMessage, notifyLiveObserver, readLiveOptions, captureLiveObserver } from './live-transport';
import { Type } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';

export interface SSELiveProviderOptions {
  url: string;
  eventSourceInit?: EventSourceInit;
  onOpen?: () => void;
  onError?: (event: Event) => void;
}

const initSchema = Type.Object({ withCredentials: Type.Optional(Type.Boolean()) }, { additionalProperties: false });
function checkedInit(value: unknown) {
  if (value === undefined) return undefined;
  try {
    const init = snapshotPlainData(value);
    if (checkExact(initSchema, init)) return init;
  } catch { /* Configuration reflection cannot leak into connection callbacks. */ }
  throw new TypeError('Invalid SSE initialization');
}

function configuration(options: unknown) {
  const input = readLiveOptions(options, ['url', 'eventSourceInit', 'onOpen', 'onError']);
  const url = input['url'];
  if (typeof url !== 'string' || !url) throw new TypeError('Invalid SSE live options');
  const eventSourceInit = checkedInit(input['eventSourceInit']);
  const onOpen = captureLiveObserver(input['onOpen']);
  const onError = captureLiveObserver(input['onError']);
  return { url, eventSourceInit, onOpen, onError };
}

/**
 * Named events may omit resource, but must include type and payload.
 * Reserved message/open/error resources use default full-envelope messages.
 * Per-subscription liveParams are unsupported and rejected.
 */
export function createSSELiveProvider(options: SSELiveProviderOptions): LiveProvider & {
  disconnect: () => void; getStatus: () => 'connecting' | 'connected' | 'disconnected';
} {
  const { url, eventSourceInit, onOpen, onError } = configuration(options);
  const subscribers = createLiveSubscribers();
  let source: EventSource | null = null;
  let status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  const namedListeners = new Map<string, EventListener>();

  function addNamedListener(resource: string) {
    const connection = source;
    if (!connection || ['*', 'message', 'open', 'error'].includes(resource) || namedListeners.has(resource)) return;
    const current = () => source === connection;
    const listener: EventListener = event => {
      if (!current() || namedListeners.get(resource) !== listener || !(event instanceof MessageEvent)) return;
      const data: unknown = event.data;
      const decoded = decodeLiveMessage(data, resource);
      if (decoded) subscribers.notify(decoded, current);
    };
    namedListeners.set(resource, listener);
    connection.addEventListener(resource, listener);
  }
  function disconnect() {
    const previous = source;
    source = null;
    status = 'disconnected';
    if (previous) {
      for (const [resource, listener] of namedListeners) previous.removeEventListener(resource, listener);
      previous.close();
    }
    namedListeners.clear();
  }
  function connect() {
    if (source || subscribers.empty || typeof EventSource === 'undefined') return;
    status = 'connecting';
    let connection: EventSource;
    try { connection = new EventSource(url, eventSourceInit); }
    catch { status = 'disconnected'; return; }
    source = connection;
    const current = () => source === connection;
    connection.onopen = event => {
      if (!current() || event instanceof MessageEvent) return;
      status = 'connected';
      notifyLiveObserver(onOpen, undefined);
    };
    connection.onmessage = message => {
      if (!current()) return;
      const data: unknown = message.data;
      const event = decodeLiveMessage(data);
      if (event) subscribers.notify(event, current);
    };
    connection.onerror = event => {
      if (!current() || event instanceof MessageEvent) return;
      if (connection.readyState === EventSource.CLOSED) disconnect();
      else status = 'connecting';
      notifyLiveObserver(onError, event);
    };
    for (const channel of subscribers.channels()) addNamedListener(channel.resource);
  }
  return {
    subscribe(params) {
      const entry = subscribers.add(params, false);
      if (!source) connect();
      else if (entry.first) addNamedListener(entry.resource);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        if (entry.remove()) {
          const listener = namedListeners.get(entry.resource);
          if (source && listener) source.removeEventListener(entry.resource, listener);
          namedListeners.delete(entry.resource);
        }
        if (subscribers.empty) disconnect();
      };
    },
    disconnect,
    getStatus: () => status,
  };
}
