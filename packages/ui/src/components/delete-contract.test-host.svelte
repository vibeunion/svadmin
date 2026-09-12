<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type AccessControlProvider, type AuthProvider, type RouterProvider,
    type AuditLogProvider, type LiveProvider, type NotificationProvider } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import DeleteButton from './buttons/DeleteButton.svelte';
  import Probe from './delete-contract.test-probe.svelte';
  import type { DeleteState, DeleteAuthActions } from './delete-contract.test.types';
  import type { ButtonAccessControl } from './buttons/access-control';

  let { provider, resources, queryClient, onReady = () => {}, resource = 'posts', tenant = 'first',
    id = 1, undoable = false, undoableTimeout = 60_000, enabled = true, onSuccess = () => {},
    variables, accessControl, permission, auth, onAuthReady, audit, live, notification, showButton = true,
    router = { go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
  }: {
    provider: DataProvider | Record<string, DataProvider>;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    onReady?: (state: DeleteState) => void;
    resource?: string;
    tenant?: string;
    id?: string | number;
    undoable?: boolean;
    undoableTimeout?: number;
    enabled?: boolean;
    onSuccess?: () => void;
    variables?: unknown;
    accessControl?: ButtonAccessControl;
    permission?: AccessControlProvider;
    auth?: AuthProvider;
    router?: RouterProvider;
    onAuthReady?: (actions: DeleteAuthActions) => void;
    audit?: AuditLogProvider;
    live?: LiveProvider;
    notification?: NotificationProvider;
    showButton?: boolean;
  } = $props();
  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return permission; },
    get authProvider() { return auth; },
    get routerProvider() { return router; },
    get auditLogProvider() { return audit; },
    get liveProvider() { return live; },
    get notificationProvider() { return notification; },
  }));
</script>
<QueryClientProvider client={queryClient}>
  {#if showButton}
    <DeleteButton resource={resource} recordItemId={id} {onSuccess} {undoable} {undoableTimeout} {variables}
      {...definedReactiveOptions({ get accessControl() { return accessControl; } })} />
  {/if}
  {#key onAuthReady !== undefined}
    <Probe {resource} {id} {undoable} {undoableTimeout} {enabled} {onReady} {onAuthReady} />
  {/key}
</QueryClientProvider>
