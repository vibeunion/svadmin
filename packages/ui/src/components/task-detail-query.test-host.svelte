<script lang="ts">
  import { provideAdminContext, type DataProvider, type TaskProvider } from '@svadmin/core';
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import type { ComponentProps } from 'svelte';
  import TaskDetails from './TaskDetails.svelte';

  let { provider, client, settings = {} }: {
    provider: TaskProvider;
    client: QueryClient;
    settings?: ComponentProps<typeof TaskDetails>;
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
    resources: [],
    get taskProvider() { return provider; },
  });
</script>

<QueryClientProvider {client}>
  <TaskDetails taskProvider={provider} {...settings} />
</QueryClientProvider>
