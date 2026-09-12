import { describe, expect, mock, test } from 'bun:test';
import PocketBase, { BaseAuthStore } from 'pocketbase';
import type { LiveEvent } from '@svadmin/core';
import { requireValue } from '../../../scripts/test-assertions';
import { createPocketBaseLiveProvider, type PocketBaseLiveError } from './live-provider';

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function fixture() {
  const handlers: ((value: unknown) => void)[] = [];
  const completions: ((value: unknown) => void)[] = [];
  const failures: ((value: unknown) => void)[] = [];
  const onError = mock((_error: PocketBaseLiveError) => {});
  const subscribe = mock((_topic: string, handler: (value: unknown) => void) => {
    handlers.push(handler);
    return new Promise<unknown>((resolve, reject) => {
      completions.push(resolve);
      failures.push(reject);
    });
  });
  const pb = { collection: mock((_name: string) => ({ subscribe })) };
  return {
    provider: createPocketBaseLiveProvider({ pb, onError }), pb, subscribe, onError,
    emit: (index: number, value: unknown) => requireValue(handlers[index])(value),
    resolve: (index: number, value: unknown) => requireValue(completions[index])(value),
    reject: (index: number, value: unknown) => requireValue(failures[index])(value),
  };
}

describe('PocketBase realtime boundaries', () => {
  test('validates all actions and snapshots nested payloads', async () => {
    const f = fixture();
    const events: LiveEvent[] = [];
    const cancel = f.provider.subscribe({ resource: 'posts', callback: event => events.push(event) });
    const data = { action: 'create', record: { id: '1', nested: { count: 1 } } };
    f.emit(0, data);
    data.record.nested.count = 2;
    f.emit(0, { action: 'update', record: { id: '1' } });
    f.emit(0, { action: 'delete', record: { id: '1' } });
    expect(events).toEqual([
      { type: 'INSERT', resource: 'posts', payload: { id: '1', nested: { count: 1 } } },
      { type: 'UPDATE', resource: 'posts', payload: { id: '1' } },
      { type: 'DELETE', resource: 'posts', payload: { id: '1' } },
    ]);
    f.resolve(0, async () => {});
    await flush();
    cancel();
  });

  test('rejects unknown actions, malformed records and non-JSON values instead of emitting updates', async () => {
    const f = fixture();
    const callback = mock((_event: LiveEvent) => {});
    const cancel = f.provider.subscribe({ resource: 'posts', callback });
    const invalid: unknown[] = [
      null, [], {}, { action: 'unknown', record: { id: '1' } },
      { action: 'create', record: null }, { action: 'create', record: [] },
      { action: 'create', record: { id: 1 } },
      { action: 'create', record: { id: '1', secret: undefined } },
      { action: 'create', record: { id: '1', nested: new Date() } },
      { action: 'create', record: { id: '1', value: Number.NaN } },
      { action: 'create', record: { id: '1', run: () => {} } },
      { action: 'create', record: { id: '1' }, secret: 'unexpected' },
    ];
    for (const value of invalid) f.emit(0, value);
    expect(callback).not.toHaveBeenCalled();
    expect(f.onError.mock.calls.map(([error]) => error.code)).toEqual(invalid.map(() => 'INVALID_EVENT'));
    expect(f.onError.mock.calls.every(([error]) => !error.message.includes('secret'))).toBe(true);
    f.resolve(0, async () => {});
    await flush();
    cancel();
  });

  test('rejects getters, cycles, hidden fields and sparse arrays without executing user code', async () => {
    const f = fixture();
    const callback = mock((_event: LiveEvent) => {});
    const cancel = f.provider.subscribe({ resource: 'posts', callback });
    let reads = 0;
    const cycle: Record<string, unknown> = { id: '1' };
    cycle['nested'] = cycle;
    for (const record of [
      { get id() { reads++; return '1'; } }, cycle,
      Object.defineProperty({ id: '1' }, 'secret', { value: 'hidden' }),
      { id: '1', [Symbol('secret')]: 'hidden' },
      { id: '1', rows: new Array(2) },
    ]) f.emit(0, { action: 'create', record });
    expect(callback).not.toHaveBeenCalled();
    expect(reads).toBe(0);
    f.resolve(0, async () => {});
    await flush();
    cancel();
  });

  test('cancels immediately during setup and disposes exactly once when setup completes', async () => {
    const f = fixture();
    const callback = mock((_event: LiveEvent) => {});
    const dispose = mock(async () => {});
    const cancel = f.provider.subscribe({ resource: 'posts', callback });
    cancel();
    cancel();
    f.emit(0, { action: 'create', record: { id: '1' } });
    expect(callback).not.toHaveBeenCalled();
    f.resolve(0, dispose);
    await flush();
    cancel();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  test('keeps simultaneous subscribers independent', async () => {
    const f = fixture();
    const first = mock((_event: LiveEvent) => {});
    const second = mock((_event: LiveEvent) => {});
    const disposeFirst = mock(async () => {});
    const disposeSecond = mock(async () => {});
    const cancelFirst = f.provider.subscribe({ resource: 'posts', callback: first });
    const cancelSecond = f.provider.subscribe({ resource: 'posts', callback: second });
    f.resolve(0, disposeFirst);
    f.resolve(1, disposeSecond);
    await flush();
    cancelFirst();
    for (const index of [0, 1]) f.emit(index, { action: 'delete', record: { id: '1' } });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(disposeFirst).toHaveBeenCalledTimes(1);
    expect(disposeSecond).not.toHaveBeenCalled();
    cancelSecond();
    expect(disposeSecond).toHaveBeenCalledTimes(1);
  });

  test('surfaces setup failures and stops delivering events', async () => {
    const f = fixture();
    const callback = mock((_event: LiveEvent) => {});
    f.provider.subscribe({ resource: 'posts', callback });
    f.reject(0, new Error('secret connection details'));
    await flush();
    f.emit(0, { action: 'create', record: { id: '1' } });
    expect(callback).not.toHaveBeenCalled();
    expect(f.onError.mock.calls.map(([error]) => error.code)).toEqual(['SUBSCRIBE_FAILED']);
    const malformed = fixture();
    malformed.provider.subscribe({ resource: 'posts', callback });
    malformed.resolve(0, undefined);
    await flush();
    expect(malformed.onError.mock.calls.map(([error]) => error.code)).toEqual(['SUBSCRIBE_FAILED']);
  });

  test('handles synchronous setup errors and invalid resource names', () => {
    const onError = mock((_error: PocketBaseLiveError) => {});
    const collection = mock((_name: string): never => { throw new Error('secret'); });
    const provider = createPocketBaseLiveProvider({ pb: { collection }, onError });
    expect(() => provider.subscribe({ resource: '../posts', callback: () => {} })).toThrow();
    expect(collection).not.toHaveBeenCalled();
    provider.subscribe({ resource: 'posts', callback: () => {} });
    expect(onError.mock.calls.map(([error]) => error.code)).toEqual(['SUBSCRIBE_FAILED']);
  });

  test('handles both synchronous and asynchronous cleanup failures without leaking errors', async () => {
    for (const dispose of [
      () => { throw new Error('secret'); },
      () => Promise.reject(new Error('secret')),
    ]) {
      const f = fixture();
      const cancel = f.provider.subscribe({ resource: 'posts', callback: () => {} });
      f.resolve(0, dispose);
      await flush();
      cancel();
      cancel();
      await flush();
      expect(f.onError.mock.calls.map(([error]) => error.code)).toEqual(['UNSUBSCRIBE_FAILED']);
    }
  });

  test('reports subscriber exceptions without confusing them with invalid SDK events', async () => {
    const f = fixture();
    const cancel = f.provider.subscribe({ resource: 'posts', callback: () => { throw new Error('secret'); } });
    expect(() => f.emit(0, { action: 'create', record: { id: '1' } })).not.toThrow();
    expect(f.onError.mock.calls.map(([error]) => error.code)).toEqual(['CALLBACK_FAILED']);
    f.resolve(0, async () => {});
    await flush();
    cancel();
  });

  test('preserves repeated references and prototype-named JSON fields as independent own data', async () => {
    const f = fixture();
    const events: LiveEvent[] = [];
    const cancel = f.provider.subscribe({ resource: 'posts', callback: event => events.push(event) });
    const shared = { count: 1 };
    const record = Object.fromEntries([
      ['id', '1'], ['left', shared], ['right', shared], ['__proto__', { admin: true }],
    ]);
    f.emit(0, { action: 'create', record });
    const payload = requireValue(events[0]).payload;
    expect(payload['left']).toEqual({ count: 1 });
    expect(payload['left']).not.toBe(payload['right']);
    expect(Object.getPrototypeOf(payload)).toBe(Object.prototype);
    expect(Object.hasOwn(payload, '__proto__')).toBe(true);
    expect(payload['admin']).toBeUndefined();
    f.resolve(0, async () => {});
    await flush();
    cancel();
  });

  test('does not report a setup rejection after intentional cancellation', async () => {
    const f = fixture();
    const cancel = f.provider.subscribe({ resource: 'posts', callback: () => {} });
    cancel();
    f.reject(0, new Error('secret'));
    await flush();
    expect(f.onError).not.toHaveBeenCalled();
  });

  test('handles asynchronous callback rejection without leaking it to the event loop', async () => {
    const f = fixture();
    const cancel = f.provider.subscribe({
      resource: 'posts', callback: async () => { throw new Error('secret'); },
    });
    f.emit(0, { action: 'update', record: { id: '1' } });
    await flush();
    expect(f.onError.mock.calls.map(([error]) => error.code)).toEqual(['CALLBACK_FAILED']);
    f.resolve(0, async () => {});
    await flush();
    cancel();
  });

  test('uses the real SDK collection subscription and its individual disposer', async () => {
    const pb = new PocketBase('https://pocketbase.example', new BaseAuthStore());
    const dispose = mock(async () => {});
    const subscribe = mock(async (_topic: string, _callback: (event: unknown) => void) => dispose);
    pb.realtime.subscribe = subscribe;
    const provider = createPocketBaseLiveProvider({ pb });
    const events: LiveEvent[] = [];
    const cancel = provider.subscribe({ resource: 'posts', callback: event => events.push(event) });
    await flush();
    const [topic, callback] = requireValue(subscribe.mock.calls[0]);
    expect(topic).toBe('posts/*');
    callback({ action: 'delete', record: { id: '1' } });
    expect(events).toEqual([{ type: 'DELETE', resource: 'posts', payload: { id: '1' } }]);
    cancel();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
