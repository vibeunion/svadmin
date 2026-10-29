<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { listText } from './list-i18n.js';
  import ListPagination from './ListPagination.svelte';

  interface Props {
    label: string;
    total: number;
    loadedCount?: number | undefined;
    page: number;
    totalPages: number;
    rangeStart?: number | undefined;
    rangeEnd?: number | undefined;
    pageSize?: number | undefined;
    pageSizeOptions?: readonly number[] | undefined;
    pageSizeLabel?: string | undefined;
    showSummary?: boolean | undefined;
    truncated?: boolean;
    maxRecords?: number | undefined;
    note?: string | undefined;
    sectionId?: string | undefined;
    onPageChange: (page: number) => void;
    onPageSizeChange?: ((pageSize: number) => void) | undefined;
    class?: string | undefined;
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
    showSummary = false,
    truncated = false,
    maxRecords = 1000,
    note = '',
    sectionId,
    onPageChange,
    onPageSizeChange,
    class: className = '',
  }: Props = $props();

  const i18n = useTranslation();
</script>

<div class={`svadmin-list-footer ${className}`.trim()} data-svadmin-list-footer data-section={sectionId}>
  <div class="svadmin-list-footer__status">
    <span>{listText(i18n, 'common.total', { total: loadedCount })}</span>
    {#if truncated}
      <span class="svadmin-list-footer__note" data-svadmin-list-truncated>
        {listText(i18n, 'listFooter.truncated', { maxRecords })}
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
    showSummary={showSummary && totalPages > 1}
  />
</div>

<style>
  .svadmin-list-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .75rem 1rem; min-width: 0; border-top: 1px solid var(--border); padding: .75rem 0 0; }
  .svadmin-list-footer__status { display: flex; align-items: baseline; flex-wrap: wrap; gap: .35rem .75rem; min-width: 0; font-size: .8125rem; color: var(--muted-foreground); }
  .svadmin-list-footer__note { color: var(--foreground); }
</style>
