<script lang="ts">
  import { untrack } from 'svelte';
  import type { Component } from 'svelte';
  import { provideAdminContext, type AccessControlProvider, type DataProvider, type ResourceDefinition } from '@svadmin/core';
  import { createI18nScope, provideI18nScope } from '@svadmin/core/i18n';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import SvarResourceTableView from './SvarResourceTableView.svelte';
  import ProbeGrid from '../../test/fixtures/SvarGridEngineProbe.svelte';
  import Theme from '../../test/fixtures/SvarGridThemeProbe.svelte';
  import type { SvarManagedEngineProps } from './svar-grid-panes.js';

  const Grid = ProbeGrid as unknown as Component<SvarManagedEngineProps>;

  let { provider, resources, queryClient, resourceName = 'posts', locale = 'en', access }: {
    provider: DataProvider;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    resourceName?: string;
    locale?: string;
    access?: AccessControlProvider;
  } = $props();

  provideI18nScope(createI18nScope({ locale: untrack(() => locale) }));

  provideAdminContext({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: 'test' }; },
    get accessControlProvider() { return access; },
    routerProvider: { go: () => {}, back: () => {}, parse: () => ({ pathname: '/posts', params: {} }) },
  });
</script>

<QueryClientProvider client={queryClient}>
  <SvarResourceTableView {Grid} {Theme} {resourceName} pageSize={25} />
</QueryClientProvider>
