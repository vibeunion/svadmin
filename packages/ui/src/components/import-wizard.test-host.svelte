<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import ImportWizard from './ImportWizard.svelte';

  let {
    provider,
    resources,
    queryClient,
    resourceName = 'posts',
    open = true,
    onSuccess,
  }: {
    provider: DataProvider;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    resourceName?: string;
    open?: boolean;
    onSuccess?: (result: { succeeded: number; failed: number }) => void;
  } = $props();

  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
  }));
</script>

<QueryClientProvider client={queryClient}>
  <ImportWizard {resourceName} {open} {onSuccess} />
</QueryClientProvider>
