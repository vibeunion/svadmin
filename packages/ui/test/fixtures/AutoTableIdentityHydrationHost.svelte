<script lang="ts">
  import { onDestroy } from 'svelte';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { definedOptions } from '@svadmin/core/options';
  import { createResourceRenderers } from '../../src/rendering/index.js';
  import { resolveResourceContract } from '@svadmin/core/resource-contract';
  import { defineResource, provideAdminContext, useLogin } from '@svadmin/core';
  import { Type } from 'typebox';
  import type {
    AuthProvider, DataProvider, ResourceDefinition, RouterProvider, Sort,
  } from '@svadmin/core';
  import AutoTable from '../../src/components/AutoTable.svelte';
  import type { ListStateSnapshot } from '../../src/components/list-state.svelte.js';
  import type { SavedListViewProvider } from '../../src/components/saved-list-views.js';

  interface Props {
    authProvider: AuthProvider;
    dataProvider: DataProvider;
    initialListState?: ListStateSnapshot;
    onGetList?: (params: Parameters<DataProvider['getList']>[0]) => void;
    onListStateChange?: (state: ListStateSnapshot) => void;
    pagination?: { current: number; pageSize: number };
    sorters?: Sort[];
    savedViewProvider?: SavedListViewProvider;
    onReady?: (controls: { login: () => Promise<unknown> }) => void;
  }

  let {
    authProvider,
    dataProvider,
    initialListState,
    onGetList,
    onListStateChange,
    pagination,
    sorters,
    savedViewProvider,
    onReady,
  }: Props = $props();

  const resources: ResourceDefinition[] = [{
    name: 'users',
    label: 'Users',
    contract: defineResource('users', {
      record: Type.Object({
        id: Type.Union([Type.String(), Type.Number()]),
        email: Type.String(),
      }),
      create: Type.Object({ email: Type.Optional(Type.String()) }),
      update: Type.Object({ email: Type.Optional(Type.String()) }),
    }),
    fields: [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'email', label: 'Email', type: 'text', searchable: true, filterable: true },
    ],
  }];

  const routerProvider: RouterProvider = {
    go: async () => {},
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };

  // 真实宿主只提供 AutoTable 所需的上下文，避免 AdminApp 的鉴权门在身份切换时重建组件树。
  const observedDataProvider: DataProvider = $derived({
    ...dataProvider,
    getList: async (params: Parameters<DataProvider['getList']>[0]) => {
      onGetList?.(params);
      return dataProvider.getList(params);
    },
  });
  provideAdminContext({
    get dataProvider() { return observedDataProvider; },
    get authProvider() { return authProvider; },
    resources,
    routerProvider,
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  // 仅清理测试夹具自有的 QueryClient 资源，不改变生产宿主语义。
  onDestroy(() => queryClient.clear());
  const rendering = createResourceRenderers(resolveResourceContract(resources[0] ?? { name: 'users' }));
  const login = useLogin();

  $effect(() => {
    onReady?.({
      login: () => login.mutate({ identifier: 'next', password: 'secret' }),
    });
  });
</script>

<QueryClientProvider client={queryClient}>
  <AutoTable
    resourceName="users"
    {rendering}
    syncWithLocation={false}
    {...definedOptions({ pagination, sorters, initialListState, onListStateChange, savedViewProvider })}
  />
</QueryClientProvider>
