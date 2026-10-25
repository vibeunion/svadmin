<script lang="ts">
  import { provideAdminContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
  import { definedOptions } from '@svadmin/core/options';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import AutoComplete from './AutoComplete.svelte';

  let {
    provider,
    resources,
    queryClient,
    value = null,
    onchange,
    fetchSize = 50,
    requestTimeout,
    debounce,
    disabled = false,
    placeholder,
    optionLabel = 'title',
    optionValue = 'id',
  }: {
    provider: DataProvider;
    resources: ResourceDefinition[];
    queryClient: QueryClient;
    value?: string | number | null;
    onchange?: (value: string | number | null) => void;
    fetchSize?: number;
    requestTimeout?: number;
    debounce?: number;
    disabled?: boolean;
    placeholder?: string;
    optionLabel?: string;
    optionValue?: string;
  } = $props();

  provideAdminContext({
    get dataProvider() { return provider; },
    get resources() { return resources; },
  });
</script>

<QueryClientProvider client={queryClient}>
  <AutoComplete resource="posts" {value} onchange={(next) => { value = next; onchange?.(next); }}
    {...definedOptions({ fetchSize, requestTimeout, debounce, disabled, placeholder, optionLabel, optionValue })}
    aria-label="Record" />
</QueryClientProvider>