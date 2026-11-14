import type { LiveProvider, LiveEvent } from '@svadmin/core';

export type LiveActionType = LiveEvent['type'];

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
    if ('payload' in envelope && ('type' in envelope || 'event' in envelope || 'name' in envelope)) {
      return normalizeEventPayload(envelope['payload']);
    }
    return envelope;
  }
  return { value: data };
}

function mapEventType(value: unknown): LiveActionType | undefined {
  if (typeof value !== 'string') return undefined;
  return actionTypeMap[value.toLowerCase()];
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
   * Channel name generator. Defaults to `${channelPrefix}:${resource}` or `${resource}`.
   */
  channelName?: (resource: string, liveParams?: Record<string, unknown>) => string;

  /**
   * Channel prefix prepended to resource names. Defaults to 'resources'.
   */
  channelPrefix?: string;

  /**
   * Optional custom HTTP headers or async header resolver (e.g. for Bearer Authorization).
   * When provided, fetch-based ReadableStream transport is automatically used.
   */
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);

  /**
   * Custom fetch implementation (defaults to global fetch).
   */
  fetch?: typeof fetch;

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

interface SseParsedMessage {
  event?: string;
  data: string;
  id?: string;
}

export function parseSseChunk(
  chunk: string,
  buffer: string,
  onMessage: (msg: SseParsedMessage) => void,
): string {
  const text = buffer + chunk;
  const blocks = text.split(/\r?\n\r?\n/);
  const remainder = blocks.pop() ?? '';

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventName: string | undefined;
    const dataLines: string[] = [];
    let messageId: string | undefined;

    const lines = block.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith(':') || !line) {
        continue;
      }
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      } else if (line.startsWith('id:')) {
        messageId = line.slice(3).trim();
      }
    }

    if (dataLines.length > 0 || eventName) {
      onMessage({
        event: eventName,
        data: dataLines.join('\n'),
        id: messageId,
      });
    }
  }

  return remainder;
}

interface ActiveConnection {
  url: string;
  abortController: AbortController | null;
  nativeSource: { close(): void } | null;
  listeners: Map<string, Set<(event: LiveEvent) => void>>;
  retryCount: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  closed: boolean;
}

/**
 * Creates a Server-Sent Events (SSE) LiveProvider adapter for svadmin.
 * Connects resource subscriptions directly to standard HTTP/2 text/event-stream endpoints.
 */
export function createSseLiveProvider(options: SseLiveOptions): LiveProvider {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const channelPrefix = options.channelPrefix ?? 'resources';
  const initialDelay = options.reconnect?.initialDelayMs ?? 1000;
  const maxDelay = options.reconnect?.maxDelayMs ?? 15000;
  const maxRetries = options.reconnect?.maxRetries ?? Infinity;
  const useJitter = options.reconnect?.jitter !== false;

  const connectionsByUrl = new Map<string, ActiveConnection>();

  function resolveUrl(resource: string, liveParams?: Record<string, unknown>): string {
    if (typeof options.url === 'function') {
      return options.url(resource, liveParams);
    }
    return options.url;
  }

  function resolveChannel(resource: string, liveParams?: Record<string, unknown>): string {
    if (options.channelName) {
      return options.channelName(resource, liveParams);
    }
    return channelPrefix ? `${channelPrefix}:${resource}` : resource;
  }

  async function resolveHeaders(): Promise<Record<string, string>> {
    if (!options.headers) return {};
    if (typeof options.headers === 'function') {
      return options.headers();
    }
    return options.headers;
  }

  function dispatchMessage(conn: ActiveConnection, msg: SseParsedMessage, defaultResource: string) {
    let parsedData: unknown = msg.data;
    try {
      if (msg.data) {
        parsedData = JSON.parse(msg.data);
      }
    } catch {
      parsedData = msg.data;
    }

    let targetResource = defaultResource;
    if (parsedData !== null && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
      const envelope = parsedData as Record<string, unknown>;
      if (typeof envelope['resource'] === 'string' && envelope['resource'].length > 0) {
        targetResource = envelope['resource'];
      }
    }

    const type = resolveEventType(msg.event, parsedData);
    const payload = normalizeEventPayload(parsedData);

    const liveEvent: LiveEvent = {
      type,
      resource: targetResource,
      payload,
    };

    for (const [res, callbacks] of conn.listeners.entries()) {
      if (res === '*' || res === targetResource || res === defaultResource) {
        for (const cb of callbacks) {
          try {
            cb(liveEvent);
          } catch (e) {
            options.onError?.(e);
          }
        }
      }
    }
  }

  function startConnection(conn: ActiveConnection, resource: string) {
    if (conn.closed) return;

    void (async () => {
      try {
        const headers = await resolveHeaders();
        const hasCustomHeaders = Object.keys(headers).length > 0;

        if (!hasCustomHeaders && typeof globalThis.EventSource === 'function') {
          const es = new globalThis.EventSource(conn.url);
          conn.nativeSource = es;

          es.onopen = () => {
            conn.retryCount = 0;
            options.onConnected?.();
          };

          es.onmessage = (e: MessageEvent) => {
            dispatchMessage(conn, { data: e.data, id: e.lastEventId }, resource);
          };

          es.onerror = (err) => {
            options.onError?.(err);
            options.onDisconnected?.();
          };

          return;
        }

        const controller = new AbortController();
        conn.abortController = controller;

        const response = await fetchImpl(conn.url, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
            ...headers,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE stream connection failed with HTTP status ${response.status}`);
        }

        if (!response.body) {
          throw new Error('SSE stream response has no readable body');
        }

        conn.retryCount = 0;
        options.onConnected?.();

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!conn.closed) {
          const { done, value } = await reader.read();
          if (done) break;

          const textChunk = decoder.decode(value, { stream: true });
          buffer = parseSseChunk(textChunk, buffer, (msg) => {
            dispatchMessage(conn, msg, resource);
          });
        }

        options.onDisconnected?.();
        scheduleReconnect(conn, resource);
      } catch (err: unknown) {
        if (conn.closed) return;
        options.onError?.(err);
        options.onDisconnected?.();
        scheduleReconnect(conn, resource);
      }
    })();
  }

  function scheduleReconnect(conn: ActiveConnection, resource: string) {
    if (conn.closed) return;
    if (conn.retryCount >= maxRetries) return;

    let delay = Math.min(maxDelay, initialDelay * Math.pow(2, conn.retryCount));
    if (useJitter) {
      delay = Math.round(delay * (0.8 + Math.random() * 0.4));
    }

    conn.retryCount++;
    if (conn.retryTimer) {
      clearTimeout(conn.retryTimer);
    }

    conn.retryTimer = setTimeout(() => {
      conn.retryTimer = null;
      startConnection(conn, resource);
    }, delay);
  }

  function closeConnection(conn: ActiveConnection) {
    conn.closed = true;
    if (conn.retryTimer) {
      clearTimeout(conn.retryTimer);
      conn.retryTimer = null;
    }
    if (conn.abortController) {
      conn.abortController.abort();
      conn.abortController = null;
    }
    if (conn.nativeSource) {
      conn.nativeSource.close();
      conn.nativeSource = null;
    }
    conn.listeners.clear();
  }

  return {
    subscribe({ resource, liveParams, callback }): () => void {
      const url = resolveUrl(resource, liveParams);
      let conn = connectionsByUrl.get(url);

      if (!conn) {
        conn = {
          url,
          abortController: null,
          nativeSource: null,
          listeners: new Map(),
          retryCount: 0,
          retryTimer: null,
          closed: false,
        };
        connectionsByUrl.set(url, conn);
        startConnection(conn, resource);
      }

      let callbacks = conn.listeners.get(resource);
      if (!callbacks) {
        callbacks = new Set();
        conn.listeners.set(resource, callbacks);
      }
      callbacks.add(callback);

      return () => {
        const active = connectionsByUrl.get(url);
        if (!active) return;

        const cbs = active.listeners.get(resource);
        if (cbs) {
          cbs.delete(callback);
          if (cbs.size === 0) {
            active.listeners.delete(resource);
          }
        }

        if (active.listeners.size === 0) {
          closeConnection(active);
          connectionsByUrl.delete(url);
        }
      };
    },

    unsubscribe({ resource, liveParams }): void {
      const url = resolveUrl(resource, liveParams);
      const active = connectionsByUrl.get(url);
      if (!active) return;

      active.listeners.delete(resource);
      if (active.listeners.size === 0) {
        closeConnection(active);
        connectionsByUrl.delete(url);
      }
    },

    publish(event: LiveEvent): void {
      if (!options.publishUrl) return;

      const publishEndpoint = typeof options.publishUrl === 'function'
        ? options.publishUrl(event)
        : options.publishUrl;

      void (async () => {
        try {
          const headers = await resolveHeaders();
          await fetchImpl(publishEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
            body: JSON.stringify(event),
          });
        } catch (err) {
          options.onError?.(err);
        }
      })();
    },
  };
}
