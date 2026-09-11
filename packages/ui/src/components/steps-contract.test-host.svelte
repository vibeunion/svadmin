<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type RouterProvider,
    type AccessControlProvider, type AuthProvider } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import StepsForm from './StepsForm.svelte';
  import Probe from './steps-contract.test-probe.svelte';
  import type { StepDefinition, StepSettings, StepState, StepAuthActions } from './steps-contract.test.types';

  let { provider, resources, queryClient, router, resource = 'posts', action = 'create', id,
    steps, settings = {}, permission, auth, tenant = 'first', onReady = () => {}, onSuccess, showForm = false, onAuthReady,
  }: {
    provider: DataProvider | Record<string, DataProvider>;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    router: RouterProvider;
    resource?: string;
    action?: 'create' | 'edit';
    id?: string | number;
    steps: StepDefinition[];
    settings?: StepSettings;
    permission?: AccessControlProvider;
    auth?: AuthProvider;
    tenant?: string;
    onReady?: (value: StepState) => void;
    onSuccess?: () => void;
    showForm?: boolean;
    onAuthReady?: (actions: StepAuthActions) => void;
  } = $props();
  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return permission; },
    get authProvider() { return auth; },
    get routerProvider() { return router; },
  }));
</script>
<QueryClientProvider client={queryClient}>
  {#if showForm}
    <StepsForm resourceName={resource} mode={action} {steps} {...definedReactiveOptions({
      get id() { return id; }, get onSuccess() { return onSuccess; },
    })} />
  {/if}
  {#key onAuthReady !== undefined}
    <Probe {resource} {action} {id} {steps} {settings} {onReady} {onAuthReady} />
  {/key}
</QueryClientProvider>
