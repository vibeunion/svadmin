import type { LiveProvider, LiveEvent } from '@svadmin/core';

export type LiveActionType = LiveEvent['type'];
export type SseFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const actionTypeMap: Record<string, LiveActionType> = {
  create: 'INSERT',
  created: 'INSERT',
  insert: 'INSERT',
  'create-record': 'INSERT',
  update: 'UPDATE',
  updated: 'UPDATE',
  patch: 'UPDATE',
  delete: 'DELETE',
  deleted: 'DELETE',
  remove: 'DELETE',
};

function normalizeEventPayload(data: unknown): Record<string, unknown> {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const envelope = data as Record<string, unknown>;
    if ('payload' in envelope && ('type' in envelope || 'event' in envelope || 'name' in envelope || 'action' in envelope)) {
      return normalizeEventPayload(envelope['payload']);
    }
    return envelope;
  }
  return { value: data };
}

function mapEventType(value: unknown): LiveActionType | undefined {
  if (typeof value !== 'string') return undefined;
  const key = value.toLowerCase();
  return Object.hasOwn(actionTypeMap, key) ? actionTypeMap[key] : undefined;
}

function resolveEventType(eventName: string | undefined, data: unknown): LiveActionType {
  const mappedName = mapEventType(eventName);
  if (mappedName) return mappedName;

  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const envelope = data as Record<string, unknown>;
    for (const key of ['type', 'event', 'name', 'action']) {
      const mapped = mapEventType(envelope[key]);
      if (mapped) return mapped;
    }
  }
  return 'UPDATE';
}

export interface SseReconnectOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  maxRetries?: number;
  jitter?: boolean;
}

export interface SseLiveOptions {
  /**
   * The SSE endpoint URL, or a resolver function returning an endpoint per resource.
   * e.g. "https://api.example.com/events" or (resource) => `/api/stream/${resource}`
   */
  url: string | ((resource: string, liveParams?: Record<string, unknown>) => string);

  /**
   * Optional custom HTTP headers or async header resolver (e.g. for Bearer Authorization).
   * Resolved again on every connection attempt and publication.
   */
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);

  /**
   * Custom fetch implementation (defaults to global fetch).
   */
  fetch?: SseFetch;

  /**
   * Reconnection parameters on connection drop.
   */
  reconnect?: SseReconnectOptions;

  /**
   * Optional endpoint for publishing events (POST request).
   */
  publishUrl?: string | ((event: LiveEvent) => string);

  /**
   * Callback invoked when a stream successfully connects.
   */
  onConnected?: () => void;

  /**
   * Callback invoked when a stream disconnects.
   */
  onDisconnected?: () => void;

  /**
   * Callback invoked on transport error.
   */
  onError?: (error: unknown) => void;
}

export interface SseParsedMessage {
  event?: string | undefined;
  data: string;
  id?: string | undefined;
}

/** Parse complete SSE blocks, preserving incomplete lines between network chunks. */
export function parseSseChunk(
  chunk: string,
  buffer: string,
  onMessage: (msg: SseParsedMessage) => void,
  onId?: (id: string) => void,
): string {
  const text = (buffer + chunk).replace(/^\uFEFF/, '');
  let blockStart = 0;
  let lineStart = 0;
  const lines: string[] = [];

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char !== '\r' && char !== '\n') continue;
    // 等待下一块，才能区分 CR 与跨块的 CRLF。
    if (char === '\r' && index === text.length - 1) break;
    const line = text.slice(lineStart, index);
    if (char === '\r' && text[index + 1] === '\n') index++;
    lineStart = index + 1;
    if (line !== '') {
      lines.push(line);
      continue;
    }

    let eventName: string | undefined;
    let messageId: string | undefined;
    const dataLines: string[] = [];
    for (const fieldLine of lines) {
      if (fieldLine.startsWith(':')) continue;
      const colon = fieldLine.indexOf(':');
      const field = colon < 0 ? fieldLine : fieldLine.slice(0, colon);
      let value = colon < 0 ? '' : fieldLine.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'data') dataLines.push(value);
      else if (field === 'event') eventName = value;
      else if (field === 'id' && !value.includes('\0')) messageId = value;
    }
    if (messageId !== undefined) onId?.(messageId);
    if (dataLines.length > 0) {
      onMessage({
        data: dataLines.join('\n'),
        ...(eventName !== undefined ? { event: eventName } : {}),
        ...(messageId !== undefined ? { id: messageId } : {}),
      });
    }
    lines.length = 0;
    blockStart = lineStart;
  }
  return text.slice(blockStart);
}

interface Subscription {
  resource: string;
  callback: (event: LiveEvent) => void;
}

interface ActiveConnection {
  url: string;
  abortController: AbortController | null;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
  subscriptions: Set<Subscription>;
  retryCount: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  lastEventId: string;
  fallbackResource: string | undefined;
  connected: boolean;
  closed: boolean;
}

/** Creates a fetch-based SSE adapter, including authenticated and named events. */
export function createSseLiveProvider(options: SseLiveOptions) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const initialDelay = options.reconnect?.initialDelayMs ?? 1000;
  const maxDelay = options.reconnect?.maxDelayMs ?? 15000;
  const maxRetries = options.reconnect?.maxRetries ?? Infinity;
  const connectionsByUrl = new Map<string, ActiveConnection>();

  function reportError(error: unknown) {
    try { void Promise.resolve(options.onError?.(error)).catch(() => {}); }
    catch { /* 错误观察者不能中断传输清理。 */ }
  }
  function notify(observer: (() => void) | undefined) {
    try { void Promise.resolve(observer?.()).catch(reportError); } catch (error) { reportError(error); }
  }
  function disconnected(conn: ActiveConnection) {
    if (!conn.connected) return;
    conn.connected = false;
    notify(options.onDisconnected);
  }
  function resolveUrl(resource: string, liveParams?: Record<string, unknown>): string {
    return typeof options.url === 'function' ? options.url(resource, liveParams) : options.url;
  }
  async function resolveHeaders(): Promise<Record<string, string>> {
    return typeof options.headers === 'function' ? options.headers() : options.headers ?? {};
  }

  function dispatchMessage(conn: ActiveConnection, msg: SseParsedMessage) {
    if (conn.closed) return;
    let parsedData: unknown = msg.data;
    try { parsedData = JSON.parse(msg.data); } catch { /* 支持纯文本 data 字段。 */ }
    let targetResource: string | undefined;
    if (parsedData !== null && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
      const envelope = parsedData as Record<string, unknown>;
      if (typeof envelope['resource'] === 'string' && envelope['resource']) {
        targetResource = envelope['resource'];
      }
    }
    if (!targetResource) {
      targetResource = conn.fallbackResource;
    }
    // 共享端点必须提供 resource，无法确定归属时不能把事件猜给首个订阅者。
    if (!targetResource) {
      reportError(new Error('SSE event requires a resource when the endpoint serves multiple resources'));
      return;
    }
    const liveEvent: LiveEvent = {
      type: resolveEventType(msg.event, parsedData),
      resource: targetResource,
      payload: normalizeEventPayload(parsedData),
    };
    conn.retryCount = 0;
    for (const entry of [...conn.subscriptions]) {
      if (conn.closed) break;
      if (!conn.subscriptions.has(entry) || (entry.resource !== '*' && entry.resource !== targetResource)) continue;
      try { void Promise.resolve(entry.callback(liveEvent)).catch(reportError); }
      catch (error) { reportError(error); }
    }
  }

  function scheduleReconnect(conn: ActiveConnection) {
    if (conn.closed || conn.retryCount >= maxRetries) return;
    let delay = Math.min(maxDelay, initialDelay * 2 ** conn.retryCount);
    if (options.reconnect?.jitter !== false) delay = Math.min(maxDelay, Math.round(delay * (0.8 + Math.random() * 0.4)));
    conn.retryCount++;
    conn.retryTimer = setTimeout(() => {
      conn.retryTimer = null;
      startConnection(conn);
    }, delay);
  }

  function startConnection(conn: ActiveConnection) {
    if (conn.closed) return;
    const controller = new AbortController();
    conn.abortController = controller;
    void (async () => {
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      try {
        const headers = new Headers(await resolveHeaders());
        if (conn.closed) return;
        headers.set('Accept', 'text/event-stream');
        headers.set('Cache-Control', 'no-cache');
        if (conn.lastEventId) headers.set('Last-Event-ID', conn.lastEventId);
        else headers.delete('Last-Event-ID');
        const response = await fetchImpl(conn.url, { method: 'GET', headers, signal: controller.signal });
        if (conn.closed) {
          await response.body?.cancel();
          return;
        }
        if (response.status === 204) { closeConnection(conn); return; }
        if (!response.ok) throw new Error(`SSE stream connection failed with HTTP status ${response.status}`);
        if (!(response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() === 'text/event-stream')) {
          throw new Error('SSE stream response must have text/event-stream content type');
        }
        if (!response.body) throw new Error('SSE stream response has no readable body');
        conn.connected = true;
        notify(options.onConnected);
        reader = response.body.getReader();
        conn.reader = reader;
        const decoder = new TextDecoder();
        let buffer = '';
        while (!conn.closed) {
          const { done, value } = await reader.read();
          if (conn.closed) break;
          if (done) {
            if (buffer.endsWith('\r')) parseSseChunk('\n', buffer,
              msg => dispatchMessage(conn, msg), id => { conn.lastEventId = id; });
            break;
          }
          buffer = parseSseChunk(decoder.decode(value, { stream: true }), buffer,
            msg => dispatchMessage(conn, msg), id => { conn.lastEventId = id; });
        }
      } catch (error) {
        if (!conn.closed) reportError(error);
      } finally {
        if (reader) {
          await reader.cancel().catch(reportError);
          reader.releaseLock();
        }
        conn.reader = null;
        controller.abort();
        if (conn.abortController === controller) conn.abortController = null;
        disconnected(conn);
        scheduleReconnect(conn);
      }
    })();
  }

  function closeConnection(conn: ActiveConnection) {
    conn.closed = true;
    if (conn.retryTimer !== null) clearTimeout(conn.retryTimer);
    conn.retryTimer = null;
    conn.abortController?.abort();
    if (conn.reader) void conn.reader.cancel().catch(reportError);
    conn.subscriptions.clear();
    disconnected(conn);
  }

  function remove(conn: ActiveConnection, entry: Subscription) {
    conn.subscriptions.delete(entry);
    if (conn.subscriptions.size > 0) return;
    closeConnection(conn);
    if (connectionsByUrl.get(conn.url) === conn) connectionsByUrl.delete(conn.url);
  }

  return {
    subscribe({ resource, liveParams, callback }) {
      const url = resolveUrl(resource, liveParams);
      let conn = connectionsByUrl.get(url);
      const isNew = !conn || conn.closed;
      if (!conn || conn.closed) {
        conn = {
          url, abortController: null, reader: null, subscriptions: new Set(), retryCount: 0,
          retryTimer: null, lastEventId: '', fallbackResource: resource === '*' ? undefined : resource, connected: false, closed: false,
        };
        connectionsByUrl.set(url, conn);
      }
      if (resource !== '*' && resource !== conn.fallbackResource) conn.fallbackResource = undefined;
      const entry: Subscription = { resource, callback };
      conn.subscriptions.add(entry);
      if (isNew) startConnection(conn);
      // 闭包绑定原连接和订阅，重复调用不会删除后续建立的新订阅。
      const connection = conn;
      return () => remove(connection, entry);
    },
    unsubscribe({ resource, liveParams }) {
      const conn = connectionsByUrl.get(resolveUrl(resource, liveParams));
      if (!conn) return;
      for (const entry of [...conn.subscriptions]) {
        if (entry.resource === resource) remove(conn, entry);
      }
    },
    async publish(event: LiveEvent): Promise<void> {
      if (!options.publishUrl) throw new Error('SSE publishUrl is not configured');
      const endpoint = typeof options.publishUrl === 'function' ? options.publishUrl(event) : options.publishUrl;
      try {
        const headers = new Headers(await resolveHeaders());
        headers.set('Content-Type', 'application/json');
        const response = await fetchImpl(endpoint, { method: 'POST', headers, body: JSON.stringify(event) });
        if (!response.ok) throw new Error(`SSE publication failed with HTTP status ${response.status}`);
      } catch (error) {
        reportError(error);
        throw error;
      }
    },
  } satisfies LiveProvider;
}
