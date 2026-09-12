<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type AccessControlProvider,
    type RouterProvider } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { definedReactiveOptions, definedOptions } from '@svadmin/core/options';
  import ShowPage from './ShowPage.svelte';
  import RecordDetailDrawer from './RecordDetailDrawer.svelte';

  let { provider, resources, queryClient, mode = 'page', resource = 'posts', id = 1, open = true,
    tenant = 'first', permission, layout = 'list', onNavigate = () => {}, onClose = () => {},
  }: {
    provider: DataProvider | Record<string, DataProvider>;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    mode?: 'page' | 'drawer';
    resource?: string;
    id?: string | number | null;
    open?: boolean;
    tenant?: string;
    permission?: AccessControlProvider;
    layout?: 'list' | 'grid';
    onNavigate?: RouterProvider['go'];
    onClose?: () => void;
  } = $props();
  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return permission; },
    routerProvider: {
      go: (options: Parameters<RouterProvider['go']>[0]) => onNavigate(options), back: () => {},
      parse: () => ({ pathname: '/posts/show/999', params: { id: '999' } }),
    },
  }));
</script>

<QueryClientProvider client={queryClient}>
  {#if mode === 'page' && id !== null}
    <ShowPage resourceName={resource} {id} {layout}>
      <p data-testid="detail-child">Checked detail extension</p>
    </ShowPage>
  {:else if mode === 'drawer'}
    <RecordDetailDrawer resourceName={resource} bind:open
      {...definedOptions({ recordId: id === null ? undefined : id })} {onClose} />
  {/if}
</QueryClientProvider>
