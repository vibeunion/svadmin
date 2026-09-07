<script lang="ts">
  import { fade } from 'svelte/transition';
  import { useInfiniteList } from '@svadmin/core';
  import type { BaseRecord, Sort, Filter } from '@svadmin/core';
  import type { Snippet } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';

  import { Skeleton } from './ui/skeleton/index.js';
  import { Loader2 } from '@lucide/svelte';
  import { intersect } from '../actions.js';

  const i18n = useTranslation();

  interface Props<T extends BaseRecord = BaseRecord> {
    resource: string;
    pageSize?: number;
    sorters?: Sort[];
    filters?: Filter[];
    /** Render each item */
    children: Snippet<[{ item: T; index: number }]>;
    /** Custom empty state */
    empty?: Snippet;
    /** Custom loading skeleton */
    loadingSkeleton?: Snippet;
  }

  let {
    resource,
    pageSize = 20,
    sorters,
    filters,
    children,
    empty,
    loadingSkeleton,
  }: Props = $props();

  const { query } = useInfiniteList({
    get resource() { return resource; },
    get pagination() { return { pageSize }; },
    get sorters() { return sorters; },
    get filters() { return filters; },
  });

  const allItems = $derived(
    (query.data as { pages?: { data: BaseRecord[] }[] })?.pages?.flatMap(p => p.data) ?? []
  );

  const hasNextPage = $derived(query.hasNextPage ?? false);
  const isFetchingNextPage = $derived(query.isFetchingNextPage ?? false);

  function loadMore() {
    if (hasNextPage && !isFetchingNextPage) {
      query.fetchNextPage();
    }
  }
</script>

<div class="svadmin-u-6f7e013d6499">
  {#if query.isLoading}
    {#if loadingSkeleton}
      {@render loadingSkeleton()}
    {:else}
      <div class="svadmin-u-6ed543e2fbbb">
        {#each Array(5) as _, _i (_i)}
          <Skeleton class="svadmin-u-acaee62117b1 svadmin-u-6da6a3c3f741 svadmin-u-5f22e64f2282" />
        {/each}
      </div>
    {/if}
  {:else if allItems.length === 0}
    {#if empty}
      {@render empty()}
    {:else}
      <p class="svadmin-u-ca6bf63030aa svadmin-u-fc7473ca09eb svadmin-u-bfa603190748 svadmin-u-a1f611f027dd">{i18n.t('empty.title')}</p>
    {/if}
  {:else}
    {#each allItems as item, index (index)}
      <div in:fade={{ duration: 200, delay: index < 20 ? index * 30 : 0 }}>
        {@render children({ item, index })}
      </div>
    {/each}

    {#if isFetchingNextPage}
      <div class="svadmin-u-60fbb7713999 svadmin-u-86843cf1e227 svadmin-u-cb11fec3bb46">
        <Loader2 class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-afbdd13a380e svadmin-u-bfa603190748" />
      </div>
    {/if}

    {#if hasNextPage}
      <!-- Sentinel for infinite scroll -->
      <div use:intersect={loadMore} class="svadmin-u-3a1268a4e17f"></div>
    {:else}
      <p class="svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-03b4dd7f172b">{i18n.t('empty.noMore')}</p>
    {/if}
  {/if}
</div>
