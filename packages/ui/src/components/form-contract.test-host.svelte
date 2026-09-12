<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type RouterProvider,
    type AccessControlProvider, type AuthProvider, type NotificationProvider, type ContractFormAction,
    type AuditLogProvider, type LiveProvider, type FieldDefinition } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import AutoForm from './AutoForm.svelte';
  import FieldRenderer from './FieldRenderer.svelte';
  import Probe from './form-contract.test-probe.svelte';
  import type { FormState, FormSettings, FormAuthActions } from './form-contract.test.types';

  let { provider, resources, queryClient, resource = 'posts', action = 'create', id, settings = {},
    permission, auth, notification, tenant = 'first', onReady = () => {}, onSuccess, router,
    onNavigationGuardReady, showForm = true, onAuthReady, audit, live, onFieldReady, onSubmitReady,
  }: {
    provider: DataProvider | Record<string, DataProvider>;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    resource?: string;
    action?: ContractFormAction;
    id?: string | number;
    settings?: FormSettings;
    permission?: AccessControlProvider;
    auth?: AuthProvider;
    notification?: NotificationProvider;
    tenant?: string;
    onReady?: (value: FormState) => void;
    onSuccess?: () => void;
    router: RouterProvider;
    onNavigationGuardReady?: (guard: (next: () => void) => void) => void;
    showForm?: boolean;
    onAuthReady?: (actions: FormAuthActions) => void;
    audit?: AuditLogProvider;
    live?: LiveProvider;
    onFieldReady?: (field: string, change: (value: unknown) => void) => void;
    onSubmitReady?: (submit: () => void) => void;
  } = $props();
  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return permission; },
    get authProvider() { return auth; },
    get notificationProvider() { return notification; },
    get auditLogProvider() { return audit; },
    get liveProvider() { return live; },
    get routerProvider() { return router; },
  }));
</script>
{#snippet observedField({ field, value, onchange }: { field: FieldDefinition; value: unknown; onchange: (value: unknown) => void })}
  {onFieldReady?.(field.key, onchange) ?? ''}
  <FieldRenderer {field} {value} {onchange} />
{/snippet}
{#snippet observedActions({ onSubmit }: { isLoading: boolean; onSubmit: () => void })}
  {onSubmitReady?.(onSubmit) ?? ''}
{/snippet}
<QueryClientProvider client={queryClient}>
  {#if showForm}
    <AutoForm resourceName={resource} mode={action} {...definedReactiveOptions({
      get id() { return id; },
      get onSuccess() { return onSuccess; },
      get onNavigationGuardReady() { return onNavigationGuardReady; },
      get fieldRenderer() { return onFieldReady ? observedField : undefined; },
      get formActions() { return onSubmitReady ? observedActions : undefined; },
    })} />
  {/if}
  {#key onAuthReady !== undefined}
    <Probe {resource} {action} {id} {settings} {onReady} {onAuthReady} />
  {/key}
</QueryClientProvider>
