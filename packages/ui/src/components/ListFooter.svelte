<script lang="ts">
  import ListPagination from './ListPagination.svelte';

  interface Props {
    label: string;
    total: number;
    loadedCount?: number;
    page: number;
    totalPages: number;
    rangeStart?: number;
    rangeEnd?: number;
    pageSize?: number;
    pageSizeOptions?: readonly number[];
    pageSizeLabel?: string;
    truncated?: boolean;
    maxRecords?: number;
    note?: string;
    sectionId?: string;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    class?: string;
  }

  let {
    label,
    total,
    loadedCount = total,
    page,
    totalPages,
    rangeStart = 0,
    rangeEnd = 0,
    pageSize,
    pageSizeOptions,
    pageSizeLabel,
    truncated = false,
    maxRecords = 1000,
    note = '',
    sectionId,
    onPageChange,
    onPageSizeChange,
    class: className = '',
  }: Props = $props();
</script>

<div class={`svadmin-list-footer ${className}`.trim()} data-svadmin-list-footer data-section={sectionId}>
  <div class="svadmin-list-footer__status">
    <span>共 {loadedCount} 条</span>
    {#if truncated}
      <span class="svadmin-list-footer__note" data-svadmin-list-truncated>
        结果较多，仅加载前 {maxRecords} 条，请用筛选收窄范围。
      </span>
    {:else if note}
      <span class="svadmin-list-footer__note">{note}</span>
    {/if}
  </div>
  <ListPagination
    {label}
    {page}
    {totalPages}
    {total}
    {rangeStart}
    {rangeEnd}
    {pageSize}
    {pageSizeOptions}
    {pageSizeLabel}
    {onPageChange}
    {onPageSizeChange}
    showSummary={false}
  />
</div>

<style>
  .svadmin-list-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .75rem 1rem; min-width: 0; border-top: 1px solid var(--border); padding: .75rem 0 0; }
  .svadmin-list-footer__status { display: flex; align-items: baseline; flex-wrap: wrap; gap: .35rem .75rem; min-width: 0; font-size: .8125rem; color: var(--muted-foreground); }
  .svadmin-list-footer__note { color: var(--foreground); }
</style>
