import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { keys } from './query-keys';
import { DeleteManyPartialError, UndoError } from './types';

const state = vi.hoisted(() => ({
  queryClient: undefined as QueryClient | undefined,
  mutationConfig: undefined as Record<string, (...args: unknown[]) => unknown> | undefined,
  provider: { deleteMany: vi.fn() } as Record<string, unknown>,
  authProvider: undefined as { onError: ReturnType<typeof vi.fn> } | undefined,
  toastUndoable: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/svelte-query')>();
  return {
    ...actual,
    useQueryClient: () => state.queryClient,
    createMutation: (factory: () => Record<string, (...args: unknown[]) => unknown>) => {
      state.mutationConfig = factory();
      return { isPending: false };
    },
  };
});

vi.mock('./context.svelte', () => ({
  captureAdminContext: () => ({
    authProvider: state.authProvider,
    notificationProvider: undefined,
    auditLogProvider: undefined,
    liveProvider: undefined,
    getDataProviderForResource: () => state.provider,
    getProviderMeta: () => undefined,
    getResource: () => ({ name: 'posts', primaryKey: 'id' }),
    queryKeyMatcher: (_resource: string, provider?: string) => ({
      provider: provider ?? 'default',
      tenant: undefined,
    }),
  }),
}));

vi.mock('./useParsed.svelte', () => ({ useParsed: () => ({ resource: 'posts' }) }));
vi.mock('./options.svelte', () => ({ getAdminOptions: () => ({ mutationMode: 'pessimistic', undoableTimeout: 5000 }) }));
vi.mock('./i18n.svelte', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./toast.svelte', () => ({
  toast: {
    success: state.toastSuccess,
    error: state.toastError,
    warning: vi.fn(),
    info: vi.fn(),
    undoable: state.toastUndoable,
  },
}));

import { useDeleteMany } from './hooks.svelte';

type MutationParams = {
  resource: string;
  ids: (string | number)[];
};

function createMutationConfig(options: Record<string, unknown> = { mutationMode: 'optimistic' }) {
  const cleanup = $effect.root(() => {
    useDeleteMany({ resource: 'posts', ...options });
  });
  flushSync();
  const config = state.mutationConfig;
  if (!config) throw new Error('Mutation config was not created');
  return { config, cleanup };
}

function getQueryClient(): QueryClient {
  if (!state.queryClient) throw new Error('QueryClient was not initialized');
  return state.queryClient;
}

function seedCaches(queryClient: QueryClient) {
  const queryKeys = keys();
  const records = [{ id: 1, title: 'One' }, { id: 2, title: 'Two' }];
  queryClient.setQueryData(queryKeys.data.list('posts'), { data: records, total: 2 });
  queryClient.setQueryData(queryKeys.data.select('posts'), { data: records, total: 2 });
  queryClient.setQueryData(queryKeys.data.selectDefaults('posts'), { data: records });
  queryClient.setQueryData(queryKeys.data.many('posts', { ids: [1, 2] }), { data: records });
  queryClient.setQueryData(queryKeys.data.infiniteList('posts'), {
    pages: [{ data: records, total: 2 }],
    pageParams: [1],
  });
  queryClient.setQueryData(queryKeys.data.one('posts', 1), { data: records[0] });
  queryClient.setQueryData(queryKeys.data.one('posts', 2), { data: records[1] });
}

function recordIds(value: unknown): number[] {
  if (!value || typeof value !== 'object' || !('data' in value)) return [];
  return (value as { data: { id: number }[] }).data.map((record) => record.id);
}

describe('useDeleteMany optimistic cache lifecycle', () => {
  beforeEach(() => {
    state.queryClient = new QueryClient();
    state.mutationConfig = undefined;
    state.provider = { deleteMany: vi.fn() };
    state.authProvider = undefined;
    state.toastUndoable.mockReset();
    state.toastSuccess.mockReset();
    state.toastError.mockReset();
  });

  it('updates every collection cache while preserving detail data until success', async () => {
    const queryClient = getQueryClient();
    seedCaches(queryClient);
    const { config, cleanup } = createMutationConfig();
    const params: MutationParams = { resource: 'posts', ids: [1] };

    await config.onMutate(params);

    expect(recordIds(queryClient.getQueryData(keys().data.list('posts')))).toEqual([2]);
    expect(recordIds(queryClient.getQueryData(keys().data.select('posts')))).toEqual([2]);
    expect(recordIds(queryClient.getQueryData(keys().data.selectDefaults('posts')))).toEqual([2]);
    expect(recordIds(queryClient.getQueryData(keys().data.many('posts', { ids: [1, 2] })))).toEqual([2]);
    const infinite = queryClient.getQueryData(keys().data.infiniteList('posts')) as { pages: { data: { id: number }[]; total: number }[] };
    expect(infinite.pages[0].data.map((record) => record.id)).toEqual([2]);
    expect(infinite.pages[0].total).toBe(1);
    expect(queryClient.getQueryData(keys().data.one('posts', 1))).toEqual({ data: { id: 1, title: 'One' } });

    config.onSuccess({ data: [{ id: 1 }] }, params);

    expect(queryClient.getQueryData(keys().data.one('posts', 1))).toBeUndefined();
    expect(queryClient.getQueryData(keys().data.one('posts', 2))).toEqual({ data: { id: 2, title: 'Two' } });
    cleanup();
  });

  it('restores every optimistic cache entry when the operation is undone', async () => {
    const queryClient = getQueryClient();
    seedCaches(queryClient);
    const { config, cleanup } = createMutationConfig();
    const params: MutationParams = { resource: 'posts', ids: [1] };
    const context = await config.onMutate(params);

    config.onError(new UndoError(), params, context);

    expect(recordIds(queryClient.getQueryData(keys().data.list('posts')))).toEqual([1, 2]);
    expect(recordIds(queryClient.getQueryData(keys().data.select('posts')))).toEqual([1, 2]);
    expect(recordIds(queryClient.getQueryData(keys().data.selectDefaults('posts')))).toEqual([1, 2]);
    expect(recordIds(queryClient.getQueryData(keys().data.many('posts', { ids: [1, 2] })))).toEqual([1, 2]);
    const infinite = queryClient.getQueryData(keys().data.infiniteList('posts')) as { pages: { data: { id: number }[]; total: number }[] };
    expect(infinite.pages[0].data.map((record) => record.id)).toEqual([1, 2]);
    expect(infinite.pages[0].total).toBe(2);
    expect(queryClient.getQueryData(keys().data.one('posts', 1))).toEqual({ data: { id: 1, title: 'One' } });
    cleanup();
  });

  it('keeps successful fallback deletions while restoring failed records', async () => {
    const queryClient = getQueryClient();
    seedCaches(queryClient);
    state.provider = {
      deleteOne: vi.fn(async ({ id }: { id: string | number }) => {
        if (id === 2) throw new Error('delete failed');
        return { data: { id } };
      }),
    };
    const { config, cleanup } = createMutationConfig();
    const params: MutationParams = { resource: 'posts', ids: [1, 2] };
    const context = await config.onMutate(params);

    let error: unknown;
    try {
      await config.mutationFn(params);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(DeleteManyPartialError);
    expect(error).toMatchObject({ succeededIds: [1], failedIds: [2] });
    config.onError(error, params, context);

    expect(recordIds(queryClient.getQueryData(keys().data.list('posts')))).toEqual([2]);
    expect(queryClient.getQueryData(keys().data.one('posts', 1))).toBeUndefined();
    expect(queryClient.getQueryData(keys().data.one('posts', 2))).toEqual({ data: { id: 2, title: 'Two' } });
    cleanup();
  });

  it('delegates a partial failure cause to the auth provider', async () => {
    const authError = { message: 'Unauthorized', statusCode: 401 };
    const onError = vi.fn(async () => ({}));
    state.authProvider = { onError };
    state.provider = {
      deleteOne: vi.fn(async ({ id }: { id: string | number }) => {
        if (id === 2) throw authError;
        return { data: { id } };
      }),
    };
    const { config, cleanup } = createMutationConfig();
    const params: MutationParams = { resource: 'posts', ids: [1, 2] };

    let error: unknown;
    try {
      await config.mutationFn(params);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(DeleteManyPartialError);
    config.onError(error, params, undefined);
    expect(onError).toHaveBeenCalledWith(authError);
    cleanup();
  });

  it('honors a per-call optimistic mode when the hook default is pessimistic', async () => {
    const queryClient = getQueryClient();
    seedCaches(queryClient);
    const { config, cleanup } = createMutationConfig({ mutationMode: 'pessimistic' });
    const params = { resource: 'posts', ids: [1], mutationMode: 'optimistic' as const };

    await config.onMutate(params);

    expect(recordIds(queryClient.getQueryData(keys().data.list('posts')))).toEqual([2]);
    cleanup();
  });

  it('honors a per-call pessimistic mode when the hook default is optimistic', async () => {
    const queryClient = getQueryClient();
    seedCaches(queryClient);
    const { config, cleanup } = createMutationConfig({ mutationMode: 'optimistic' });

    await config.onMutate({ resource: 'posts', ids: [1], mutationMode: 'pessimistic' });

    expect(recordIds(queryClient.getQueryData(keys().data.list('posts')))).toEqual([1, 2]);
    cleanup();
  });

  it('uses per-call undoable timeout and invokes onCancel when undone', async () => {
    let undo: (() => void) | undefined;
    let timeout = 0;
    state.toastUndoable.mockImplementation((_message: string, value: number, onUndo: () => void) => {
      timeout = value;
      undo = onUndo;
    });
    const { config, cleanup } = createMutationConfig({ mutationMode: 'pessimistic', undoableTimeout: 5000 });
    const onCancel = vi.fn();
    const pending = config.mutationFn({
      resource: 'posts',
      ids: [1],
      mutationMode: 'undoable',
      undoableTimeout: 1234,
      onCancel,
    });

    expect(timeout).toBe(1234);
    undo?.();
    await expect(pending).rejects.toBeInstanceOf(UndoError);
    expect(onCancel).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('passes mutation callback context and supports per-call notifications', async () => {
    const userContext = { restored: true };
    const onMutate = vi.fn(async () => userContext);
    const onSuccess = vi.fn();
    const successNotification = vi.fn(() => ({ message: 'per-call success' }));
    state.provider = { deleteMany: vi.fn(async () => ({ data: [{ id: 1 }] })) };
    const { config, cleanup } = createMutationConfig({
      mutationMode: 'pessimistic',
      mutationOptions: { onMutate, onSuccess },
      successNotification: () => ({ message: 'hook success' }),
    });
    const params = { resource: 'posts', ids: [1], successNotification };
    const context = await config.onMutate(params);
    const data = await config.mutationFn(params);
    config.onSuccess(data, params, context);

    expect(onMutate).toHaveBeenCalledWith(params);
    expect(onSuccess).toHaveBeenCalledWith(data, params, userContext);
    expect(successNotification).toHaveBeenCalled();
    expect(state.toastSuccess).toHaveBeenCalledWith('per-call success', undefined, { key: undefined });
    expect(state.toastError).not.toHaveBeenCalled();
    cleanup();
  });

  it('passes error and settled callback context with a per-call error notification', async () => {
    const userContext = { retryable: true };
    const onMutate = vi.fn(() => userContext);
    const onError = vi.fn();
    const onSettled = vi.fn();
    const hookErrorNotification = vi.fn(() => ({ message: 'hook error' }));
    const errorNotification = vi.fn(() => ({ message: 'per-call error' }));
    const { config, cleanup } = createMutationConfig({
      mutationMode: 'pessimistic',
      mutationOptions: { onMutate, onError, onSettled },
      errorNotification: hookErrorNotification,
    });
    const params = { resource: 'posts', ids: [1], errorNotification };
    const context = await config.onMutate(params);
    const error = new Error('delete failed');

    config.onError(error, params, context);
    config.onSettled(undefined, error, params, context);

    expect(errorNotification).toHaveBeenCalledWith(error, undefined, 'posts');
    expect(hookErrorNotification).not.toHaveBeenCalled();
    expect(state.toastError).toHaveBeenCalledWith('per-call error', undefined, { key: undefined });
    expect(onError).toHaveBeenCalledWith(error, params, userContext);
    expect(onSettled).toHaveBeenCalledWith(undefined, error, params, userContext);
    cleanup();
  });
});
