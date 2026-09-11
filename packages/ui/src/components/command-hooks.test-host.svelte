<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { provideAdminContext, type DataProvider, type AuthProvider, type RouterProvider } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import Probe from './command-hooks.test-probe.svelte';
  import type { CommandState, CommandAuthActions, CommandSettings } from './command-hooks.test.types';

  let { provider, queryClient, onReady, settings = {}, tenant = 'first', auth, onAuthReady,
    router = { go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
  }: {
    provider: DataProvider | Record<string, DataProvider>;
    queryClient: QueryClient;
    onReady: (state: CommandState) => void;
    settings?: CommandSettings;
    tenant?: string;
    auth?: AuthProvider;
    router?: RouterProvider;
    onAuthReady?: (actions: CommandAuthActions) => void;
  } = $props();
  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return []; },
    get tenant() { return { tenantId: tenant }; },
    get authProvider() { return auth; },
    get routerProvider() { return router; },
  }));
</script>
<QueryClientProvider client={queryClient}>
  {#key onAuthReady !== undefined}
    <Probe {settings} {onReady} {onAuthReady} />
  {/key}
</QueryClientProvider>
