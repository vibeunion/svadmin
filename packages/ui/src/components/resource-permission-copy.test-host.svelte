<script lang="ts">
  import { untrack } from 'svelte';
  import { provideAdminContext, type AccessControlProvider, type DataProvider, type ResourceDefinition } from '@svadmin/core';
  import { createI18nScope, provideI18nScope } from '@svadmin/core/i18n';
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import type { QueryClient } from '@tanstack/svelte-query';
  import ResourceAccessGuard from './ResourceAccessGuard.svelte';

  let { provider, resources, queryClient, accessControlProvider, resourceName = 'posts', locale = 'en' }: {
    provider: DataProvider;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    accessControlProvider: AccessControlProvider;
    resourceName?: string;
    locale?: string;
  } = $props();

  provideI18nScope(createI18nScope({ locale: untrack(() => locale) }));

  provideAdminContext({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: 'test' }; },
    accessControlProvider,
    routerProvider: { go: () => {}, back: () => {}, parse: () => ({ pathname: '/posts', params: {} }) },
  });
</script>

<QueryClientProvider client={queryClient}>
  <ResourceAccessGuard {resourceName} action="list"><p>PROTECTED_CONTENT</p></ResourceAccessGuard>
</QueryClientProvider>