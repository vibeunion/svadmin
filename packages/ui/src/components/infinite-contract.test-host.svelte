<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type Filter, type AuthProvider,
    type NotificationProvider, type RouterProvider } from '@svadmin/core';
  import type { NotificationConfig } from '../../../core/src/hook-utils.svelte';
  import type { InfiniteState } from './infinite-contract.test.types';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import InfiniteList from './InfiniteList.svelte';
  import Probe from './infinite-contract.test-probe.svelte';

  let { provider, resources, resource = 'posts', tenant = 'first', pageSize = 1, filters = [], onReady,
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
    authProvider = null, notificationProvider = null, enabled = true, successNotification = false, errorNotification = false,
    routerProvider = { go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
  }: {
    provider: DataProvider;
    resources: ResourceDefinition[];
    resource?: string;
    tenant?: string;
    pageSize?: number;
    filters?: Filter[];
    queryClient?: QueryClient;
    onReady?: (value: InfiniteState) => void;
    authProvider?: AuthProvider | null;
    notificationProvider?: NotificationProvider | null;
    routerProvider?: RouterProvider;
    enabled?: boolean;
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
  {#if onReady}
    <Probe {resource} {pageSize} {filters} {onReady} {enabled} {successNotification} {errorNotification} />
  {:else}
    <InfiniteList {resource} {pageSize} {filters}>
      {#snippet children({ item })}
        <span data-testid="row">{String(item['title'])}</span>
      {/snippet}
    </InfiniteList>
  {/if}
</QueryClientProvider>
