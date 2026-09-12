<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition,
    type AccessControlProvider, type UseImportOptions, type ContractSchemas, type AuthProvider, type RouterProvider } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import ImportButton from './buttons/ImportButton.svelte';
  import type { ButtonAccessControl } from './buttons/access-control';
  import Probe from './import-contract.test-probe.svelte';
  import type { ImportState, ImportAuthActions } from './import-contract.test.types';

  let { provider, resources, queryClient, resource = 'posts', tenant = 'first', permission,
    settings = {}, queryEnabled = true, onReady = () => {}, onFinish, mapData, accessControl, auth, onAuthReady,
    router = { go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }) }, showButton = true,
  }: {
    provider: DataProvider | Record<string, DataProvider>;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    resource?: string;
    tenant?: string;
    permission?: AccessControlProvider;
    settings?: Omit<UseImportOptions<ContractSchemas>, 'resource'>;
    queryEnabled?: boolean;
    onReady?: (state: ImportState) => void;
    onFinish?: UseImportOptions<ContractSchemas>['onFinish'];
    mapData?: UseImportOptions<ContractSchemas>['mapData'];
    accessControl?: ButtonAccessControl;
    auth?: AuthProvider;
    router?: RouterProvider;
    onAuthReady?: (actions: ImportAuthActions) => void;
    showButton?: boolean;
  } = $props();
  provideAdminContext(definedReactiveOptions({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get accessControlProvider() { return permission; },
    get authProvider() { return auth; },
    get routerProvider() { return router; },
  }));
</script>
<QueryClientProvider client={queryClient}>
  {#if showButton}
    <ImportButton {resource} {...definedReactiveOptions({
      get onFinish() { return onFinish; },
      get mapData() { return mapData; },
      get accessControl() { return accessControl; },
    })} />
  {/if}
  {#key onAuthReady !== undefined}
    <Probe {resource} {settings} {queryEnabled} {onReady} {onAuthReady} />
  {/key}
</QueryClientProvider>
