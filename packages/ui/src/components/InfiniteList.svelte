<script lang="ts">
  import { definedReactiveOptions } from '@svadmin/core/options';

  import { fade } from 'svelte/transition';
  import { captureAdminContext, useInfiniteList, useResourceContract } from '@svadmin/core';
  import type { BaseRecord, DataProvider, Sort, Filter } from '@svadmin/core';
  import type { Snippet } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';

  import { Skeleton } from './ui/skeleton/index.js';
  import { Loader2, RotateCw } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import { intersect } from '../actions.js';

  const i18n = useTranslation();

  interface Props {
    resource: string;
    pageSize?: number;
    sorters?: Sort[];
    filters?: Filter[];
    /** Render each item */
    children: Snippet<[{ item: BaseRecord & { id: string | number }; index: number }]>;
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

  const context = captureAdminContext();
  const binding = useResourceContract(() => resource);
  const { query } = useInfiniteList(definedReactiveOptions({
    get resource() { return binding.resource; },
    // 查询错误由列表内的错误提示和重试按钮承接。
    errorNotification: false,
    get dataProviderName() { return binding.dataProviderName; },
    get meta() { return binding.meta; },
    get pagination() { return { pageSize }; },
    get sorters() { return sorters; },
    get filters() { return filters; },
  }));

  const allItems = $derived(
    query.data?.pages.flatMap(p => p.data) ?? []
  );

  const hasNextPage = $derived(query.hasNextPage ?? false);
  const isFetchingNextPage = $derived(query.isFetchingNextPage ?? false);
  const isFetchNextPageError = $derived(query.isFetchNextPageError && query.data !== undefined);
  const isBlockingError = $derived(
    query.isError && (query.data === undefined || !query.isFetchNextPageError)
  );

  function loadMore() {
    if (hasNextPage && !query.isFetching && !query.isError) {
      void query.fetchNextPage({ cancelRefetch: false });
    }
  }

  function itemKey(item: BaseRecord & { id: string | number }): string {
    return `${typeof item.id}:${String(item.id)}`;
  }

  // 同名 Provider 替换也属于新作用域，不能仅按名称复用行草稿。
  const providerIds = new WeakMap<DataProvider, number>();
  let nextProviderId = 0;
  const rowScope = $derived.by(() => {
    const providerName = binding.dataProviderName;
    const provider = context.providers?.[providerName];
    let providerId = provider === undefined ? undefined : providerIds.get(provider);
    if (provider !== undefined && providerId === undefined) {
      providerId = ++nextProviderId;
      providerIds.set(provider, providerId);
    }
    return JSON.stringify([resource, providerName, context.tenantCacheKey, providerId]);
  });

  const keyedItems = $derived.by(() => {
    const seen = new Map<string, number>();
    return allItems.map(item => {
      const base = itemKey(item);
      const occurrence = seen.get(base) ?? 0;
      seen.set(base, occurrence + 1);
      return { item, key: `${rowScope}:${base}:${occurrence}` };
    });
  });
</script>

<div class="space-y-2">
  {#if query.isLoading}
    {#if loadingSkeleton}
      {@render loadingSkeleton()}
    {:else}
      <div class="space-y-3">
        {#each Array(5) as _, _i (_i)}
          <Skeleton class="h-16 w-full rounded-lg" />
        {/each}
      </div>
    {/if}
  {:else if isBlockingError}
    <div role="alert">
      <p>{i18n.t('common.error')}</p>
      <Button variant="outline" disabled={query.isFetching} onclick={() => query.refetch()}>
        <RotateCw />
        {i18n.t('common.retry')}
      </Button>
    </div>
  {:else if allItems.length === 0}
    {#if empty}
      {@render empty()}
    {:else}
      <p class="text-center text-sm text-muted-foreground py-8">{i18n.t('empty.title')}</p>
    {/if}
  {:else}
    {#each keyedItems as entry, index (entry.key)}
      {@const item = entry.item}
      <div in:fade={{ duration: 200, delay: index < 20 ? index * 30 : 0 }}>
        {@render children({ item, index })}
      </div>
    {/each}

    {#if isFetchingNextPage}
      <div class="flex justify-center py-4">
        <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    {:else if isFetchNextPageError}
      <div role="alert">
        <p>{i18n.t('common.error')}</p>
        <Button type="button" variant="outline" disabled={query.isFetching}
          onclick={() => query.fetchNextPage({ cancelRefetch: false })}>
          <RotateCw />
          {i18n.t('common.retry')}
        </Button>
      </div>
    {:else if hasNextPage}
      <!-- Sentinel for infinite scroll -->
      <div use:intersect={loadMore} class="h-1"></div>
    {:else}
      <p class="text-center text-xs text-muted-foreground py-2">{i18n.t('empty.noMore')}</p>
    {/if}
  {/if}
</div>
