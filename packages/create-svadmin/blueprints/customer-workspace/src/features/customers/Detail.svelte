<script lang="ts">
  import { useCan, useList } from '@svadmin/core';
  import { Button, ContentPageShell, DataState, PageSection, ShowPage } from '@svadmin/ui';
  import { getDesign } from '../../design.svelte';
  import { followups } from './contracts';
  let { resourceName, id }: { resourceName: string; id?: string | number } = $props();
  const design = $derived(getDesign());
  const permission = useCan(() => ({ resource: 'followups', action: 'list' }));
  const records = useList(() => ({
    resource: followups,
    filters: [{ field: 'customerId', operator: 'eq', value: String(id) }],
    sorters: [{ field: 'date', order: 'desc' }],
    pagination: { current: 1, pageSize: 5 },
    queryOptions: { enabled: id !== undefined && permission.allowed },
  }));
</script>

<ContentPageShell pageId="customer-detail" width={design.width} density={design.density}>
  {#if id !== undefined}
    <ShowPage {resourceName} {id} layout={design.detailLayout} density={design.density}>
      <PageSection title="最近跟进">
        {#snippet actions()}<Button variant="ghost" href="#/followups">全部记录</Button>{/snippet}
        {#if permission.isLoading || records.isLoading}
          <DataState state="loading" />
        {:else if !permission.allowed}
          <DataState state="forbidden" />
        {:else if records.isError}
          <DataState state="error" retry={() => { void records.refetch(); }} />
        {:else if !records.data?.data.length}
          <DataState state="empty" title="暂无跟进记录" />
        {:else}
          <ol class="followups">
            {#each records.data.data as record (record.id)}
              <li><p>{record.summary}</p><span>{record.owner} · {record.date}</span></li>
            {/each}
          </ol>
        {/if}
      </PageSection>
    </ShowPage>
  {:else}
    <DataState state="error" title="缺少客户编号" />
  {/if}
</ContentPageShell>

<style>
  .followups { list-style: none; padding: 0; margin: 0; }
  li { padding: 1rem 0; border-bottom: 1px solid var(--border); overflow-wrap: anywhere; }
  p { margin: 0 0 .375rem; }
  span { color: var(--muted-foreground); font-size: .8125rem; }
</style>
