<script lang="ts">
  import type { Snippet } from 'svelte';
  import { definedOptions } from '@svadmin/core/options';
  import { useTranslation } from '@svadmin/core/i18n';
  import { DataState } from '@svadmin/ui';

  let { query, count, hasActiveFilters = false, filteredEmptyAction, children }: {
    query: { isLoading: boolean; isError: boolean; refetch: () => unknown };
    count?: number;
    hasActiveFilters?: boolean;
    filteredEmptyAction?: Snippet;
    children: Snippet;
  } = $props();
  const i18n = useTranslation();
</script>

{#if query.isLoading}
  <DataState state="loading" loadingLabel={i18n.locale === 'zh-CN' ? '正在加载…' : 'Loading…'} />
{:else if query.isError}
  <DataState
    state="error"
    title={i18n.locale === 'zh-CN' ? '数据加载失败' : 'Unable to load data'}
    description={i18n.locale === 'zh-CN' ? '请重试。' : 'Please retry.'}
    retry={() => void query.refetch()}
  />
{:else}
  {#if count === undefined}
    {@render children()}
  {:else if count === 0}
    <DataState state={hasActiveFilters ? 'filtered-empty' : 'empty'} {...definedOptions({ action: hasActiveFilters ? filteredEmptyAction : undefined })} />
  {:else}
    {@render children()}
  {/if}
{/if}
