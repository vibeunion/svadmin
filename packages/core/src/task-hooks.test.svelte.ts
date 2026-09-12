import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { resetContext } from './context.svelte';
import { parseQueryKey } from './query-keys';
import type { TaskProvider, TaskRecord, SubmitTaskOptions } from './types';
import type { TaskHookState } from './task-hooks.test.types';
import TaskHookHost from './task-hooks.test-host.svelte';

const clients: QueryClient[] = [];
function fixture(overrides: Partial<TaskProvider> = {}) {
  const listeners: ((task: TaskRecord) => void)[] = [];
  const stop = vi.fn();
  const provider = {
    submit: vi.fn(async (_name: string, _options?: SubmitTaskOptions) => ({
      id: 'task-1', wait: async () => ({ id: 'task-1', status: 'done' }),
    })),
    get: vi.fn(async (id: string) => ({ id, status: 'running' })),
    list: vi.fn(async (_params?: Record<string, unknown>) => ({ data: [{ id: 'task-1', status: 'queued' }], total: 1 })),
    subscribe: vi.fn((_id: string, callback: (task: TaskRecord) => void) => {
      listeners.push(callback);
      return stop;
    }),
    ...overrides,
  };
  return { provider, listeners, stop };
}
function mount(provider: TaskProvider, onTask?: (task: TaskRecord) => void, onError?: (error: Error) => void) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(queryClient);
  let state: TaskHookState | undefined;
  const view = render(TaskHookHost, {
    provider, queryClient,
    ...(onTask ? { onTask } : {}),
    ...(onError ? { onError } : {}),
    onReady: (value: TaskHookState) => { state = value; },
  });
  return {
    view, queryClient,
    read() {
      if (!state) throw new Error('Task hooks have not mounted.');
      return state;
    },
  };
}
function deferred() {
  let resolve = (_value: TaskRecord) => {};
  const promise = new Promise<TaskRecord>(complete => { resolve = complete; });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
});

describe('task hooks with the actual query runtime', () => {
  it('supports disabled task queries before a provider is configured', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    clients.push(queryClient);
    const states: TaskHookState[] = [];
    const view = render(TaskHookHost, {
      queryClient, enabled: false, onReady: (state: TaskHookState) => states.push(state),
    });
    await waitFor(() => expect(states).toHaveLength(1));
    const state = states[0];
    if (!state) throw new Error('Expected disabled query state.');
    expect(state.task.fetchStatus).toBe('idle');
    expect(state.list.fetchStatus).toBe('idle');
    expect(state.task.error).toBeNull();
    expect(state.list.error).toBeNull();
    const { provider } = fixture();
    await view.rerender({ provider, enabled: true });
    await waitFor(() => expect(state.task.data?.id).toBe('task-1'));
    await waitFor(() => expect(state.list.data?.data[0]?.id).toBe('task-1'));
  });

  it('submits validated tasks with owning tenant metadata and a checked wait result', async () => {
    const { provider } = fixture();
    const app = mount(provider);
    await waitFor(() => expect(app.read().task.isSuccess).toBe(true));
    const handle = await app.read().submit.mutation.mutateAsync({
      taskName: 'image.generate', options: { body: { prompt: 'poster' } },
      successNotification: false,
    });
    expect(handle.id).toBe('task-1');
    await expect(handle.wait()).resolves.toEqual({ id: 'task-1', status: 'done' });
    expect(provider.submit).toHaveBeenCalledWith('image.generate', {
      body: { prompt: 'poster' }, meta: { tenantId: 'tenant-1' },
    });
  });

  it('invalidates the submission tenant even after the active tenant changes', async () => {
    let finish = () => {};
    const pending = new Promise<void>(resolve => { finish = resolve; });
    const { provider } = fixture({
      submit: async () => {
        await pending;
        return { id: 'submitted-task', wait: async () => ({ id: 'submitted-task' }) };
      },
    });
    const submit = vi.spyOn(provider, 'submit');
    const app = mount(provider);
    await waitFor(() => expect(app.read().list.isSuccess).toBe(true));
    const invalidation = vi.spyOn(app.queryClient, 'invalidateQueries');
    const submission = app.read().submit.mutation.mutateAsync({
      taskName: 'function', successNotification: false,
    });
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    await app.view.rerender({ tenant: 'tenant-2' });
    await waitFor(() => expect(app.queryClient.getQueryCache().getAll().some(
      query => parseQueryKey(query.queryKey)?.tenant === 'tenant-2',
    )).toBe(true));
    finish();
    await submission;
    expect(submit).toHaveBeenCalledWith('function', { meta: { tenantId: 'tenant-1' } });
    const matches = invalidation.mock.calls[0]?.[0]?.predicate;
    if (!matches) throw new Error('Expected scoped invalidation.');
    const affected = app.queryClient.getQueryCache().getAll().filter(matches).map(query => parseQueryKey(query.queryKey)?.tenant);
    expect(affected).toEqual(['tenant-1']);
  });

  it('returns checked single/list records and preserves reactive query members', async () => {
    const { provider } = fixture();
    const app = mount(provider);
    await waitFor(() => expect(app.read().task.data?.status).toBe('running'));
    await waitFor(() => expect(app.read().list.data?.total).toBe(1));
    expect(app.read().list.data?.data[0]?.id).toBe('task-1');
    expect(app.read().task.overtime).toBeDefined();
    await app.view.rerender({ taskId: 'task-2' });
    await waitFor(() => expect(app.read().task.data?.id).toBe('task-2'));
    expect(provider.get).toHaveBeenCalledWith('task-2');
  });

  it('does not admit malformed task records into query cache', async () => {
    const { provider } = fixture({ get: async id => ({ id, status: '' }) });
    const app = mount(provider);
    await waitFor(() => expect(app.read().task.isError).toBe(true));
    expect(app.read().task.error).toMatchObject({ code: 'INVALID_TASK_RESPONSE' });
    expect(app.read().task.data).toBeUndefined();
  });

  it('rejects invalid list totals and sanitizes provider failures', async () => {
    const { provider } = fixture({
      get: async () => { throw new Error('secret service details'); },
      list: async () => ({ data: [], total: -1 }),
    });
    const app = mount(provider);
    await waitFor(() => expect(app.read().task.isError && app.read().list.isError).toBe(true));
    expect(app.read().task.error).toMatchObject({ code: 'TASK_PROVIDER_FAILED', message: 'Task request failed.' });
    expect(app.read().list.error).toMatchObject({ code: 'INVALID_TASK_RESPONSE' });
  });

  it('binds in-flight queries to the ID captured by their key', async () => {
    const pending = deferred();
    const { provider } = fixture({ get: id => id === 'task-1' ? pending.promise : Promise.resolve({ id }) });
    const app = mount(provider);
    await app.view.rerender({ taskId: 'task-2' });
    await waitFor(() => expect(app.read().task.data?.id).toBe('task-2'));
    pending.resolve({ id: 'task-1', title: 'old' });
    await waitFor(() => {
      const old = app.queryClient.getQueryCache().getAll().find(query => parseQueryKey(query.queryKey)?.id === 'task-1');
      expect(old?.state.data).toMatchObject({ id: 'task-1' });
    });
    expect(app.read().task.data?.id).toBe('task-2');
  });

  it('separates provider overrides with identical tenant and task IDs', async () => {
    const pending = deferred();
    const old = fixture({ get: () => pending.promise });
    const fresh = fixture({ get: async id => ({ id, title: 'fresh' }) });
    const app = mount(old.provider);
    await app.view.rerender({ provider: fresh.provider });
    await waitFor(() => expect(app.read().task.data?.title).toBe('fresh'));
    pending.resolve({ id: 'task-1', title: 'stale' });
    await pending.promise;
    await waitFor(() => {
      const details = app.queryClient.getQueryCache().getAll().filter(query => parseQueryKey(query.queryKey)?.action === 'one');
      expect(details).toHaveLength(2);
    });
    expect(app.read().task.data?.title).toBe('fresh');
  });

  it('validates subscription records and ignores events after unmount', async () => {
    const { provider, listeners, stop } = fixture();
    const onTask = vi.fn((_task: TaskRecord) => {});
    const app = mount(provider, onTask);
    await waitFor(() => expect(listeners).toHaveLength(1));
    const listener = listeners[0];
    if (!listener) throw new Error('Expected listener.');
    listener({ id: 'task-1', status: 'running' });
    expect(onTask).toHaveBeenCalledWith({ id: 'task-1', status: 'running' });
    app.view.unmount();
    listener({ id: 'task-1', status: 'done' });
    expect(onTask).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('reports malformed subscription data and terminates that subscription', async () => {
    const { provider, listeners, stop } = fixture();
    const onTask = vi.fn((_task: TaskRecord) => {});
    const onError = vi.fn((_error: Error) => {});
    mount(provider, onTask, onError);
    await waitFor(() => expect(listeners).toHaveLength(1));
    const listener = listeners[0];
    if (!listener) throw new Error('Expected listener.');
    listener({ id: 'wrong-task' });
    listener({ id: 'task-1' });
    expect(onTask).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TASK_RESPONSE' }));
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
