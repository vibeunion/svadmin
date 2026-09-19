<script lang="ts">
  import { createI18nScope, provideI18nScope } from '@svadmin/core/i18n';
  provideI18nScope(createI18nScope({ locale: 'en' }));
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type AccessControlProvider } from '@svadmin/core';
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
    tenant = 'first',
    permission,
  }: {
    provider: DataProvider;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    resourceName?: string;
    open?: boolean;
    onSuccess?: (result: { succeeded: number; failed: number }) => void;
    tenant?: string;
    permission?: AccessControlProvider;
  } = $props();

  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return permission; },
  }));
</script>

<QueryClientProvider client={queryClient}>
  <ImportWizard {resourceName} {open} {...(onSuccess ? { onSuccess } : {})} />
</QueryClientProvider>
