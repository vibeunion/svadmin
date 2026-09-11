<script lang="ts">
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import { provideAdminContext } from './context.svelte';
  import type { AuthProvider, DataProvider } from './types';
  import type { AccessControlProvider } from './permissions.svelte';
  import type { RouterProvider } from './router-provider';
  import type { UseCanOptions } from './useCan';
  import type { AccessQueryState } from './useCan.test.types';
  import Probe from './useCan.test-probe.svelte';

  let { accessControlProvider, queryClient, onReady, options, authProvider = null, tenant = 'first',
    routerProvider = { go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
  }: {
    accessControlProvider: AccessControlProvider | null;
    queryClient: QueryClient;
    onReady: (value: AccessQueryState) => void;
    options: UseCanOptions;
    authProvider?: AuthProvider | null;
    tenant?: string;
    routerProvider?: RouterProvider;
  } = $props();
  const dataProvider: DataProvider = {
    getApiUrl: () => '/api',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 1 } }),
    create: async () => ({ data: { id: 1 } }),
    update: async () => ({ data: { id: 1 } }),
    deleteOne: async () => ({ data: { id: 1 } }),
  };
  provideAdminContext({
    dataProvider, resources: [],
    get accessControlProvider() { return accessControlProvider; },
    get authProvider() { return authProvider; },
    get tenant() { return { tenantId: tenant }; },
    get routerProvider() { return routerProvider; },
  });
</script>

<QueryClientProvider client={queryClient}>
  <Probe {options} {onReady} />
</QueryClientProvider>
