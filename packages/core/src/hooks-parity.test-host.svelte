<script lang="ts">
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import { provideAdminContext } from './context.svelte';
  import { definedReactiveOptions } from './defined-options';
  import type { DataProvider, ResourceDefinition } from './types';
  import type { AuditLogProvider } from './audit';
  import type { RouterProvider } from './router-provider';
  import Probe from './hooks-parity.test-probe.svelte';
  import type { HooksParityState } from './hooks-parity.test.types';

  let { client, audit, data, resources, router, title, onReady }: {
    client: QueryClient;
    audit: AuditLogProvider;
    data: DataProvider;
    resources: ResourceDefinition[];
    router: RouterProvider;
    title: string;
    onReady: (value: HooksParityState) => void;
  } = $props();

  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return data; },
    get auditLogProvider() { return audit; },
    get resources() { return resources; },
    get routerProvider() { return router; },
    get tenant() { return { tenantId: 'first' }; },
  }));
</script>

<QueryClientProvider {client}>
  <Probe {title} {onReady} />
</QueryClientProvider>
