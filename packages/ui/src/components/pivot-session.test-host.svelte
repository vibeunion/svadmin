<script lang="ts">
  import { provideAdminContext, type AuthProvider } from '@svadmin/core';
  import type { ComponentProps } from 'svelte';
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import PivotTable from './PivotTable.svelte';
  import PivotSessionProbe from './pivot-session.test-probe.svelte';

  let { settings, tenant = 'first', authProvider, client }: {
    settings: ComponentProps<typeof PivotTable>;
    tenant?: string;
    authProvider: AuthProvider;
    client: QueryClient;
  } = $props();
  provideAdminContext({
    resources: [{ name: 'orders', label: 'Orders', fields: [] }],
    dataProvider: {
      getList: async () => ({ data: [], total: 0 }),
      getOne: async () => ({ data: {} }),
      create: async () => ({ data: {} }),
      update: async () => ({ data: {} }),
      deleteOne: async () => ({ data: {} }),
      getApiUrl: () => '/api',
    },
    get authProvider() { return authProvider; },
    get tenant() { return { tenantId: tenant }; },
  });
</script>

<QueryClientProvider {client}>
  <PivotTable {...settings} />
  <PivotSessionProbe />
</QueryClientProvider>
