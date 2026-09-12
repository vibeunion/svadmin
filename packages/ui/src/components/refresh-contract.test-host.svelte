<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import type { RefreshState } from './refresh-contract.test.types';
  import RefreshButton from './buttons/RefreshButton.svelte';
  import Probe from './refresh-contract.test-probe.svelte';

  let { provider, resources, queryClient, onReady, resource = 'posts', tenant = 'first',
    activeQuery = true, providerOverride = '',
  }: {
    provider: DataProvider | Record<string, DataProvider>;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    onReady: (value: RefreshState) => void;
    resource?: string;
    tenant?: string;
    activeQuery?: boolean;
    providerOverride?: string;
  } = $props();
  provideAdminContext({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    routerProvider: { go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
  });
</script>

<QueryClientProvider client={queryClient}>
  <RefreshButton {resource} />
  <Probe {resource} {activeQuery} {providerOverride} {onReady} />
</QueryClientProvider>
