/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { useList, useOne } from './query-hooks.svelte';
import { flushSync } from 'svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { keys, parseQueryKey } from './query-keys';

vi.mock('./context.svelte', () => {
  const dataProvider = {
    getOne: vi.fn(),
    getList: vi.fn()
  };
  const getResource = (name: string) => ({ name, primaryKey: 'id' });
  return {
    captureAdminContext: () => ({
      providers: { default: dataProvider },
      authProvider: null,
      resources: [getResource('posts')],
      routerProvider: undefined,
      liveProvider: undefined,
      taskProvider: undefined,
      getDataProvider: () => dataProvider,
      getDataProviderNames: () => ['default'],
      queryKeys: () => keys(),
      getDataProviderForResource: () => dataProvider,
      getResource,
      currentPath: () => '/posts',
      formatLink: (path: string) => path,
      navigate: vi.fn(async () => {}),
      back: vi.fn(),
    }),
    getDataProviderForResource: () => dataProvider,
    useResource: () => ({ name: 'posts' }),
    getResource,
    useRouterContext: () => ({ navigate: vi.fn() }),
    useTranslate: () => (key: string) => key,
    useNotification: () => ({ open: vi.fn(), close: vi.fn() }),
    getLiveProvider: () => undefined
  };
});

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    useQueryClient: () => new QueryClient(),
    createQuery: (factory: any) => ({
      data: parseQueryKey(factory().queryKey)?.action === 'one'
        ? { data: { id: 1, title: 'One' } }
        : { data: [{ id: 1, title: 'One' }], total: 1 },
      isPending: false,
      isFetching: false,
      isSuccess: true,
      isError: false,
      dataUpdatedAt: 1,
      errorUpdatedAt: 0,
      error: null,
    })
  };
});

describe('useList & useOne - Headless Svelte 5 Compatibility', () => {

  it('safely binds useList query state without headless Svelte destruction', () => {
    let listQuery: ReturnType<typeof useList>;
    
    const cleanup = $effect.root(() => {
        listQuery = useList({ resource: 'posts' });
    });

    flushSync();
    
    expect(listQuery!.data).toBeDefined();
    expect(listQuery!.data!.data[0].title).toBe('One');
    expect(listQuery!.data!.total).toBe(1);
    expect(listQuery!.isPending).toBe(false);

    cleanup();
  });

  it('safely binds useOne query state without headless component mounting', () => {
    let oneQuery: ReturnType<typeof useOne>;
    
    const cleanup = $effect.root(() => {
        oneQuery = useOne({ resource: 'posts', id: 1 });
    });

    flushSync();
    
    expect(oneQuery!.data).toBeDefined();
    expect((oneQuery!.data!.data as any).title).toBe('One');

    cleanup();
  });
});
