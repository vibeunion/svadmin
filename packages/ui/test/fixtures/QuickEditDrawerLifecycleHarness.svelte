<script lang="ts">
  import type { DataProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
  import { provideAdminContext } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import type { QueryClient } from '@tanstack/svelte-query';
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import QuickEditDrawer from '../../src/components/QuickEditDrawer.svelte';

  let { provider, resources, queryClient, recordId, onClose = () => {} }: {
    provider: DataProvider;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    recordId?: string | number | undefined;
    onClose?: (id: string | number) => void;
  } = $props();

  const router: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ pathname: '/posts', params: {} }),
  };

  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    routerProvider: router,
  }));
</script>

<QueryClientProvider client={queryClient}>
  {#if recordId != null}
    <div data-testid="drawer-host" data-record-id={recordId}>
      {#key recordId}
        <QuickEditDrawer resourceName="posts" {recordId} onClose={() => onClose(recordId)} />
      {/key}
    </div>
  {/if}
</QueryClientProvider>
