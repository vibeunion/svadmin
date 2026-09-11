<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type AuthProvider,
    type NotificationProvider, type RouterProvider, type LiveProvider, type AuditLogProvider } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import Probe from './create-many-contract.test-probe.svelte';
  import type { CreateManyState, CreateManyAuthActions } from './create-many-contract.test.types';
  let { provider, resources, queryClient, resource = 'posts', tenant = 'first', enabled = true,
    auth, notification, router, live, audit, onReady, onAuthReady,
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
    live?: LiveProvider;
    audit?: AuditLogProvider;
    onReady: (state: CreateManyState) => void;
    onAuthReady?: (actions: CreateManyAuthActions) => void;
  } = $props();
  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get authProvider() { return auth; },
    get notificationProvider() { return notification; },
    get routerProvider() { return router; },
    get liveProvider() { return live; },
    get auditLogProvider() { return audit; },
  }));
</script>
<QueryClientProvider client={queryClient}>
  {#key onAuthReady !== undefined}
    <Probe {resource} {enabled} {onReady} {onAuthReady} />
  {/key}
</QueryClientProvider>
