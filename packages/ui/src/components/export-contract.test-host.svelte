<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type ContractSchemas, type UseExportOptions, type useExport } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import ExportButton from './buttons/ExportButton.svelte';
  import Probe from './export-contract.test-probe.svelte';

  let { provider, resources, resource = 'posts', tenant = 'first', denied = false, settings = {}, onReady }: {
    provider: DataProvider;
    resources: ResourceDefinition[];
    resource?: string;
    tenant?: string;
    denied?: boolean;
    settings?: Omit<UseExportOptions<ContractSchemas>, 'resource'>;
    onReady?: (value: ReturnType<typeof useExport>) => void;
  } = $props();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  provideAdminContext({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    accessControlProvider: { can: async () => ({ can: !denied }) },
    routerProvider: { go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
  });
</script>

<QueryClientProvider client={queryClient}>
  {#if onReady}
    <Probe {resource} {settings} {onReady} />
  {:else}
    <ExportButton {resource} accessControl={{ enabled: true, hideIfUnauthorized: false }} />
  {/if}
</QueryClientProvider>
