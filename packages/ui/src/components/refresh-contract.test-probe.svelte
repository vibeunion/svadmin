<script lang="ts">
  import { useInfiniteList, useInvalidate, useResourceContract } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import type { RefreshState } from './refresh-contract.test.types';

  let { resource, activeQuery, providerOverride, onReady }: {
    resource: string;
    activeQuery: boolean;
    providerOverride: string;
    onReady: (value: RefreshState) => void;
  } = $props();
  const binding = useResourceContract(() => resource);
  const { query } = useInfiniteList(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
    get meta() { return binding.meta; },
    get queryOptions() { return { enabled: activeQuery }; },
  }));
  const invalidate = useInvalidate(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return providerOverride || binding.dataProviderName; },
  }));
  $effect(() => onReady({ query, invalidate }));
  const records = $derived(query.data?.pages.flatMap(page => page.data) ?? []);
</script>

{#each records as item (item.id)}
  <output data-testid="row">{String(item['title'])}</output>
{/each}
