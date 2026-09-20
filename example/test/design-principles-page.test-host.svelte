<script lang="ts">
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import { provideAdminContext, type DataProvider } from '@svadmin/core';
  import DesignPrinciplesPage from '../src/pages/DesignPrinciplesPage.svelte';

  let { client, resourceName }: { client: QueryClient; resourceName?: string } = $props();
  const dataProvider: DataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
    getApiUrl: () => '',
  };
  provideAdminContext({ dataProvider, resources: [], tenant: { tenantId: 'example-tenant' } });
</script>

<QueryClientProvider {client}>
  <DesignPrinciplesPage {resourceName} />
</QueryClientProvider>
