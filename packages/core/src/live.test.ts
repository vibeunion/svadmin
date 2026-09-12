import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWebSocketLiveProvider } from './live-websocket';
import { createSSELiveProvider } from './live-sse';
import { decodeLiveMessage } from './live-transport';
import type { LiveEvent } from './live.svelte';
import { requireValue } from '../test/assertions';

class Socket {
  static readonly OPEN = 1;
  static readonly CONNECTING = 0;
  static instances: Socket[] = [];
  static fail = false;
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  sent: unknown[] = [];
  sendFailure = false;
  constructor(readonly url: string) {
    if (Socket.fail) throw new Error('PRIVATE socket failure');
    Socket.instances.push(this);
  }
  send(data: string) {
    if (this.sendFailure) throw new Error('PRIVATE send failure');
    const value: unknown = JSON.parse(data);
    this.sent.push(value);
  }
  open() { this.readyState = 1; this.onopen?.(new Event('open')); }
  message(data: unknown) { this.onmessage?.(new MessageEvent<unknown>('message', { data })); }
  close() { this.readyState = 3; this.onclose?.(new CloseEvent('close')); }
}
class Stream extends EventTarget {
  static readonly CLOSED = 2;
  static instances: Stream[] = [];
  static fail = false;
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  listeners: { type: string; callback: EventListener }[] = [];
  constructor(readonly url: string, readonly init?: EventSourceInit) {
    super();
    if (Stream.fail) throw new Error('PRIVATE SSE failure');
    Stream.instances.push(this);
  }
  override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    if (typeof callback === 'function') this.listeners.push({ type, callback });
    super.addEventListener(type, callback, options);
  }
  open() { this.readyState = 1; this.onopen?.(new Event('open')); }
  message(data: unknown) {
    const event = new MessageEvent<unknown>('message', { data });
    this.onmessage?.(event);
    this.dispatchEvent(event);
  }
  named(resource: string, data: unknown) { this.dispatchEvent(new MessageEvent<unknown>(resource, { data })); }
  close() { this.readyState = 2; }
}
const originals = new Map(['WebSocket', 'EventSource', 'setTimeout', 'clearTimeout']
  .map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const providers: { disconnect(): void }[] = [];
function timers() {
  let id = 0;
  const jobs = new Map<number, { callback: () => void; delay: number }>();
  Object.defineProperty(globalThis, 'setTimeout', { configurable: true, value: (callback: () => void, delay: number) => {
    jobs.set(++id, { callback, delay });
    return id;
  } });
  Object.defineProperty(globalThis, 'clearTimeout', { configurable: true, value: (timer: number) => { jobs.delete(timer); } });
  return { jobs, next() {
    const [key, job] = requireValue(jobs.entries().next().value);
    jobs.delete(key);
    job.callback();
  } };
}
function socket(options: Parameters<typeof createWebSocketLiveProvider>[0] = { url: '/ws', maxReconnects: 0 }) {
  const provider = createWebSocketLiveProvider(options);
  providers.push(provider);
  return provider;
}
function stream(options: Parameters<typeof createSSELiveProvider>[0] = { url: '/events' }) {
  const provider = createSSELiveProvider(options);
  providers.push(provider);
  return provider;
}
beforeEach(() => {
  Socket.instances = [];
  Stream.instances = [];
  Socket.fail = false;
  Stream.fail = false;
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: Socket });
  Object.defineProperty(globalThis, 'EventSource', { configurable: true, value: Stream });
});
afterEach(() => {
  for (const provider of providers.splice(0)) provider.disconnect();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
const event: LiveEvent = { type: 'INSERT', resource: 'posts', payload: { id: 1, nested: { title: 'Original' } } };
const serialized = JSON.stringify(event);

test('strictly compiles the transports, shared boundary and test sources', () => {
  const directory = dirname(fileURLToPath(import.meta.url));
  const roots = ['live-transport.ts', 'live-websocket.ts', 'live-sse.ts', 'live.svelte.ts', 'live.test.ts']
    .map(file => resolve(directory, file));
  const options: ts.CompilerOptions = {
    noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
    noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false,
    types: ['bun', 'svelte'], target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true,
  };
  const program = ts.createProgram(roots, options);
  const diagnostics = roots.flatMap(path => {
    const source = requireValue(program.getSourceFile(path));
    return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
  });
  expect(diagnostics.map(diagnostic =>
    `${diagnostic.file?.fileName}:${diagnostic.start}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`)).toEqual([]);
});

for (const kind of ['websocket', 'sse'] as const) {
  const create = () => kind === 'websocket' ? socket() : stream();
  const connection = () => kind === 'websocket' ? requireValue(Socket.instances.at(-1)) : requireValue(Stream.instances.at(-1));
  describe(`${kind} production transport`, () => {
    test('routes checked events to exact and wildcard subscribers', () => {
      const provider = create();
      const exact = mock((_event: LiveEvent) => {});
      const wildcard = mock((_event: LiveEvent) => {});
      expect(provider.getStatus()).toBe('disconnected');
      provider.subscribe({ resource: 'posts', callback: exact });
      provider.subscribe({ resource: '*', callback: wildcard });
      expect(provider.getStatus()).toBe('connecting');
      const transport = connection();
      transport.open();
      expect(provider.getStatus()).toBe('connected');
      for (const type of ['INSERT', 'UPDATE', 'DELETE'] as const) {
        transport.message(JSON.stringify({ ...event, type }));
      }
      transport.message(JSON.stringify({ ...event, resource: 'users' }));
      expect(exact).toHaveBeenCalledTimes(3);
      expect(wildcard).toHaveBeenCalledTimes(4);
      expect(exact.mock.calls[0]?.[0]).toEqual(event);
      expect(exact.mock.calls[1]?.[0].type).toBe('UPDATE');
      expect(exact.mock.calls[2]?.[0].type).toBe('DELETE');
    });

    test('rejects malformed JSON and event shapes before any callback', () => {
      const provider = create();
      const received = mock((_event: LiveEvent) => {});
      provider.subscribe({ resource: '*', callback: received });
      const transport = connection();
      const coerce = mock(() => serialized);
      const invalid: unknown[] = [
        null, {}, [], 'broken', { type: 'OTHER', resource: 'posts', payload: {} },
        { type: 1, resource: 'posts', payload: {} }, { ...event, resource: '' },
        { ...event, resource: 1 }, { ...event, payload: null }, { ...event, payload: [] },
        { type: 'INSERT', resource: 'posts' }, { ...event, unexpected: true },
      ];
      for (const value of invalid) transport.message(JSON.stringify(value));
      transport.message('{"type":"INSERT","resource":"posts","payload":{"number":1e309}}');
      transport.message('not JSON');
      transport.message({ toString: coerce });
      transport.message(new Uint8Array([123, 125]));
      expect(received).not.toHaveBeenCalled();
      expect(coerce).not.toHaveBeenCalled();
      transport.message(serialized);
      expect(received).toHaveBeenCalledTimes(1);
    });

    test('does not give consumers caller-selected business payload types', () => {
      const provider = create();
      provider.subscribe({ resource: 'posts', callback: value => {
        const payload: unknown = value.payload['id'];
        // @ts-expect-error Event payloads still need a business schema or narrowing.
        const fabricated: number = value.payload['id'];
        void payload;
        void fabricated;
      } });
      connection().message(serialized);
    });

    test('isolates nested payload mutations and sync/async observer failures', async () => {
      const provider = create();
      const observed: LiveEvent[] = [];
      provider.subscribe({ resource: 'posts', callback: value => {
        value.resource = 'wrong';
        Reflect.set(value.payload, 'nested', false);
        throw new Error('Observer failure');
      } });
      provider.subscribe({ resource: 'posts', callback: async () => { throw new Error('Async observer failure'); } });
      provider.subscribe({ resource: 'posts', callback: value => { observed.push(value); } });
      provider.subscribe({ resource: '*', callback: value => { observed.push(value); } });
      connection().message(serialized);
      await Promise.resolve();
      expect(observed).toEqual([event, event]);
      const first = requireValue(observed[0]);
      first.payload['nested'] = false;
      expect(observed[1]).toEqual(event);
    });

    test('gives identical callback registrations independent cleanup', () => {
      const provider = create();
      const received = mock((_event: LiveEvent) => {});
      const first = provider.subscribe({ resource: 'posts', callback: received });
      const second = provider.subscribe({ resource: 'posts', callback: received });
      const transport = connection();
      transport.message(serialized);
      expect(received).toHaveBeenCalledTimes(2);
      first();
      first();
      transport.message(serialized);
      expect(received).toHaveBeenCalledTimes(3);
      second();
      transport.message(serialized);
      expect(received).toHaveBeenCalledTimes(3);
      expect(provider.getStatus()).toBe('disconnected');
    });

    test('delivers a wildcard-resource event only once', () => {
      const provider = create();
      const received = mock((_event: LiveEvent) => {});
      provider.subscribe({ resource: '*', callback: received });
      connection().message(JSON.stringify({ ...event, resource: '*' }));
      expect(received).toHaveBeenCalledTimes(1);
    });

    test('honors callback cleanup without sending the same event to new registrations', () => {
      const provider = create();
      let remove = () => {};
      const next = mock((_event: LiveEvent) => {});
      const removed = mock((_event: LiveEvent) => {});
      provider.subscribe({ resource: 'posts', callback: () => {
        remove();
        provider.subscribe({ resource: 'posts', callback: next });
      } });
      remove = provider.subscribe({ resource: 'posts', callback: removed });
      connection().message(serialized);
      expect(removed).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      connection().message(serialized);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('stops delivery when an earlier callback disconnects', () => {
      const provider = create();
      const received = mock((_event: LiveEvent) => {});
      provider.subscribe({ resource: 'posts', callback: () => provider.disconnect() });
      provider.subscribe({ resource: '*', callback: received });
      connection().message(serialized);
      expect(received).not.toHaveBeenCalled();
      expect(provider.getStatus()).toBe('disconnected');
    });

    test('ignores saved message/open/error handlers from a retired connection', () => {
      const provider = create();
      const received = mock((_event: LiveEvent) => {});
      provider.subscribe({ resource: 'posts', callback: received });
      const retired = connection();
      const message = retired.onmessage;
      const open = retired.onopen;
      const error = retired.onerror;
      provider.disconnect();
      provider.subscribe({ resource: 'other', callback: () => {} });
      const current = connection();
      current.open();
      message?.(new MessageEvent<unknown>('message', { data: serialized }));
      open?.(new Event('open'));
      error?.(new Event('error'));
      expect(received).not.toHaveBeenCalled();
      expect(provider.getStatus()).toBe('connected');
      current.message(serialized);
      expect(received).toHaveBeenCalledTimes(1);
    });

    test('rejects accessor, non-plain and malformed subscription inputs without effects', () => {
      const provider = create();
      const get = mock(() => 'posts');
      const callback = mock((_event: LiveEvent) => {});
      const invalid: unknown[] = [
        null, [], { resource: '', callback }, { resource: 1, callback },
        { resource: 'posts', callback: false }, { resource: 'posts', callback, extra: true },
        { resource: 'posts', callback, liveParams: undefined },
        { resource: 'posts', callback, liveParams: [] },
        { resource: 'posts', callback, liveParams: new Date() },
        Object.defineProperty({ callback }, 'resource', { enumerable: true, get }),
        Object.defineProperty({ resource: 'posts' }, 'callback', { enumerable: true, get }),
      ];
      for (const value of invalid) expect(() => Reflect.apply(provider.subscribe, provider, [value])).toThrow('Invalid live subscription');
      expect(get).not.toHaveBeenCalled();
      expect(Socket.instances).toHaveLength(0);
      expect(Stream.instances).toHaveLength(0);
      expect(provider.getStatus()).toBe('disconnected');
      provider.subscribe({ resource: 'posts', callback });
      connection().message(serialized);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('rejects malformed connection configuration without invoking getters', () => {
      const factory = kind === 'websocket' ? createWebSocketLiveProvider : createSSELiveProvider;
      const get = mock(() => '/connection');
      for (const input of [null, [], {}, { url: '' }, { url: '/connection', onOpen: false },
        { url: '/connection', onOpen: undefined }, { url: '/connection', unknown: true },
        Object.defineProperty({}, 'url', { enumerable: true, get })]) {
        expect(() => Reflect.apply(factory, undefined, [input])).toThrow();
      }
      expect(get).not.toHaveBeenCalled();
      expect(Socket.instances).toHaveLength(0);
      expect(Stream.instances).toHaveLength(0);
    });

    test('captures lifecycle observers and contains rejected observer promises', async () => {
      const onOpen = mock(async (): Promise<void> => { throw new Error('Observer failed'); });
      const options = { url: '/connection', onOpen };
      const provider = kind === 'websocket' ? socket(options) : stream(options);
      provider.subscribe({ resource: 'posts', callback: () => {} });
      const replaced = mock(async () => {});
      options.onOpen = replaced;
      connection().open();
      await Promise.resolve();
      expect(provider.getStatus()).toBe('connected');
      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(replaced).not.toHaveBeenCalled();
    });

    test('does not try to connect when the browser transport is unavailable', () => {
      Reflect.deleteProperty(globalThis, kind === 'websocket' ? 'WebSocket' : 'EventSource');
      const provider = create();
      const remove = provider.subscribe({ resource: 'posts', callback: () => {} });
      expect(provider.getStatus()).toBe('disconnected');
      expect(Socket.instances).toHaveLength(0);
      expect(Stream.instances).toHaveLength(0);
      remove();
    });
  });
}

describe('SSE channels and lifecycle', () => {
  test('validates and snapshots credentials configuration before connection creation', () => {
    for (const value of [{ withCredentials: 'false' }, { withCredentials: undefined }, { invented: true }, []]) {
      expect(() => Reflect.apply(createSSELiveProvider, undefined, [{ url: '/events', eventSourceInit: value }])).toThrow('Invalid SSE initialization');
    }
    const init = { withCredentials: false };
    const provider = stream({ url: '/events', eventSourceInit: init });
    init.withCredentials = true;
    provider.subscribe({ resource: 'posts', callback: () => {} });
    expect(requireValue(Stream.instances[0]).init).toEqual({ withCredentials: false });
  });

  test('named messages require payloads and cannot target a different resource', () => {
    const provider = stream();
    const received = mock((_event: LiveEvent) => {});
    provider.subscribe({ resource: 'posts', callback: received });
    provider.subscribe({ resource: '*', callback: received });
    const transport = requireValue(Stream.instances[0]);
    transport.named('posts', JSON.stringify({ type: 'UPDATE', payload: { id: 1 } }));
    expect(received).toHaveBeenCalledTimes(2);
    expect(received.mock.calls[0]?.[0]).toEqual({ type: 'UPDATE', resource: 'posts', payload: { id: 1 } });
    for (const data of [{ type: 'INSERT' }, { ...event, resource: 'users' }, { ...event, resource: null },
      { ...event, payload: false }, { ...event, extra: true }]) transport.named('posts', JSON.stringify(data));
    transport.dispatchEvent(new Event('posts'));
    expect(received).toHaveBeenCalledTimes(2);
  });

  test('named callback cleanup does not mute a still-active wildcard subscription', () => {
    const provider = stream();
    let remove = () => {};
    remove = provider.subscribe({ resource: 'posts', callback: () => remove() });
    const wildcard = mock((_event: LiveEvent) => {});
    provider.subscribe({ resource: '*', callback: wildcard });
    requireValue(Stream.instances[0]).named('posts', serialized);
    expect(wildcard).toHaveBeenCalledTimes(1);
  });

  test('does not revive a retired named listener when its resource is subscribed again', () => {
    const provider = stream();
    provider.subscribe({ resource: '*', callback: () => {} });
    const remove = provider.subscribe({ resource: 'posts', callback: () => {} });
    const transport = requireValue(Stream.instances[0]);
    const old = requireValue(transport.listeners.find(listener => listener.type === 'posts'));
    remove();
    const received = mock((_event: LiveEvent) => {});
    provider.subscribe({ resource: 'posts', callback: received });
    old.callback(new MessageEvent('posts', { data: serialized }));
    expect(received).not.toHaveBeenCalled();
    transport.named('posts', serialized);
    expect(received).toHaveBeenCalledTimes(1);
  });

  test('reserved channel names use default envelopes without duplicate delivery', () => {
    const onOpen = mock(() => {});
    const onError = mock((_event: Event) => {});
    const provider = stream({ url: '/events', onOpen, onError });
    const received = mock((_event: LiveEvent) => {});
    for (const resource of ['message', 'open', 'error']) provider.subscribe({ resource, callback: received });
    const transport = requireValue(Stream.instances[0]);
    for (const resource of ['message', 'open', 'error']) transport.message(JSON.stringify({ ...event, resource }));
    expect(received).toHaveBeenCalledTimes(3);
    transport.onopen?.(new MessageEvent('open', { data: serialized }));
    transport.onerror?.(new MessageEvent('error', { data: serialized }));
    expect(onOpen).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(provider.getStatus()).toBe('connecting');
  });

  test('allows native reconnect but retires a terminal connection before reconnecting', () => {
    const provider = stream();
    const received = mock((_event: LiveEvent) => {});
    provider.subscribe({ resource: 'posts', callback: received });
    const retired = requireValue(Stream.instances[0]);
    retired.open();
    retired.onerror?.(new Event('error'));
    expect(provider.getStatus()).toBe('connecting');
    retired.open();
    expect(provider.getStatus()).toBe('connected');
    retired.close();
    retired.onerror?.(new Event('error'));
    expect(provider.getStatus()).toBe('disconnected');
    provider.subscribe({ resource: '*', callback: () => {} });
    const current = requireValue(Stream.instances[1]);
    retired.named('posts', serialized);
    expect(received).not.toHaveBeenCalled();
    current.named('posts', serialized);
    expect(received).toHaveBeenCalledTimes(1);
  });

  test('fails unsupported liveParams before opening a connection', () => {
    const provider = stream();
    expect(() => provider.subscribe({ resource: 'posts', liveParams: { private: true }, callback: () => {} })).toThrow('unsupported');
    expect(Stream.instances).toHaveLength(0);
    provider.subscribe({ resource: 'posts', callback: () => {} });
    expect(Stream.instances).toHaveLength(1);
  });

  test('handles constructor failure without leaking the raw exception or preventing retry', () => {
    Stream.fail = true;
    const provider = stream();
    const received = mock((_event: LiveEvent) => {});
    provider.subscribe({ resource: 'posts', callback: received });
    expect(provider.getStatus()).toBe('disconnected');
    Stream.fail = false;
    provider.subscribe({ resource: '*', callback: () => {} });
    requireValue(Stream.instances[0]).named('posts', serialized);
    expect(received).toHaveBeenCalledTimes(1);
  });
});

describe('WebSocket subscription and reconnect lifecycle', () => {
  test('captures metadata and rejects conflicting parameters without overwriting the channel', () => {
    const provider = socket();
    const params = { filter: { tenant: 'first', tags: ['a'] }, order: 1 };
    const received = mock((_event: LiveEvent) => {});
    const first = provider.subscribe({ resource: 'posts', liveParams: params, callback: received });
    params.filter.tenant = 'mutated';
    params.filter.tags.push('mutated');
    const second = provider.subscribe({ resource: 'posts',
      liveParams: { order: 1, filter: { tags: ['a'], tenant: 'first' } }, callback: received });
    expect(() => provider.subscribe({ resource: 'posts', liveParams: { order: 2 }, callback: received })).toThrow('Conflicting');
    const transport = requireValue(Socket.instances[0]);
    transport.open();
    expect(transport.sent).toEqual([{ type: 'SUBSCRIBE', resource: 'posts',
      liveParams: { filter: { tenant: 'first', tags: ['a'] }, order: 1 } }]);
    first();
    expect(transport.sent).toHaveLength(1);
    second();
    expect(transport.sent[1]).toEqual({ type: 'UNSUBSCRIBE', resource: 'posts' });
    provider.subscribe({ resource: 'posts', liveParams: { order: 2 }, callback: received });
    const next = requireValue(Socket.instances[1]);
    next.open();
    expect(next.sent).toEqual([{ type: 'SUBSCRIBE', resource: 'posts', liveParams: { order: 2 } }]);
  });

  test('reconnects with captured subscriptions and ignores retired close handlers', () => {
    const clock = timers();
    const onClose = mock((_event: CloseEvent) => { throw new Error('Observer'); });
    const provider = socket({ url: '/ws', reconnectDelay: 10, maxReconnects: 2, onClose });
    const remove = provider.subscribe({ resource: 'posts', liveParams: { filter: 1 }, callback: () => {} });
    const retired = requireValue(Socket.instances[0]);
    retired.open();
    const close = retired.onclose;
    retired.close();
    expect(clock.jobs.size).toBe(1);
    expect([...clock.jobs.values()][0]?.delay).toBe(10);
    clock.next();
    const current = requireValue(Socket.instances[1]);
    current.open();
    expect(current.sent).toEqual([{ type: 'SUBSCRIBE', resource: 'posts', liveParams: { filter: 1 } }]);
    close?.(new CloseEvent('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(clock.jobs.size).toBe(0);
    expect(provider.getStatus()).toBe('connected');
    remove();
    expect(clock.jobs.size).toBe(0);
    expect(provider.getStatus()).toBe('disconnected');
  });

  test('bounds retries after constructor failures and cancels scheduled retries on disconnect', () => {
    const clock = timers();
    Socket.fail = true;
    const provider = socket({ url: '/ws', maxReconnects: 2, reconnectDelay: 10 });
    const remove = provider.subscribe({ resource: 'posts', callback: () => {} });
    expect(clock.jobs.size).toBe(1);
    clock.next();
    expect(clock.jobs.size).toBe(1);
    clock.next();
    expect(clock.jobs.size).toBe(0);
    expect(provider.getStatus()).toBe('disconnected');
    remove();
    provider.subscribe({ resource: 'posts', callback: () => {} });
    expect(clock.jobs.size).toBe(1);
    provider.disconnect();
    expect(clock.jobs.size).toBe(0);
  });

  test('a send failure retires the connection and keeps subscriber state for recovery', () => {
    const clock = timers();
    const provider = socket({ url: '/ws', reconnectDelay: 10, maxReconnects: 1 });
    const received = mock((_event: LiveEvent) => {});
    provider.subscribe({ resource: 'posts', callback: received });
    const retired = requireValue(Socket.instances[0]);
    retired.sendFailure = true;
    retired.open();
    expect(provider.getStatus()).toBe('disconnected');
    expect(clock.jobs.size).toBe(1);
    retired.message(serialized);
    expect(received).not.toHaveBeenCalled();
    clock.next();
    const current = requireValue(Socket.instances[1]);
    current.open();
    current.message(serialized);
    expect(received).toHaveBeenCalledTimes(1);
  });

  test('opening a socket without restoring subscriptions cannot reset the retry budget', () => {
    const clock = timers();
    const onOpen = mock(() => {});
    const provider = socket({ url: '/ws', reconnectDelay: 10, maxReconnects: 1, onOpen });
    provider.subscribe({ resource: 'posts', callback: () => {} });
    const first = requireValue(Socket.instances[0]);
    first.sendFailure = true;
    first.open();
    clock.next();
    const second = requireValue(Socket.instances[1]);
    second.sendFailure = true;
    second.open();
    expect(clock.jobs.size).toBe(0);
    expect(provider.getStatus()).toBe('disconnected');
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('rejects invalid retry controls without opening a socket', () => {
    for (const delay of [-1, NaN, Infinity, 0.5, 2_147_483_648]) {
      expect(() => socket({ url: '/ws', reconnectDelay: delay })).toThrow('Invalid WebSocket live options');
    }
    for (const count of [-1, NaN, 0.5]) {
      expect(() => socket({ url: '/ws', maxReconnects: count })).toThrow('Invalid WebSocket live options');
    }
    expect(Socket.instances).toHaveLength(0);
  });
});

test('the decoder does not coerce unknown transport data', () => {
  const getter = mock(() => serialized);
  expect(decodeLiveMessage({ toString: getter })).toBeUndefined();
  expect(getter).not.toHaveBeenCalled();
});
