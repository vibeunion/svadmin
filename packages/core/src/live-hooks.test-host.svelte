<script lang="ts">
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import { provideAdminContext } from './context.svelte';
  import type { DataProvider, AuthProvider, ResourceDefinition } from './types';
  import type { RouterProvider } from './router-provider';
  import type { LiveProvider } from './live.svelte';
  import type { ResourceContract } from './resource-contract';
  import type { LiveSubscriptionParams } from './hook-utils.svelte';
  import { definedReactiveOptions } from './defined-options';
  import Probe from './live-hooks.test-probe.svelte';
  import type { LiveAuthTestActions } from './live-auth.test.types';
  import type { LiveHookTestState } from './live-hooks.test.types';

  let { mode = 'shared', live, data, resources, contract, client, settings, auth, router,
    tenant = 'first', visible = true, onReady = () => {}, onAuthReady,
  }: {
    mode?: 'live' | 'subscription' | 'shared' | 'list' | 'one' | 'many' | 'infinite' | 'publish';
    live: LiveProvider;
    data: DataProvider | Record<string, DataProvider>;
    resources: ResourceDefinition[];
    contract: ResourceContract;
    client: QueryClient;
    settings: Omit<LiveSubscriptionParams, 'liveProvider'>;
    auth?: AuthProvider;
    router?: RouterProvider;
    tenant?: string;
    visible?: boolean;
    onReady?: (state: LiveHookTestState) => void;
    onAuthReady?: (actions: LiveAuthTestActions) => void;
  } = $props();
  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return data; },
    get liveProvider() { return live; },
    get resources() { return resources; },
    get authProvider() { return auth; },
    get routerProvider() { return router; },
    get tenant() { return { tenantId: tenant }; },
  }));
</script>
<QueryClientProvider client={client}>
  {#if visible}
    {#key `${mode}:${onAuthReady !== undefined}`}
      <Probe {mode} {live} {contract} {settings} {onReady} {onAuthReady} />
    {/key}
  {/if}
</QueryClientProvider>
