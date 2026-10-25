<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type TaskProvider } from '@svadmin/core';
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import type { ComponentProps } from 'svelte';
  import TaskList from './TaskList.svelte';

  let { provider, client, tenant, settings = {} }: {
    provider?: TaskProvider | undefined;
    client: QueryClient;
    tenant?: string | undefined;
    settings?: ComponentProps<typeof TaskList>;
  } = $props();
  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  provideAdminContext({
    dataProvider,
    resources: [] as ResourceDefinition[],
    get taskProvider() { return provider; },
    get tenant() { return tenant === undefined ? undefined : { tenantId: tenant }; },
  });
</script>

<QueryClientProvider {client}>
  <TaskList {...(provider ? { taskProvider: provider } : {})} {...settings} />
</QueryClientProvider>
