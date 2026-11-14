import { describe, it, expect, vi } from 'bun:test';
import type { LiveEvent } from '@svadmin/core';
import { createSseLiveProvider, parseSseChunk, type SseFetch, type SseParsedMessage } from './index';

const encoder = new TextEncoder();
const event = { type: 'UPDATE', resource: 'posts', payload: { id: 1 } } satisfies LiveEvent;
const reconnect = { initialDelayMs: 1, maxDelayMs: 2, maxRetries: 1, jitter: false };

function response(text = '') {
  return new Response(text, { headers: { 'Content-Type': 'text/event-stream' } });
}
function openStream() {
  let streamController: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({ start(controller) { streamController = controller; } });
  return {
    response: new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }),
    send(text: string) { streamController.enqueue(encoder.encode(text)); },
    close() { streamController.close(); },
  };
}
async function until(predicate: () => boolean) {
  for (let attempt = 0; attempt < 100 && !predicate(); attempt++) await Bun.sleep(1);
  expect(predicate()).toBe(true);
}

function parse(text: string) {
  const messages: SseParsedMessage[] = [];
  const ids: string[] = [];
  const buffer = parseSseChunk(text, '', message => messages.push(message), id => ids.push(id));
  return { messages, ids, buffer };
}

describe('@svadmin/sse parser', () => {
  it('parses named, multiline messages and ignores heartbeat comments', () => {
    expect(parse(': heartbeat\nevent: created\ndata: line 1\ndata: line 2\nid: 101\n\n')).toEqual({
      messages: [{ event: 'created', data: 'line 1\nline 2', id: '101' }], ids: ['101'], buffer: '',
    });
  });
  it('preserves all but one optional space in field values', () => {
    expect(parse('data:   indented\ndata:\tvalue\nid:  42 \n\n').messages).toEqual([
      { data: '  indented\n\tvalue', id: ' 42 ' },
    ]);
  });
  it('handles LF, CRLF and CR lines split at every byte boundary', () => {
    for (const ending of ['\n', '\r\n', '\r']) {
      const messages: SseParsedMessage[] = [];
      let buffer = '';
      const source = `\uFEFFevent: update${ending}data: ok${ending}${ending}: heartbeat${ending}`;
      for (const char of source) buffer = parseSseChunk(char, buffer, message => messages.push(message));
      expect(messages).toEqual([{ event: 'update', data: 'ok' }]);
    }
  });
  it('retains incomplete messages without dispatching them', () => {
    const messages: SseParsedMessage[] = [];
    const buffer = parseSseChunk('data: {"id":', '', message => messages.push(message));
    expect(buffer).toBe('data: {"id":');
    expect(messages).toEqual([]);
    expect(parseSseChunk('1}\n\n', buffer, message => messages.push(message))).toBe('');
    expect(messages).toEqual([{ data: '{"id":1}' }]);
  });
  it('processes id-only and empty fields, ignores NUL IDs and event-only blocks', () => {
    expect(parse('id: 10\n\nevent: created\n\nid\n\ndata\nid: bad\0id\n\n')).toEqual({
      messages: [{ data: '' }], ids: ['10', ''], buffer: '',
    });
  });
});

describe('@svadmin/sse subscriptions', () => {
  it('uses the supplied fetch in browsers and delivers named events', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'EventSource');
    const nativeSource = vi.fn();
    Object.defineProperty(globalThis, 'EventSource', { configurable: true, value: nativeSource });
    let stop: (() => void) | undefined;
    try {
      const transport = vi.fn<SseFetch>(async () => response('event: created\ndata: {"id":10}\n\n'));
      const provider = createSseLiveProvider({ url: '/events', fetch: transport, reconnect: { maxRetries: 0 } });
      const received: LiveEvent[] = [];
      stop = provider.subscribe({ resource: 'posts', callback: value => { received.push(value); } });
      await until(() => received.length === 1);
      expect(nativeSource).not.toHaveBeenCalled();
      expect(received[0]).toEqual({ type: 'INSERT', resource: 'posts', payload: { id: 10 } });
    } finally {
      stop?.();
      if (descriptor) Object.defineProperty(globalThis, 'EventSource', descriptor);
      else Reflect.deleteProperty(globalThis, 'EventSource');
    }
  });
  it('shares a URL while routing explicit resources and wildcard subscriptions correctly', async () => {
    const stream = openStream();
    const transport = vi.fn<SseFetch>(async () => stream.response);
    const onError = vi.fn();
    const provider = createSseLiveProvider({ url: '/events', fetch: transport, onError });
    const posts = vi.fn(); const orders = vi.fn(); const wildcard = vi.fn();
    const stops = [
      provider.subscribe({ resource: 'posts', callback: posts }),
      provider.subscribe({ resource: 'orders', callback: orders }),
      provider.subscribe({ resource: '*', callback: wildcard }),
    ];
    try {
      stream.send('event: deleted\ndata: {"resource":"orders","payload":{"id":2},"type":"delete"}\n\n');
      await until(() => orders.mock.calls.length === 1);
      expect(posts).not.toHaveBeenCalled();
      expect(wildcard).toHaveBeenCalledTimes(1);
      expect(orders.mock.calls[0]?.[0]).toEqual({ type: 'DELETE', resource: 'orders', payload: { id: 2 } });
      stream.send('data: {"id":3}\n\n');
      await until(() => onError.mock.calls.length === 1);
      expect(posts).not.toHaveBeenCalled();
      expect(wildcard).toHaveBeenCalledTimes(1);
      expect(transport).toHaveBeenCalledTimes(1);
    } finally { stops.forEach(stop => stop()); }
  });
  it('keeps resource inference disabled after a shared resource unsubscribes', async () => {
    const stream = openStream(); const posts = vi.fn(); const onError = vi.fn();
    const provider = createSseLiveProvider({ url: '/events', fetch: async () => stream.response, onError });
    const stopPosts = provider.subscribe({ resource: 'posts', callback: posts });
    const stopOrders = provider.subscribe({ resource: 'orders', callback: () => {} });
    try {
      stopOrders();
      stream.send('data: {"id":1}\n\n');
      await until(() => onError.mock.calls.length === 1);
      expect(posts).not.toHaveBeenCalled();
    } finally { stopOrders(); stopPosts(); }
  });
  it('isolates async lifecycle and error observers', async () => {
    const stream = openStream();
    const onError = vi.fn(async () => { throw new Error('error observer'); });
    const disconnected = vi.fn(async () => { throw new Error('disconnect observer'); });
    const provider = createSseLiveProvider({
      url: '/events', fetch: async () => stream.response, onError,
      onConnected: async () => { throw new Error('connect observer'); }, onDisconnected: disconnected,
    });
    const stop = provider.subscribe({ resource: 'posts', callback: () => {} });
    try {
      await until(() => onError.mock.calls.length === 1);
      stop();
      await until(() => onError.mock.calls.length === 2);
      expect(disconnected).toHaveBeenCalledTimes(1);
    } finally { stop(); }
  });
  it('does not start a request after unsubscribe while waiting for headers', async () => {
    const headers = Promise.withResolvers<Record<string, string>>();
    const transport = vi.fn<SseFetch>(async () => response());
    const provider = createSseLiveProvider({ url: '/events', fetch: transport, headers: () => headers.promise });
    const stop = provider.subscribe({ resource: 'posts', callback: () => {} });
    stop();
    headers.resolve({ Authorization: 'Bearer test' });
    await Bun.sleep(5);
    expect(transport).not.toHaveBeenCalled();
  });
  it('keeps duplicate callback subscriptions independent and old disposers harmless', async () => {
    const first = openStream(); const second = openStream();
    let attempts = 0;
    const transport: SseFetch = async () => (++attempts === 1 ? first.response : second.response);
    const callback = vi.fn();
    const provider = createSseLiveProvider({ url: '/events', fetch: transport });
    const stopA = provider.subscribe({ resource: 'posts', callback });
    const stopB = provider.subscribe({ resource: 'posts', callback });
    try {
      stopA();
      first.send('data: {"id":1}\n\n');
      await until(() => callback.mock.calls.length === 1);
      stopB();
      const stopC = provider.subscribe({ resource: 'posts', callback });
      try {
        stopA(); stopB();
        second.send('data: {"id":2}\n\n');
        await until(() => callback.mock.calls.length === 2);
      } finally { stopC(); }
    } finally { stopA(); stopB(); }
  });
  it('aborts and cancels a reader without reconnecting after unsubscribe', async () => {
    let signal: AbortSignal | null | undefined;
    const cancelled = vi.fn();
    const transport = vi.fn<SseFetch>(async (_url, init) => {
      signal = init?.signal;
      return new Response(new ReadableStream<Uint8Array>({ cancel: cancelled }), {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    });
    const connected = vi.fn(); const disconnected = vi.fn();
    const provider = createSseLiveProvider({ url: '/events', fetch: transport, reconnect, onConnected: connected, onDisconnected: disconnected });
    const stop = provider.subscribe({ resource: 'posts', callback: () => {} });
    await until(() => connected.mock.calls.length === 1);
    stop();
    await until(() => cancelled.mock.calls.length === 1);
    await Bun.sleep(5);
    expect(signal?.aborted).toBe(true);
    expect(disconnected).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('isolates throwing and async observers and ignores action prototype keys', async () => {
    const stream = openStream(); const received = vi.fn(); const onError = vi.fn(() => { throw new Error('observer'); });
    const provider = createSseLiveProvider({ url: '/events', fetch: async () => stream.response, onError });
    const stops = [
      provider.subscribe({ resource: 'posts', callback: () => { throw new Error('sync'); } }),
      provider.subscribe({ resource: 'posts', callback: async () => { throw new Error('async'); } }),
      provider.subscribe({ resource: 'posts', callback: received }),
    ];
    try {
      stream.send('event: constructor\ndata: {"type":"__proto__","id":1}\n\n');
      await until(() => onError.mock.calls.length === 2);
      expect(received.mock.calls[0]?.[0].type).toBe('UPDATE');
    } finally { stops.forEach(stop => stop()); }
  });
  it('supports resource and liveParams endpoint resolvers and explicit unsubscribe', async () => {
    const stream = openStream(); const callback = vi.fn(); const params = { tenant: 'test' };
    const transport = vi.fn<SseFetch>(async () => stream.response);
    const provider = createSseLiveProvider({ url: (resource, input) => `/${String(input?.['tenant'])}/${resource}`, fetch: transport });
    const stop = provider.subscribe({ resource: 'posts', liveParams: params, callback });
    await until(() => transport.mock.calls.length === 1);
    expect(transport.mock.calls[0]?.[0]).toBe('/test/posts');
    provider.unsubscribe({ resource: 'posts', liveParams: { tenant: 'test' } });
    stop();
    expect(transport.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });
});

describe('@svadmin/sse recovery and publication', () => {
  it('refreshes authorization and sends or clears Last-Event-ID after reconnect', async () => {
    const requests: Headers[] = [];
    const headers = vi.fn(() => ({ Authorization: `Bearer attempt-${requests.length + 1}` }));
    const onError = vi.fn();
    const provider = createSseLiveProvider({
      url: '/events', reconnect: { ...reconnect, maxRetries: 2 }, headers, onError,
      fetch: async (_url, init) => {
        requests.push(new Headers(init?.headers));
        if (requests.length === 1) return response('id: 42\n\n');
        if (requests.length === 2) return response('id\n\n');
        return new Response(null, { status: 204 });
      },
    });
    const stop = provider.subscribe({ resource: 'posts', callback: () => {} });
    try {
      await until(() => requests.length === 3);
      expect(requests[0]?.get('Authorization')).toBe('Bearer attempt-1');
      expect(requests[1]?.get('Authorization')).toBe('Bearer attempt-2');
      expect(requests[1]?.get('Last-Event-ID')).toBe('42');
      expect(requests[2]?.has('Last-Event-ID')).toBe(false);
      expect(onError).not.toHaveBeenCalled();
    } finally { stop(); }
  });
  it('bounds retries even when a server repeatedly opens then closes without events', async () => {
    const transport = vi.fn<SseFetch>(async () => response());
    const provider = createSseLiveProvider({ url: '/events', fetch: transport, reconnect });
    const stop = provider.subscribe({ resource: 'posts', callback: () => {} });
    try {
      await until(() => transport.mock.calls.length === 2);
      await Bun.sleep(10);
      expect(transport).toHaveBeenCalledTimes(2);
    } finally { stop(); }
  });
  it('honors stop-on-204 and rejects HTTP/content-type errors', async () => {
    for (const result of [new Response(null, { status: 204 }), new Response('bad', { status: 503 }), new Response('<html>bad</html>')]) {
      const transport = vi.fn<SseFetch>(async () => result);
      const onError = vi.fn();
      const provider = createSseLiveProvider({ url: '/events', fetch: transport, reconnect: { maxRetries: 0 }, onError });
      const stop = provider.subscribe({ resource: 'posts', callback: () => {} });
      try {
        await Bun.sleep(5);
        expect(transport).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledTimes(result.status === 204 ? 0 : 1);
      } finally { stop(); }
    }
  });
  it('dispatches a CR-only event ending at EOF', async () => {
    const callback = vi.fn();
    const provider = createSseLiveProvider({ url: '/events', fetch: async () => response('data: ok\r\r'), reconnect: { maxRetries: 0 } });
    const stop = provider.subscribe({ resource: 'posts', callback });
    try { await until(() => callback.mock.calls.length === 1); }
    finally { stop(); }
  });
  it('publishes JSON with authentication and exposes HTTP and network failures to callers', async () => {
    const requests: RequestInit[] = [];
    let status = 200;
    const onError = vi.fn();
    const transport: SseFetch = async (_url, init) => {
      if (init) requests.push(init);
      if (status === 0) throw new Error('offline');
      return new Response(null, { status });
    };
    const provider = createSseLiveProvider({ url: '/events', publishUrl: '/publish', fetch: transport, headers: { Authorization: 'Bearer test' }, onError });
    await provider.publish(event);
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.body).toBe(JSON.stringify(event));
    expect(new Headers(requests[0]?.headers).get('Authorization')).toBe('Bearer test');
    status = 500;
    await expect(provider.publish(event)).rejects.toThrow('HTTP status 500');
    status = 0;
    await expect(provider.publish(event)).rejects.toThrow('offline');
    expect(onError).toHaveBeenCalledTimes(2);
    const readonly = createSseLiveProvider({ url: '/events', fetch: transport });
    await expect(readonly.publish(event)).rejects.toThrow('publishUrl is not configured');
  });
});
