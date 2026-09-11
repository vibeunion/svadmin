<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type AuthProvider,
    type NotificationProvider, type RouterProvider, type AuditLogProvider, type LiveProvider } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import Probe from './delete-many-contract.test-probe.svelte';
  import type { DeleteManyState, DeleteManyAuthActions } from './delete-many-contract.test.types';
  let { provider, resources, queryClient, resource = 'posts', tenant = 'first', enabled = true,
    auth, notification, router, audit, live, onReady, onAuthReady,
  }: {
    provider: DataProvider | Record<string, DataProvider>;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    resource?: string;
    tenant?: string;
    enabled?: boolean;
    auth?: AuthProvider;
    notification?: NotificationProvider;
    router?: RouterProvider;
    audit?: AuditLogProvider;
    live?: LiveProvider;
    onReady: (state: DeleteManyState) => void;
    onAuthReady?: (actions: DeleteManyAuthActions) => void;
  } = $props();
  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get authProvider() { return auth; },
    get notificationProvider() { return notification; },
    get routerProvider() { return router; },
    get auditLogProvider() { return audit; },
    get liveProvider() { return live; },
  }));
</script>
<QueryClientProvider client={queryClient}>
  {#key onAuthReady !== undefined}
    <Probe {resource} {enabled} {onReady} {onAuthReady} />
  {/key}
</QueryClientProvider>
