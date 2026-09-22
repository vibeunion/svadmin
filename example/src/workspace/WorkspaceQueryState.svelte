<script lang="ts">
  import type { Snippet } from 'svelte';
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '@svadmin/ui';

  let { query, count, children }: {
    query: { isLoading: boolean; isError: boolean; refetch: () => unknown };
    count?: number;
    children: Snippet;
  } = $props();
  const i18n = useTranslation();
</script>

{#if query.isLoading}
  <p role="status" class="py-6 text-sm text-muted-foreground">{i18n.locale === 'zh-CN' ? '正在加载…' : 'Loading…'}</p>
{:else if query.isError}
  <div role="alert" class="flex flex-wrap items-center gap-3 py-6">
    <p>{i18n.locale === 'zh-CN' ? '数据加载失败，请重试。' : 'Unable to load data. Please retry.'}</p>
    <Button variant="outline" onclick={() => void query.refetch()}>{i18n.locale === 'zh-CN' ? '重试' : 'Retry'}</Button>
  </div>
{:else}
  {#if count === 0}<p role="status" class="py-4 text-sm text-muted-foreground">{i18n.locale === 'zh-CN' ? '当前没有匹配记录，可调整筛选或新建记录。' : 'No matching records. Adjust filters or create a record.'}</p>{/if}
  {@render children()}
{/if}
