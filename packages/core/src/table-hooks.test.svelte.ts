import { requireValue } from '../test/assertions';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe,it,expect,vi } from 'vitest';
import { useTable } from './table-hooks.svelte';
import { flushSync } from 'svelte';
import { keys } from './query-keys';

vi.mock('./context.svelte',() => {
  const dataProvider={
    getList: vi.fn().mockResolvedValue({ data: [],total: 0 })
  };
  const getResource=(name: string) => ({ name,primaryKey: 'id' });
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
      getDataProviderForResource: () => dataProvider,
      queryKeys: () => keys(),
      queryKeyMatcher: () => ({}),
      getProviderMeta: () => undefined,
      getResource,
      currentPath: () => '/',
      formatLink: (path: string) => path,
      navigate: vi.fn(async () => { }),
      back: vi.fn(),
    }),
    useDataProvider: () => dataProvider,
    useResource: () => ({ name: 'posts' }),
    getResource,
    useRouterContext: () => ({ navigate: vi.fn(),url: '/',parsedParams: { current: 1,pageSize: 10 } }),
    useTranslate: () => (key: string) => key,
    getSyncWithLocation: () => false,
    useNotification: () => ({ open: vi.fn(),close: vi.fn() }),
    getLiveProvider: () => undefined
  };
});

vi.mock('@tanstack/svelte-query',async (importOriginal) => {
  const actual=await importOriginal<typeof import('@tanstack/svelte-query')>();
  const client=new actual.QueryClient();
  return {
    ...actual as any,
    useQueryClient: () => client,
    createQuery: (factory: any) => {
      const options=factory();
      const data={ data: [{ id: 1,title: 'Row' }],total: 1 };
      client.setQueryData(options.queryKey,data);
      return { data,isPending: false,isFetching: false,isSuccess: true,isError: false,dataUpdatedAt: 1,errorUpdatedAt: 0,error: null };
    }
  };
});

describe('useTable - Headless Svelte 5 Compatibility',() => {

  it('binds useTable logic internally and updates pagination flawlessly via $state',() => {
    let table: ReturnType<typeof useTable>|undefined;

    const cleanup=$effect.root(() => {
      table=useTable({ resource: 'posts' });
    });

    flushSync();

    expect(requireValue(table).query).toBeDefined();
    expect(requireValue(requireValue(table).query.data?.data[0])['title']).toBe('Row');
    expect(requireValue(table).current).toBe(1);

    // Trigger mutable state 
    requireValue(table).setPage(2);

    flushSync();

    expect(requireValue(table).current).toBe(2);

    cleanup();
  });
});
