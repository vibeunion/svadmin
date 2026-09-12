<script lang="ts">
  import type { ResourceDefinition } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';

  import { definedOptions } from '@svadmin/core/options';

  import {
    provideAdminContext,
    type AuthProvider,
    type DataProvider,
    type RouterProvider,
    type TenantContext,
  } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import type { LayoutAIAssistantProps } from './Layout.svelte';
  import Layout from './Layout.svelte';

  let {
    authProvider,
    tenant,
    withAIAssistant = false,
  }: {
    // A present undefined value removes a previously supplied provider on rerender.
    authProvider?: AuthProvider | undefined;
    tenant: TenantContext;
    withAIAssistant?: boolean;
  } = $props();

  const fallbackDataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://layout-auth-scope.example.test',
  } as DataProvider;
  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ resource: 'layout', action: 'list', params: {}, pathname: '/layout' }),
  };
  const queryClient = new QueryClient();

  provideAdminContext(definedReactiveOptions({
    dataProvider: fallbackDataProvider,
    get authProvider() { return authProvider; },
    resources: [] satisfies ResourceDefinition[],
    routerProvider,
    get tenant() { return tenant; },
  }));
</script>

{#snippet content()}
  <span data-testid="layout-auth-content">layout auth content</span>
{/snippet}

{#snippet aiAssistant({ scope, ownerScope }: LayoutAIAssistantProps)}
  <output
    data-testid="layout-ai-assistant"
    data-scope={scope}
    data-owner-scope={ownerScope}
  >assistant</output>
{/snippet}

<QueryClientProvider client={queryClient}>
  <Layout children={content} {...definedOptions({ "aiAssistant": withAIAssistant ? aiAssistant : undefined })} />
</QueryClientProvider>
