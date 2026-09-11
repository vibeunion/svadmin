<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { provideAdminContext } from './context.svelte';
  import type { DataProvider, ResourceDefinition, Filter, Sort, Pagination, AuthProvider, NotificationProvider } from './types';
  import type { RouterProvider } from './router-provider';
  import type { NotificationConfig } from './hook-utils.svelte';
  import type { ReadKind, ReadState } from './query-source.test.types';
  import Probe from './query-source.test-probe.svelte';

  let { provider, resources, queryClient, kind, onReady, resource = 'posts', tenant = 'first',
    id = 1, ids = [1], filters = [], sorters = [], pagination = { current: 1, pageSize: 2 },
    meta = {}, enabled = true, providerOverride = '', authProvider = null, notificationProvider = null,
    successNotification = false, errorNotification = false,
    routerProvider = { go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
  }: {
    provider: DataProvider | Record<string, DataProvider>;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    kind: ReadKind;
    onReady: (value: ReadState) => void;
    resource?: string;
    tenant?: string;
    id?: string | number;
    ids?: (string | number)[];
    filters?: Filter[];
    sorters?: Sort[];
    pagination?: Pagination;
    meta?: Record<string, unknown>;
    enabled?: boolean;
    providerOverride?: string;
    authProvider?: AuthProvider | null;
    notificationProvider?: NotificationProvider | null;
    routerProvider?: RouterProvider;
    successNotification?: NotificationConfig;
    errorNotification?: NotificationConfig;
  } = $props();
  provideAdminContext({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get authProvider() { return authProvider; },
    get notificationProvider() { return notificationProvider; },
    get routerProvider() { return routerProvider; },
  });
</script>

<QueryClientProvider client={queryClient}>
  <Probe {kind} {resource} {id} {ids} {filters} {sorters} {pagination} {meta} {enabled} {providerOverride} {onReady}
    {successNotification} {errorNotification} />
</QueryClientProvider>
