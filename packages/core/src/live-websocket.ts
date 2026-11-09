import type { LiveProvider } from './live.svelte';
import { createLiveSubscribers, decodeLiveMessage, notifyLiveObserver, readLiveOptions, captureLiveObserver } from './live-transport';

export interface WebSocketLiveProviderOptions {
  url: string;
  /** Optional transport factory for Node ws or another WebSocket-compatible client. */
  webSocketFactory?: WebSocketFactory;
  /** Retry delay in milliseconds; defaults to 3000. */
  reconnectDelay?: number;
  /** Consecutive failed reconnects; defaults to Infinity. */
  maxReconnects?: number;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export interface WebSocketLike {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send(data: string): void;
  close(): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

function configuration(options: unknown) {
  const input = readLiveOptions(options, ['url', 'webSocketFactory', 'reconnectDelay', 'maxReconnects', 'onOpen', 'onClose', 'onError']);
  const url = input['url'];
  const factory = input['webSocketFactory'];
  const reconnectDelay = input['reconnectDelay'] === undefined ? 3000 : input['reconnectDelay'];
  const maxReconnects = input['maxReconnects'] === undefined ? Infinity : input['maxReconnects'];
  if (typeof url !== 'string' || !url || typeof reconnectDelay !== 'number' ||
    !Number.isSafeInteger(reconnectDelay) || reconnectDelay < 0 || reconnectDelay > 2_147_483_647 ||
    typeof maxReconnects !== 'number' || (maxReconnects !== Infinity && (!Number.isSafeInteger(maxReconnects) || maxReconnects < 0)) ||
    (factory !== undefined && typeof factory !== 'function')) {
    throw new TypeError('Invalid WebSocket live options');
  }
  const onOpen = captureLiveObserver(input['onOpen']);
  const onClose = captureLiveObserver(input['onClose']);
  const onError = captureLiveObserver(input['onError']);
  return { url, webSocketFactory: factory as WebSocketFactory | undefined, reconnectDelay, maxReconnects, onOpen, onClose, onError };
}

/** Each resource uses one checked parameter set until its last subscriber leaves. */
export function createWebSocketLiveProvider(options: WebSocketLiveProviderOptions): LiveProvider & {
  disconnect: () => void; getStatus: () => 'connecting' | 'connected' | 'disconnected';
} {
  const { url, webSocketFactory, reconnectDelay, maxReconnects, onOpen, onClose, onError } = configuration(options);
  const subscribers = createLiveSubscribers();
  let ws: WebSocketLike | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  function scheduleReconnect() {
    if (subscribers.empty || ws || reconnectAttempts >= maxReconnects) return;
    if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => { reconnectTimer = undefined; connect(); }, reconnectDelay);
  }
  function close(socket: WebSocketLike) {
    try { socket.close(); } catch { /* A retired transport cannot own current state. */ }
  }
  function send(socket: WebSocketLike, message: object) {
    if (ws !== socket) return;
    try { socket.send(JSON.stringify(message)); }
    catch {
      ws = null;
      status = 'disconnected';
      close(socket);
      scheduleReconnect();
    }
  }
  function connect() {
    if (ws || subscribers.empty || (!webSocketFactory && typeof WebSocket === 'undefined')) return;
    if (reconnectTimer !== undefined) { clearTimeout(reconnectTimer); reconnectTimer = undefined; }
    status = 'connecting';
    let socket: WebSocketLike;
    try { socket = webSocketFactory ? webSocketFactory(url) : new WebSocket(url); }
    catch { status = 'disconnected'; scheduleReconnect(); return; }
    ws = socket;
    const current = () => ws === socket;
    socket.onopen = () => {
      if (!current()) return;
      status = 'connected';
      for (const channel of subscribers.channels()) send(socket, { type: 'SUBSCRIBE', ...channel });
      if (current()) {
        reconnectAttempts = 0;
        notifyLiveObserver(onOpen, undefined);
      }
    };
    socket.onmessage = message => {
      if (!current()) return;
      const data: unknown = message.data;
      const event = decodeLiveMessage(data);
      if (event) subscribers.notify(event, current);
    };
    socket.onclose = event => {
      if (!current()) return;
      ws = null;
      status = 'disconnected';
      scheduleReconnect();
      notifyLiveObserver(onClose, event);
    };
    socket.onerror = event => {
      if (current()) notifyLiveObserver(onError, event);
    };
  }
  function disconnect() {
    if (reconnectTimer !== undefined) { clearTimeout(reconnectTimer); reconnectTimer = undefined; }
    reconnectAttempts = 0;
    const previous = ws;
    ws = null;
    status = 'disconnected';
    if (previous) close(previous);
  }

  return {
    subscribe(params) {
      const entry = subscribers.add(params);
      if (!ws) connect();
      else if (entry.first && status === 'connected') {
        const channel = subscribers.channels().find(channel => channel.resource === entry.resource);
        if (channel) send(ws, { type: 'SUBSCRIBE', ...channel });
      }
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        if (entry.remove() && ws && status === 'connected') send(ws, { type: 'UNSUBSCRIBE', resource: entry.resource });
        if (subscribers.empty) disconnect();
      };
    },
    disconnect,
    getStatus: () => status,
  };
}
