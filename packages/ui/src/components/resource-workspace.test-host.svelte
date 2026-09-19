<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type AccessControlProvider } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import type { ComponentProps } from 'svelte';
  import ResourceOperationsPage from './ResourceOperationsPage.svelte';
  import { createI18nScope, provideI18nScope } from '@svadmin/core/i18n';

  provideI18nScope(createI18nScope({ locale: 'en' }));

  let {
    provider, resources, queryClient, resourceName = 'posts', tenant = 'first', access,
    tableProps = {}, onBatch = () => {}, workspaceStyle = 'operations',
  }: {
    provider: DataProvider;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    resourceName?: string;
    tenant?: string;
    access?: AccessControlProvider;
    tableProps?: ComponentProps<typeof ResourceOperationsPage>['tableProps'];
    workspaceStyle?: ComponentProps<typeof ResourceOperationsPage>['workspaceStyle'];
    onBatch?: (ids: (string | number)[]) => void;
  } = $props();
  let params = $state<Record<string, string>>({});
  const router = {
    parse: () => ({ pathname: '/posts', params }),
    go: (options: { query?: Record<string, string> }) => { params = options.query ?? {}; },
    back: () => { params = {}; },
  };
  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return access; },
    routerProvider: router,
  }));
</script>

{#snippet batchActions({ selectedIds }: { selectedIds: (string | number)[] })}
  <button type="button" onclick={() => onBatch([...selectedIds])}>Process selection</button>
{/snippet}

<QueryClientProvider client={queryClient}>
  <ResourceOperationsPage
    {resourceName} {workspaceStyle} eyebrow="Operations" title="Workspace"
    description="Records" actionLabel="New record"
    tableProps={{ batchActions, ...tableProps }}
  />
</QueryClientProvider>
