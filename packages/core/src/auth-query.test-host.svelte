<script lang="ts">
  import { provideAdminContext } from './context.svelte';
  import type { AuthProvider, DataProvider, NotificationProvider } from './types';
  import type { RouterProvider } from './router-provider';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import type { AuthQueryState } from './auth-query.test.types';
  import Probe from './auth-query.test-probe.svelte';

  let {
    provider, tenant = 'first', onReady, queryClient = new QueryClient(),
    routerProvider = { go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
    notificationProvider = { open: () => {}, close: () => {} },
  }: {
    provider: AuthProvider | null;
    tenant?: string;
    onReady: (value: AuthQueryState) => void;
    queryClient?: QueryClient;
    routerProvider?: RouterProvider;
    notificationProvider?: NotificationProvider;
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
    dataProvider,
    get authProvider() { return provider; },
    get tenant() { return { tenantId: tenant }; },
    get routerProvider() { return routerProvider; },
    get notificationProvider() { return notificationProvider; },
    resources: [],
  });
</script>

<QueryClientProvider client={queryClient}>
  <Probe {onReady} />
</QueryClientProvider>
