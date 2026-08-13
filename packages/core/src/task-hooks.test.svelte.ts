/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { useSubmitTask, useTask, useTaskList, useTaskSubscription } from './task-hooks.svelte';
import { keys, parseQueryKey } from './query-keys';

const mockTaskProvider = {
  submit: vi.fn(async () => ({
    id: 'task-1',
    wait: async () => ({ id: 'task-1', status: 'done' }),
  })),
  get: vi.fn(async (taskId: string) => ({ id: taskId, status: 'running' })),
  list: vi.fn(async () => ({ data: [{ id: 'task-1', status: 'queued' }], total: 1 })),
  listDlq: vi.fn(async () => ({ data: [{ id: 'task-2', status: 'failed' }], total: 1 })),
  subscribe: vi.fn((_taskId: string, callback: (task: { id: string; status: string }) => void) => {
    callback({ id: 'task-1', status: 'running' });
    return () => {};
  }),
};

vi.mock('./context.svelte', () => ({
  captureAdminContext: () => ({
    providers: null,
    authProvider: null,
    resources: [],
    routerProvider: undefined,
    liveProvider: undefined,
    taskProvider: mockTaskProvider,
    getDataProvider: vi.fn(),
    getDataProviderNames: () => [],
    getDataProviderForResource: vi.fn(),
    queryKeys: () => keys(),
    queryKeyMatcher: () => ({ provider: 'default', tenant: undefined }),
    getResource: vi.fn(),
    currentPath: () => '/',
    formatLink: (path: string) => path,
    navigate: vi.fn(async () => {}),
    back: vi.fn(),
  }),
  getTaskProvider: () => mockTaskProvider,
  getAuthProvider: () => null,
}));

vi.mock('./notification.svelte', () => ({
  notify: vi.fn(),
  notifyWithProvider: vi.fn(),
}));

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    useQueryClient: () => new QueryClient(),
    createMutation: (factory: any) => {
      const config = factory();
      return {
        mutateAsync: async (vars: unknown) => config.mutationFn(vars),
        mutate: vi.fn(),
        isPending: false,
      };
    },
    createQuery: (factory: any) => {
      const config = factory();
      return {
        data: parseQueryKey(config.queryKey)?.action === 'list'
          ? { data: [{ id: 'task-1', status: 'queued' }], total: 1 }
          : { id: 'task-1', status: 'running' },
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
      };
    },
  };
});

describe('task-hooks', () => {
  it('useSubmitTask exposes a working mutation', async () => {
    let submitTask: ReturnType<typeof useSubmitTask>;

    const cleanup = $effect.root(() => {
      submitTask = useSubmitTask();
    });

    flushSync();

    const handle = await submitTask!.mutation.mutateAsync({
      taskName: 'image.generate',
      options: { body: { prompt: 'poster' } },
    });

    expect(handle.id).toBe('task-1');
    expect(mockTaskProvider.submit).toHaveBeenCalledWith('image.generate', {
      body: { prompt: 'poster' },
    });

    cleanup();
  });

  it('useTask returns query state for a single task', () => {
    let taskQuery: ReturnType<typeof useTask>;

    const cleanup = $effect.root(() => {
      taskQuery = useTask({ taskId: 'task-1' });
    });

    flushSync();

    expect(taskQuery!.data).toBeDefined();
    expect((taskQuery!.data as any).status).toBe('running');

    cleanup();
  });

  it('useTaskList returns task collection data', () => {
    let taskListQuery: ReturnType<typeof useTaskList>;

    const cleanup = $effect.root(() => {
      taskListQuery = useTaskList();
    });

    flushSync();

    expect(taskListQuery!.data).toBeDefined();
    expect((taskListQuery!.data as any).data[0].id).toBe('task-1');

    cleanup();
  });

  it('useTaskSubscription subscribes to task updates', () => {
    const onTask = vi.fn();

    const cleanup = $effect.root(() => {
      useTaskSubscription({
        taskId: 'task-1',
        onTask,
      });
    });

    flushSync();

    expect(mockTaskProvider.subscribe).toHaveBeenCalledWith('task-1', expect.any(Function));
    expect(onTask).toHaveBeenCalledWith({ id: 'task-1', status: 'running' });

    cleanup();
  });
});
