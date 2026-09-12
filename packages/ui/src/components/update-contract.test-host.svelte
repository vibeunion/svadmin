<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition,
    type AccessControlProvider, type FieldDefinition, type AuthProvider, type RouterProvider,
    type NotificationProvider, type AuditLogProvider, type LiveProvider } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import InlineEdit from './InlineEdit.svelte';
  import Probe from './update-contract.test-probe.svelte';
  import type { UpdateState, UpdateAuthActions } from './update-contract.test.types';

  let { provider, resources, queryClient, onReady = () => {}, resource = 'posts', tenant = 'first',
    id = 1, enabled = true, onSave = () => {}, value = 'First',
    field = { key: 'title', type: 'text', label: 'Title' }, permission, showEditor = true, auth,
    onAuthReady, notification, audit, live,
    router = { go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
  }: {
    provider: DataProvider | Record<string, DataProvider>;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    onReady?: (state: UpdateState) => void;
    resource?: string;
    tenant?: string;
    id?: string | number;
    enabled?: boolean;
    onSave?: (value: unknown) => void;
    value?: unknown;
    field?: FieldDefinition;
    permission?: AccessControlProvider;
    showEditor?: boolean;
    auth?: AuthProvider;
    router?: RouterProvider;
    onAuthReady?: (actions: UpdateAuthActions) => void;
    notification?: NotificationProvider;
    audit?: AuditLogProvider;
    live?: LiveProvider;
  } = $props();
  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return permission; },
    get authProvider() { return auth; },
    get routerProvider() { return router; },
    get notificationProvider() { return notification; },
    get auditLogProvider() { return audit; },
    get liveProvider() { return live; },
  }));
</script>
<QueryClientProvider client={queryClient}>
  {#if showEditor}
    <InlineEdit resourceName={resource} recordId={id} {field} {value} {onSave} />
  {/if}
  {#key onAuthReady !== undefined}
    <Probe {resource} {id} {enabled} {onReady} {onAuthReady} />
  {/key}
</QueryClientProvider>
