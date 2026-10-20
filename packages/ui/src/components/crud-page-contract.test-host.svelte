<script lang="ts">
  import {
    provideAdminContext,
    type DataProvider,
    type ResourceDefinition,
    type RouterProvider,
  } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import type { Snippet } from 'svelte';
  import CreatePage from './CreatePage.svelte';
  import EditPage from './EditPage.svelte';
  import ListPage from './ListPage.svelte';

  let {
    page = 'list',
    provider,
    resources,
    queryClient,
    router,
    id = 1,
  }: {
    page?: 'list' | 'create' | 'edit';
    provider: DataProvider;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    router: RouterProvider;
    id?: string | number;
  } = $props();

  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get routerProvider() { return router; },
  }));
</script>

{#snippet formActions({ isLoading, onSubmit }: { isLoading: boolean; onSubmit: () => void })}
  <button type="button" data-testid="custom-form-action" disabled={isLoading} onclick={onSubmit}>
    保存并继续
  </button>
{/snippet}

<QueryClientProvider client={queryClient}>
  {#if page === 'list'}
    <ListPage resourceName="posts" selectable>
      {#snippet statusTabs()}
        <div data-testid="status-tabs">状态标签</div>
      {/snippet}
      {#snippet filterToolbar()}
        <div data-testid="filter-toolbar">筛选工具栏</div>
      {/snippet}
    </ListPage>
  {:else if page === 'create'}
    <CreatePage resourceName="posts" {formActions} />
  {:else}
    <EditPage resourceName="posts" {id} {formActions} />
  {/if}
</QueryClientProvider>
