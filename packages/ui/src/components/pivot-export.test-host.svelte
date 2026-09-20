<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import { provideAdminContext } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import PivotExportButton from './PivotExportButton.svelte';
  let { settings, tenant = 'first', denied = false }: {
    settings: ComponentProps<typeof PivotExportButton>;
    tenant?: string;
    denied?: boolean;
  } = $props();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const access = $derived.by(() => {
    const deniedNow = denied;
    return { can: async () => ({ can: !deniedNow }) };
  });
  provideAdminContext({
    authProvider: {
      check: async () => ({ authenticated: true }),
      getIdentity: async () => ({ id: 'test-user', name: 'Test User' }),
      login: async () => ({ success: true }),
      logout: async () => ({ success: true }),
    },
    dataProvider: {
      getList: async () => ({ data: [], total: 0 }),
      getOne: async () => ({ data: {} }),
      create: async () => ({ data: {} }),
      update: async () => ({ data: {} }),
      deleteOne: async () => ({ data: {} }),
      getApiUrl: () => '/api',
    },
    resources: [{ name: 'orders', label: 'Orders', fields: [] }],
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return access; },
    routerProvider: { go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
  });
</script>
<QueryClientProvider client={client}><PivotExportButton {...settings} /></QueryClientProvider>
