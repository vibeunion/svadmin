<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition, type AuthProvider, type NotificationProvider,
    type RouterProvider } from '@svadmin/core';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import type { SelectSettings, SelectState } from './select-contract.test.types';
  import Probe from './select-contract.test-probe.svelte';
  import ComboboxField from './ComboboxField.svelte';

  let { provider, resources, queryClient, onReady = () => {}, settings = {},
    resource = 'posts', tenant = 'first', field = false, value = null, onchange, multiple = false,
    optionLabel = 'title', optionValue = 'id', disabled = false, fetchSize = 50,
    authProvider = null, notificationProvider = null,
    routerProvider = { go: () => {}, back: () => {}, parse: () => ({ pathname: '/', params: {} }) },
  }: {
    provider: DataProvider | Record<string, DataProvider>;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    onReady?: (value: SelectState) => void;
    settings?: SelectSettings;
    resource?: string;
    tenant?: string;
    field?: boolean;
    value?: string | number | null | (string | number)[];
    onchange?: (value: string | number | null | (string | number)[]) => void;
    multiple?: boolean;
    optionLabel?: string;
    optionValue?: string;
    disabled?: boolean;
    fetchSize?: number;
    authProvider?: AuthProvider | null;
    notificationProvider?: NotificationProvider | null;
    routerProvider?: RouterProvider;
  } = $props();
  provideAdminContext({
    get dataProvider() { return provider; },
    get resources() { return resources; },
    get tenant() { return { tenantId: tenant }; },
    get authProvider() { return authProvider; },
    get notificationProvider() { return notificationProvider; },
    get routerProvider() { return routerProvider; },
  });
</script>

<QueryClientProvider client={queryClient}>
  {#if field}
    <ComboboxField {resource} {value} onchange={(next) => { value = next; onchange?.(next); }}
      {optionLabel} {optionValue} {multiple} {disabled} {fetchSize} aria-label="Record" />
  {:else}
    <Probe {resource} {settings} {onReady} />
  {/if}
</QueryClientProvider>
