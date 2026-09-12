import { afterEach, describe, expect, mock, test } from 'bun:test';
import { createClient } from '@supabase/supabase-js';
import { createSupaCloudClient } from '@supacloud/js';
import {
  createSupaCloudTaskProvider, createSupaCloudTaskLiveProvider,
  type SupaCloudTaskClient, type SupaCloudTaskSubscribeOptions,
  type SupaCloudTaskSdkSubmitOptions, type SupaCloudTaskRecord,
} from './supacloud';
import { TaskError } from '@svadmin/core/schema';

const task = { id: 'task-1', status: 'running', progress: null, updated_at: null } satisfies SupaCloudTaskRecord;
function snapshot(raw = task) {
  return { id: raw.id, status: raw.status, progress: raw.progress, error: null, updatedAt: raw.updated_at, raw };
}
function receipt(id = 'task-1') {
  return {
    taskId: id, status: 'enqueued',
    wait: async () => ({ id, status: 'succeeded', result: { ok: true } }),
    cancel: async () => ({ id, status: 'cancelled' }),
    retry: async () => ({ id, status: 'retry_scheduled' }),
    subscribe: (_options: SupaCloudTaskSubscribeOptions) => ({ unsubscribe: () => {} }),
  };
}
function fixture(overrides: Partial<SupaCloudTaskClient['tasks']> = {}) {
  const listeners: SupaCloudTaskSubscribeOptions[] = [];
  const unsubscribe = mock(() => {});
  const onError = mock((_error: TaskError) => {});
  const tasks = {
    submit: mock(async (_name: string, _options?: SupaCloudTaskSdkSubmitOptions) => receipt()),
    get: mock(async (_id: string) => task),
    list: mock(async () => [task]),
    listDlq: mock(async (_limit?: number) => [task]),
    cancel: mock(async (id: string) => ({ id, status: 'cancelled' })),
    retry: mock(async (id: string) => ({ id, status: 'retry_scheduled' })),
    subscribe: mock((_id: string, options: SupaCloudTaskSubscribeOptions) => {
      listeners.push(options);
      return { unsubscribe };
    }),
    ...overrides,
  };
  const client = { tasks };
  const provider = createSupaCloudTaskProvider({ supacloud: client, onError });
  return { client, provider, onError, unsubscribe, listeners };
}
function firstListener(listeners: SupaCloudTaskSubscribeOptions[]) {
  const listener = listeners[0];
  if (!listener) throw new Error('Expected registered listener.');
  return listener;
}

describe('SupaCloud validated task bridge', () => {
  test('rejects legacy and incomplete clients instead of asserting compatibility', () => {
    for (const client of [
      null, {}, { submit: async () => receipt(), get: async () => task }, { tasks: {} },
      { tasks: 1 }, { tasks: [] }, { get tasks() { throw new Error('secret config'); } },
      { tasks: { get submit() { throw new Error('secret method'); } } },
    ]) {
      expect(() => Reflect.apply(createSupaCloudTaskProvider, undefined, [{ supacloud: client }]))
        .toThrow('Invalid task input.');
      expect(() => Reflect.apply(createSupaCloudTaskLiveProvider, undefined, [{ supacloud: client }]))
        .toThrow('Invalid task input.');
    }
  });

  test('rejects malformed options and callbacks without leaking configuration errors', () => {
    const { client } = fixture();
    for (const value of [
      null, [], { get supacloud() { throw new Error('secret config'); } },
      { supacloud: client, onError: 'not a function' },
      { supacloud: client, get onError() { throw new Error('secret callback'); } },
    ]) {
      for (const factory of [createSupaCloudTaskProvider, createSupaCloudTaskLiveProvider]) {
        expect(() => Reflect.apply(factory, undefined, [value])).toThrow('Invalid task input.');
      }
    }
    expect(() => Reflect.apply(createSupaCloudTaskLiveProvider, undefined, [{ supacloud: client, mapTaskToEvent: true }]))
      .toThrow('Invalid task input.');
  });

  test('maps submission metadata and returns a validated handle with SDK receivers preserved', async () => {
    const original = {
      ...receipt(),
      async wait() { return { id: this.taskId, status: 'succeeded' }; },
      async cancel() { return { id: this.taskId, status: 'cancelled' }; },
      async retry() { return { id: this.taskId, status: 'retry_scheduled' }; },
    };
    const submit = mock(async (_name: string, _options?: SupaCloudTaskSdkSubmitOptions) => original);
    const { provider } = fixture({ submit });
    const handle = await provider.submit('aorist-ai/generate/crop', {
      body: { prompt: 'poster' }, headers: { 'x-trace': '1' },
      idempotencyKey: 'job-1', meta: { tenant: 'acme' },
    });
    expect(submit).toHaveBeenCalledWith('aorist-ai/generate/crop', {
      body: { prompt: 'poster' }, headers: { 'x-trace': '1' },
      idempotencyKey: 'job-1', metadata: { tenant: 'acme' },
    });
    expect(handle).not.toBe(original);
    expect(handle.id).toBe('task-1');
    await expect(handle.wait()).resolves.toEqual({ id: 'task-1', status: 'succeeded' });
    await expect(handle.cancel()).resolves.toEqual({ id: 'task-1', status: 'cancelled' });
    await expect(handle.retry()).resolves.toEqual({ id: 'task-1', status: 'retry_scheduled' });
    original.wait = async () => ({ id: 'wrong', status: 'succeeded' });
    await expect(handle.wait()).resolves.toEqual({ id: 'task-1', status: 'succeeded' });
  });

  test('rejects invalid submission names, payloads and conflicting transport headers before dispatch', async () => {
    const { provider, client } = fixture();
    for (const name of ['', '../task', 'task?mode=sync', 'task#fragment', '/task', 'task//run']) {
      await expect(provider.submit(name)).rejects.toMatchObject({ code: 'INVALID_TASK_INPUT', writeMayHaveSucceeded: false });
    }
    for (const options of [
      null, [], { body: [] }, { body: { value: undefined } }, { idempotencyKey: 'bad\r\nheader' },
      { headers: { 'bad key': 'value' } }, { headers: { 'x-supacloud-task-metadata': '{}' } },
      { headers: { 'X-SupaCloud-Idempotency-Key': 'override' } }, { unknown: true },
    ]) {
      const result: unknown = Reflect.apply(provider.submit, provider, ['function', options]);
      await expect(result).rejects.toMatchObject({ code: 'INVALID_TASK_INPUT' });
    }
    expect(client.tasks.submit).not.toHaveBeenCalled();
  });

  test('snapshots caller submission objects before SDK dispatch', async () => {
    let release = () => {};
    const pending = new Promise<void>(resolve => { release = resolve; });
    const submitted: unknown[] = [];
    const { provider } = fixture({
      async submit(_name, params) {
        await pending;
        submitted.push(params);
        return receipt();
      },
    });
    const options = { body: { value: 'original' }, meta: { tenant: 'a' } };
    const result = provider.submit('function', options);
    options.body.value = 'changed';
    options.meta.tenant = 'b';
    release();
    await result;
    expect(submitted).toEqual([{ body: { value: 'original' }, metadata: { tenant: 'a' } }]);
  });

  test('rejects malformed submission receipts and retains write uncertainty', async () => {
    const getStatus = mock(() => 'enqueued');
    for (const value of [
      null, {}, { ...receipt(), taskId: '' }, { ...receipt(), status: '42' },
      { ...receipt(), wait: null }, { ...receipt(), cancel: undefined },
      Object.defineProperty(receipt(), 'status', { get: getStatus }),
    ]) {
      await expect(fixture({ submit: async () => value }).provider.submit('function'))
        .rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE', writeMayHaveSucceeded: true });
    }
    expect(getStatus).not.toHaveBeenCalled();
  });

  test('validates IDs before invoking read and write methods', async () => {
    const { provider, client } = fixture();
    for (const id of ['', '../other', 'task?limit=2', 'a/b', 'task#x']) {
      await expect(provider.get(id)).rejects.toMatchObject({ code: 'INVALID_TASK_INPUT' });
      await expect(provider.cancel(id)).rejects.toMatchObject({ code: 'INVALID_TASK_INPUT' });
      await expect(provider.retry(id)).rejects.toMatchObject({ code: 'INVALID_TASK_INPUT' });
      expect(() => provider.subscribe(id, () => {})).toThrow('Invalid task input.');
    }
    expect(client.tasks.get).not.toHaveBeenCalled();
    expect(client.tasks.cancel).not.toHaveBeenCalled();
    expect(client.tasks.retry).not.toHaveBeenCalled();
    expect(client.tasks.subscribe).not.toHaveBeenCalled();
  });

  test('rejects malformed and mismatched tasks at every read/write boundary', async () => {
    for (const value of [
      null, {}, { id: 'other', status: 'running' }, { ...task, status: 'done' },
      { ...task, progress: '12' }, { ...task, result: { unsafe: undefined } },
    ]) {
      const { provider } = fixture({
        get: async () => value, cancel: async () => value, retry: async () => value,
      });
      await expect(provider.get('task-1')).rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE', writeMayHaveSucceeded: false });
      await expect(provider.cancel('task-1')).rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE', writeMayHaveSucceeded: true });
      await expect(provider.retry('task-1')).rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE', writeMayHaveSucceeded: true });
    }
  });

  test('requires a matching terminal record from wait, not a queued intermediate response', async () => {
    for (const value of [{ id: 'other', status: 'succeeded' }, task, null]) {
      const { provider } = fixture({ submit: async () => ({ ...receipt(), wait: async () => value }) });
      const handle = await provider.submit('function');
      await expect(handle.wait()).rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE' });
    }
  });

  test('validates SDK array lists and closed list/DLQ filters', async () => {
    const { provider, client } = fixture();
    expect(await provider.list({ status: ['running', 'queued'], limit: 2 })).toEqual({ data: [task], total: 1 });
    expect(await provider.listDlq({ limit: 7 })).toEqual({ data: [task], total: 1 });
    expect(client.tasks.listDlq).toHaveBeenCalledWith(7);
    for (const params of [null, { limit: 0 }, { limit: 1.5 }, { limit: Infinity }, { status: [] }, { tenantId: 'other' }]) {
      const result: unknown = Reflect.apply(provider.list, provider, [params]);
      await expect(result).rejects.toMatchObject({ code: 'INVALID_TASK_INPUT' });
    }
    for (const value of [null, { data: [task] }, [task, {}]]) {
      const invalid = fixture({ list: async () => value, listDlq: async () => value }).provider;
      await expect(invalid.list()).rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE' });
      await expect(invalid.listDlq()).rejects.toMatchObject({ code: 'INVALID_TASK_RESPONSE' });
    }
    const rejected: unknown = Reflect.apply(provider.listDlq, provider, [{ limit: 3, status: 'failed' }]);
    await expect(rejected).rejects.toMatchObject({ code: 'INVALID_TASK_INPUT' });
  });

  test('sanitizes SDK exceptions and distinguishes unconfirmed writes from reads', async () => {
    const fail = async () => { throw new Error('secret service details'); };
    const { provider } = fixture({ get: fail, submit: fail, cancel: fail, retry: fail, list: fail, listDlq: fail });
    for (const operation of [() => provider.get('task-1'), () => provider.list(), () => provider.listDlq()]) {
      await expect(operation()).rejects.toMatchObject({
        code: 'TASK_PROVIDER_FAILED', message: 'Task request failed.', writeMayHaveSucceeded: false,
      });
    }
    for (const operation of [() => provider.submit('function'), () => provider.cancel('task-1'), () => provider.retry('task-1')]) {
      await expect(operation()).rejects.toMatchObject({
        code: 'TASK_PROVIDER_FAILED', message: 'Task request failed.', writeMayHaveSucceeded: true,
      });
    }
  });
});

describe('SupaCloud task subscriptions', () => {
  test('decodes raw SDK snapshots, isolates nested data and discards late events after cleanup', () => {
    const { provider, listeners, unsubscribe, onError } = fixture();
    const received: SupaCloudTaskRecord[] = [];
    const stop = provider.subscribe('task-1', value => received.push(value));
    const raw = { ...task, result: { value: 'original' } };
    const listener = firstListener(listeners);
    listener.onUpdate(snapshot(raw));
    raw.result.value = 'changed';
    expect(received[0]?.result).toEqual({ value: 'original' });
    expect(Object.hasOwn(received[0] ?? {}, 'raw')).toBe(false);
    stop();
    stop();
    listener.onUpdate(snapshot());
    listener.onError(new Error('late failure'));
    expect(received).toHaveLength(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  test('does not trust SDK-coerced fields instead of the raw record or mismatched summary data', () => {
    for (const event of [
      task, { ...snapshot(), raw: { ...task, id: 1 } },
      { ...snapshot(), raw: { ...task, status: 42 } },
      { ...snapshot(), id: 'other' }, { ...snapshot(), status: 'failed' },
      { ...snapshot(), progress: 25 },
    ]) {
      const { provider, listeners, onError, unsubscribe } = fixture();
      const callback = mock((_task: SupaCloudTaskRecord) => {});
      provider.subscribe('task-1', callback);
      firstListener(listeners).onUpdate(event);
      expect(callback).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TASK_RESPONSE' }));
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    }
  });

  test('buffers synchronous updates until registration succeeds and requires a cleanup handle', () => {
    for (const handle of [undefined, null, {}, { unsubscribe: 1 }]) {
      const callback = mock((_task: SupaCloudTaskRecord) => {});
      const { provider } = fixture({
        subscribe(_id, options) { options.onUpdate(snapshot()); return handle; },
      });
      expect(() => provider.subscribe('task-1', callback)).toThrow('Task subscription failed.');
      expect(callback).not.toHaveBeenCalled();
    }
    const { provider } = fixture({
      subscribe(_id, options) { options.onUpdate(snapshot()); return { unsubscribe() {} }; },
    });
    const callback = mock((_task: SupaCloudTaskRecord) => {});
    provider.subscribe('task-1', callback)();
    expect(callback).toHaveBeenCalledWith(task);
  });

  test('cleans up a subscription that fails before registration returns', () => {
    const unsubscribe = mock(() => {});
    const { provider, onError } = fixture({
      subscribe(_id, options) { options.onUpdate(null); return { unsubscribe }; },
    });
    provider.subscribe('task-1', () => {})();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  test('rejects asynchronous registration without an unhandled rejection', async () => {
    const { provider } = fixture({
      subscribe: async () => { throw new Error('secret async registration'); },
    });
    expect(() => provider.subscribe('task-1', () => {})).toThrow('Task subscription failed.');
    await Promise.resolve();
  });

  test('sanitizes asynchronous SDK and callback failures', () => {
    const { provider, onError, listeners, unsubscribe } = fixture();
    provider.subscribe('task-1', () => { throw new Error('secret callback'); });
    firstListener(listeners).onUpdate(snapshot());
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({
      code: 'TASK_CALLBACK_FAILED', message: 'Task callback failed.',
    }));
    firstListener(listeners).onError(new Error('secret SDK failure'));
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({
      code: 'TASK_SUBSCRIPTION_FAILED', message: 'Task subscription failed.',
    }));
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test('handles rejected callback promises without leaking their payloads', async () => {
    const { provider, listeners, onError } = fixture();
    const stop = provider.subscribe('task-1', async () => { throw new Error('secret async callback'); });
    firstListener(listeners).onUpdate(snapshot());
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      code: 'TASK_CALLBACK_FAILED', message: 'Task callback failed.',
    }));
    stop();
  });

  test('rejects invalid subscription callbacks before SDK registration', () => {
    const { provider, client } = fixture();
    for (const args of [['task-1', null], ['task-1', () => {}, 'secret-invalid-callback']]) {
      expect(() => Reflect.apply(provider.subscribe, provider, args)).toThrow('Invalid task input.');
    }
    expect(client.tasks.subscribe).not.toHaveBeenCalled();
  });

  test('validates receipt subscriptions as well as client subscriptions', async () => {
    let listener: SupaCloudTaskSubscribeOptions | undefined;
    const unsubscribe = mock(() => {});
    const { provider } = fixture({
      submit: async () => ({ ...receipt(), subscribe(options: SupaCloudTaskSubscribeOptions) {
        listener = options;
        return { unsubscribe };
      } }),
    });
    const callback = mock((_task: SupaCloudTaskRecord) => {});
    const handle = await provider.submit('function');
    const stop = handle.subscribe(callback);
    if (!listener) throw new Error('Expected receipt listener.');
    listener.onUpdate(snapshot());
    expect(callback).toHaveBeenCalledWith(task);
    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test('validates custom live events and never forwards malformed mapper output', () => {
    for (const mapped of [null, { type: 'INVALID', resource: 'tasks', payload: {} }, { type: 'UPDATE', resource: 'other', payload: {} }]) {
      const { client, listeners, onError, unsubscribe } = fixture();
      const live = createSupaCloudTaskLiveProvider({ supacloud: client, mapTaskToEvent: () => mapped, onError });
      const callback = mock(() => {});
      const stop = live.subscribe({ resource: 'tasks', liveParams: { taskId: 'task-1' }, callback });
      firstListener(listeners).onUpdate(snapshot());
      expect(callback).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TASK_RESPONSE' }));
      expect(unsubscribe).toHaveBeenCalledTimes(1);
      stop();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    }
  });

  test('distinguishes a throwing live mapper from an invalid mapped event', () => {
    const { client, listeners, onError, unsubscribe } = fixture();
    const live = createSupaCloudTaskLiveProvider({
      supacloud: client, onError,
      mapTaskToEvent() { throw new Error('secret mapper'); },
    });
    const callback = mock(() => {});
    live.subscribe({ resource: 'tasks', liveParams: { taskId: 'task-1' }, callback });
    firstListener(listeners).onUpdate(snapshot());
    expect(callback).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      code: 'TASK_CALLBACK_FAILED', message: 'Task callback failed.',
    }));
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test('requires valid live subscription scope and maps valid task events', () => {
    const { client, listeners } = fixture();
    const live = createSupaCloudTaskLiveProvider({ supacloud: client });
    expect(() => live.subscribe({ resource: 'tasks', callback() {} })).toThrow('Invalid task input.');
    expect(() => live.subscribe({ resource: '', liveParams: { taskId: 'task-1' }, callback() {} })).toThrow('Invalid task input.');
    const callback = mock(() => {});
    const stop = live.subscribe({ resource: 'tasks', liveParams: { taskId: 'task-1' }, callback });
    firstListener(listeners).onUpdate(snapshot());
    expect(callback).toHaveBeenCalledWith({ type: 'UPDATE', resource: 'tasks', payload: task });
    stop();
  });
});

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('installed SupaCloud SDK', () => {
  test('decodes real SDK subscription summaries and blocks SDK callbacks after unsubscribe', async () => {
    const supabase = createClient('https://sdk.example.test', 'test-anon-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const channel = supabase.channel('supacloud-task:project-1:task-1');
    channel.subscribe = () => channel;
    const sdk = createSupaCloudClient({
      supabase, managementApiUrl: 'https://management.example.test', projectRef: 'project-1',
      getAccessToken: () => 'test-management-token',
    });
    const provider = createSupaCloudTaskProvider({ supacloud: sdk });
    const received: SupaCloudTaskRecord[] = [];
    const stop = provider.subscribe('task-1', task => received.push(task));
    try {
      const binding = channel.bindings['postgres_changes']?.[0];
      if (!binding) throw new Error('Expected the real SDK postgres binding.');
      const raw = { ...task, result: { ok: true } };
      binding.callback({ new: raw, old: {} }, undefined, 'test-join');
      expect(received).toEqual([raw]);
      stop();
      binding.callback({ new: raw, old: {} }, undefined, 'test-join');
      expect(received).toHaveLength(1);
      for (let index = 0; index < 20; index++) await Promise.resolve();
      expect(supabase.getChannels()).toHaveLength(0);
    } finally { stop(); }
  });

  test('uses real submit, metadata headers, management routes, wait, list, cancel and retry', async () => {
    const requests: { url: string; method: string; metadata: string | null; body: unknown }[] = [];
    globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const body: unknown = request.method === 'GET' || !request.body ? null : await request.json();
      requests.push({
        url: request.url, method: request.method,
        metadata: request.headers.get('x-supacloud-task-metadata'), body,
      });
      const path = new URL(request.url).pathname;
      const data = path.startsWith('/functions/v1/') ? { task_id: 'task-1', status: 'enqueued' }
        : path.endsWith('/cancel') ? { id: 'task-1', status: 'cancelled' }
        : path.endsWith('/retry') ? { id: 'task-1', status: 'retry_scheduled' }
        : path.endsWith('/tasks') || path.endsWith('/dlq') ? [{ ...task, status: 'succeeded' }]
        : { ...task, status: 'succeeded' };
      return Response.json(data);
    }, { preconnect() {} });
    const supabase = createClient('https://sdk.example.test', 'test-anon-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const sdk = createSupaCloudClient({
      supabase, managementApiUrl: 'https://management.example.test', projectRef: 'project-1',
      getAccessToken: () => 'test-management-token',
    });
    const provider = createSupaCloudTaskProvider({ supacloud: sdk });
    const handle = await provider.submit('aorist/generate', { body: { prompt: 'poster' }, meta: { tenant: 'a' } });
    expect(handle.id).toBe('task-1');
    expect((await handle.wait()).status).toBe('succeeded');
    expect((await provider.get('task-1')).progress).toBeNull();
    expect((await provider.list({ status: 'succeeded', limit: 2 })).total).toBe(1);
    expect((await provider.listDlq({ limit: 7 })).total).toBe(1);
    expect((await handle.cancel()).status).toBe('cancelled');
    expect((await handle.retry()).status).toBe('retry_scheduled');
    expect(requests[0]).toEqual({
      url: 'https://sdk.example.test/functions/v1/aorist/generate', method: 'POST',
      metadata: '{"tenant":"a"}', body: { prompt: 'poster' },
    });
    expect(requests.map(request => request.url)).toContain(
      'https://management.example.test/v1/projects/project-1/tasks?status=succeeded&limit=2',
    );
    expect(requests.map(request => request.url)).toContain(
      'https://management.example.test/v1/projects/project-1/tasks/dlq?limit=7',
    );
  });
});
