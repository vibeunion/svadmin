<script lang="ts">
  import {
    provideAdminContext,
    type AuthProvider,
    type DataProvider,
    type RouterProvider,
    type TenantContext,
  } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import Layout from './Layout.svelte';

  let {
    authProvider,
    tenant,
  }: {
    authProvider?: AuthProvider;
    tenant: TenantContext;
  } = $props();

  const fallbackDataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://layout-auth-scope.example.test',
  } as DataProvider;
  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ resource: 'layout', action: 'list', params: {}, pathname: '/layout' }),
  };
  const queryClient = new QueryClient();

  provideAdminContext({
    dataProvider: fallbackDataProvider,
    get authProvider() { return authProvider; },
    resources: [],
    routerProvider,
    get tenant() { return tenant; },
  });
</script>

{#snippet content()}
  <span data-testid="layout-auth-content">layout auth content</span>
{/snippet}

<QueryClientProvider client={queryClient}>
  <Layout children={content} />
</QueryClientProvider>
