<script lang="ts">
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { provideAdminContext, type DataProvider } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import DetailWorkspaceAsyncSection from './DetailWorkspaceAsyncSection.svelte';
  import type { DetailWorkspaceProvider, DetailWorkspaceScope } from './detail-workspace.js';

  let {
    load,
    maxSynchronousReads = 3,
  }: {
    load: (scope: DetailWorkspaceScope, signal: AbortSignal) => Promise<{ name: string }[]>;
    maxSynchronousReads?: number;
  } = $props();

  // A legitimate provider may read reactive application state while deriving its
  // request. The cap keeps an accidental effect dependency from looping forever
  // during the red test, without hiding the duplicate requests.
  let synchronousReads = $state(0);
  let attempts = 0;
  const provider: DetailWorkspaceProvider<{ name: string }[]> = {
    load: async (scope, signal) => {
      attempts += 1;
      if (attempts <= maxSynchronousReads) synchronousReads += 1;
      return load(scope, signal);
    },
  };

  const dataProvider: DataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'user-1' } }),
    create: async () => ({ data: { id: 'user-1' } }),
    update: async () => ({ data: { id: 'user-1' } }),
    deleteOne: async () => ({ data: { id: 'user-1' } }),
    getApiUrl: () => 'https://detail-workspace-reactive.example.test',
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const tenant = { tenantId: 'tenant-reactive' };

  provideAdminContext(definedReactiveOptions({
    dataProvider,
    resources: [],
    get tenant() { return tenant; },
  }));
</script>

{#snippet attachmentNames({ data }: DetailWorkspaceScope & { data: { name: string }[] })}
  <p>{data[0]?.name ?? ''}</p>
{/snippet}

<p data-testid="reactive-read-count">{synchronousReads}</p>

<QueryClientProvider client={queryClient}>
  <DetailWorkspaceAsyncSection
    {provider}
    resourceName="users"
    recordId="user-1"
    render={attachmentNames}
  />
</QueryClientProvider>