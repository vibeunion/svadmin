import { definedOptions } from './defined-options';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { flushSync } from 'svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { useTable } from './table-hooks.svelte';
import { TableState } from './table-state.svelte';
import { keys } from './query-keys';
import type { GetListParams,GetListResult } from './types';

type QueryOptions={ queryFn: () => Promise<GetListResult> };
const { factories,getList,route }=vi.hoisted(() => ({
  factories: [] as (() => QueryOptions)[],
  getList: vi.fn<(params: GetListParams) => Promise<GetListResult>>(),
  route: { resource: 'posts',parentParams: {} as Record<string,string> },
}));

vi.mock('./useParsed.svelte',() => ({
  useParsed: () => route,
}));

vi.mock('./context.svelte',() => ({
  captureAdminContext: () => ({
    providers: { default: { getList } },
    resources: [],
    getProviderMeta: () => undefined,
    getDataProviderForResource: () => ({ getList }),
    queryKeys: () => keys(),
  }),
}));

vi.mock('@tanstack/svelte-query',async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/svelte-query')>(),
  useQueryClient: () => new QueryClient(),
  createQuery: (factory: () => QueryOptions) => {
    factories.push(factory);
    return { isLoading: false,isSuccess: false,isError: false };
  },
}));

describe.each(['useTable','TableState'] as const)('%s resource forwarding',(kind) => {
  let cleanup: (() => void)|undefined;

  function mount(resource?: string) {
    cleanup=$effect.root(() => {
      const options={ ...definedOptions({ resource }),syncWithLocation: false };
      if(kind==='useTable') useTable(options);
      else new TableState(options);
    });
    flushSync();
  }

  async function fetchList() {
    expect(factories).toHaveLength(1);
    const factory=factories[0];
    if(!factory) throw new Error('Expected a list query');
    await factory().queryFn();
  }

  beforeEach(() => {
    factories.length=0;
    getList.mockReset().mockResolvedValue({ data: [],total: 0 });
    route.resource='posts';
    route.parentParams={ teamId: '42' };
  });

  afterEach(() => {
    cleanup?.();
    cleanup=undefined;
  });

  it('uses the route resource and retains its nested parent filter when omitted',async () => {
    mount();
    await fetchList();
    expect(getList).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'posts',
      filters: [{ field: 'teamId',operator: 'eq',value: '42' }],
    }));
  });

  it('does not inject route parent filters into an explicit foreign resource',async () => {
    mount('users');
    await fetchList();
    expect(getList).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'users',
      filters: [],
    }));
  });

  it('resolves an omitted resource from the current route on each query',async () => {
    mount();
    await fetchList();
    route.resource='users';
    route.parentParams={};
    await fetchList();
    expect(getList).toHaveBeenLastCalledWith(expect.objectContaining({
      resource: 'users',
      filters: [],
    }));
  });
});
