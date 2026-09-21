<script lang="ts">
  import { provideAdminContext, type AuthProvider, type DataProvider, type ResourceDefinition, type AccessControlProvider, type RouterProvider } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import AutoTable from './AutoTable.svelte';
  import type { SavedListViewProvider } from './saved-list-views';
  let { provider, resources, queryClient, resource = 'posts', tenant = 'first', access, router,
    deleteVariables, inspect, pagination, sorters, authProvider, savedViewProvider, applyRemoteDefaultView = false, onNavigate = () => {},
  }: {
    provider: DataProvider | Record<string, DataProvider>;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    resource?: string;
    tenant?: string;
    access?: AccessControlProvider;
    router?: RouterProvider;
    deleteVariables?: unknown;
    inspect?: (record: Record<string, unknown>) => void;
    pagination?: { current: number; pageSize: number };
    sorters?: import('@svadmin/core').Sort[];
    authProvider?: AuthProvider;
    savedViewProvider?: SavedListViewProvider;
    applyRemoteDefaultView?: boolean;
    onNavigate?: RouterProvider['go'];
  } = $props();
  let params = $state<Record<string, string>>({});
  const defaultRouter: RouterProvider = {
    parse: () => ({ pathname: '/posts', params }),
    go: options => { params = options.query ?? {}; onNavigate(options); },
    back: () => { params = {}; },
  };
  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return access; },
    get authProvider() { return authProvider; },
    get routerProvider() { return router ?? defaultRouter; },
  }));
</script>
{#snippet customCell({ record, value }: { record: Record<string, unknown>; value: unknown })}
  {inspect?.(record)}
  <span>{value}</span>
{/snippet}
<QueryClientProvider client={queryClient}>
  <AutoTable resourceName={resource} {deleteVariables}
    {...definedReactiveOptions({
      get pagination() { return pagination; },
      get sorters() { return sorters; },
      get savedViewProvider() { return savedViewProvider; },
      get applyRemoteDefaultView() { return applyRemoteDefaultView; },
      get defaultCellRenderer() { return inspect ? customCell : undefined; },
    })}
  />
</QueryClientProvider>
