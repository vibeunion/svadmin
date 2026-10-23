<script lang="ts">
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { provideAdminContext, type DataProvider, type TenantContext } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import DetailWorkspaceAsyncSection from './DetailWorkspaceAsyncSection.svelte';
  import type { DetailWorkspaceProvider, DetailWorkspaceScope } from './detail-workspace.js';

  let {
    tenant,
    provider,
  }: {
    tenant: TenantContext;
    provider: DetailWorkspaceProvider<{ name: string }[]>;
  } = $props();

  const dataProvider: DataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'user-1' } }),
    create: async () => ({ data: { id: 'user-1' } }),
    update: async () => ({ data: { id: 'user-1' } }),
    deleteOne: async () => ({ data: { id: 'user-1' } }),
    getApiUrl: () => 'https://detail-workspace-scope.example.test',
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  provideAdminContext(definedReactiveOptions({
    dataProvider,
    resources: [],
    get tenant() { return tenant; },
  }));
</script>

{#snippet attachmentNames({ data }: DetailWorkspaceScope & { data: { name: string }[] })}
  <p>{data[0]?.name ?? ''}</p>
{/snippet}

<QueryClientProvider client={queryClient}>
  <DetailWorkspaceAsyncSection
    {provider}
    resourceName="users"
    recordId="user-1"
    render={attachmentNames}
  />
</QueryClientProvider>
