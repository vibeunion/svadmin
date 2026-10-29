<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { useTranslation } from '@svadmin/core/i18n';
  import { listText } from './list-i18n.js';
  import { listPaginationItems } from './list-pagination.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> & {
    page: number;
    totalPages: number;
    total: number;
    label: string;
    rangeStart?: number | undefined;
    rangeEnd?: number | undefined;
    pageSize?: number | undefined;
    pageSizeOptions?: readonly number[] | undefined;
    pageSizeLabel?: string | undefined;
    showSummary?: boolean | undefined;
    simple?: boolean | undefined;
    showJumper?: boolean | undefined;
    onPageChange: (page: number) => void;
    onPageSizeChange?: ((pageSize: number) => void) | undefined;
    class?: string | undefined;
  };

  let {
    page,
    totalPages,
    total,
    label,
    rangeStart = 0,
    rangeEnd = 0,
    pageSize,
    pageSizeOptions = [10, 20, 50],
    pageSizeLabel,
    showSummary = true,
    simple = false,
    showJumper = false,
    onPageChange,
    onPageSizeChange,
    class: className = '',
    ...restProps
  }: Props = $props();

  const i18n = useTranslation();

  const items = $derived(listPaginationItems(page, totalPages));
  const paginated = $derived(totalPages > 1);

  function jump(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const next = Number(input.value);
    if (!Number.isFinite(next)) { input.value = String(page); return; }
    const clamped = Math.max(1, Math.min(totalPages, Math.trunc(next)));
    input.value = String(clamped);
    if (clamped !== page) onPageChange(clamped);
  }
</script>

{#if paginated}
  <div {...restProps} class={`svadmin-list-pagination ${className}`.trim()} role="navigation" aria-label={listText(i18n, 'listPagination.navigation', { label })}>
    {#if showSummary}
      <div class="svadmin-list-pagination__info">
        <span>{listText(i18n, 'listPagination.range', { start: rangeStart, end: rangeEnd, total })}</span>
        {#if onPageSizeChange && pageSize !== undefined}
          <span class="svadmin-list-pagination__size">{pageSizeLabel ?? listText(i18n, 'listPagination.pageSizeLabel')}
            <select
              aria-label={listText(i18n, 'listPagination.pageSizeAria', { label })}
              value={pageSize}
              onchange={(event) => onPageSizeChange?.(Number((event.currentTarget as HTMLSelectElement).value))}
            >
              {#each pageSizeOptions as size (size)}<option value={size}>{listText(i18n, 'listPagination.pageSizeOption', { size })}</option>{/each}
            </select>
          </span>
        {/if}
      </div>
    {/if}
    <div class="svadmin-list-pagination__controls">
      <button type="button" class="svadmin-list-pagination__control" disabled={page <= 1}
        title={listText(i18n, page <= 1 ? 'listPagination.firstPage' : 'listPagination.previous')}
        aria-label={listText(i18n, 'listPagination.previousAria', { label })} onclick={() => onPageChange(page - 1)}>{listText(i18n, 'listPagination.previous')}</button>
      {#if simple}
        <span class="svadmin-list-pagination__simple">{listText(i18n, 'listPagination.simplePage', { page, total: totalPages })}</span>
      {:else}
        <div class="svadmin-list-pagination__pages" role="group" aria-label={listText(i18n, 'listPagination.pageList', { label })}>
          {#each items as item, index (item === 'ellipsis' ? `ellipsis-${index}` : item)}
            {#if item === 'ellipsis'}
              <span class="svadmin-list-pagination__ellipsis" aria-hidden="true">…</span>
            {:else}
              <button type="button" class="svadmin-list-pagination__page"
                class:svadmin-list-pagination__page--active={item === page}
                aria-label={listText(i18n, 'listPagination.pageAria', { label, page: item })} aria-current={item === page ? 'page' : undefined}
                title={listText(i18n, item === page ? 'listPagination.currentPage' : 'listPagination.goToPage', { page: item })}
                disabled={item === page}
                onclick={() => onPageChange(item)}>{item}</button>
            {/if}
          {/each}
        </div>
        {#if showJumper}
          <label class="svadmin-list-pagination__jumper">
            <span>{listText(i18n, 'listPagination.jumpTo')}</span>
            <input type="number" min="1" max={totalPages} value={page}
              aria-label={listText(i18n, 'listPagination.jumpToAria', { label })}
              onchange={jump} onkeydown={(event) => { if (event.key === 'Enter') jump(event); }} />
          </label>
        {/if}
      {/if}
      <button type="button" class="svadmin-list-pagination__control" disabled={page >= totalPages}
        title={listText(i18n, page >= totalPages ? 'listPagination.lastPage' : 'listPagination.next')}
        aria-label={listText(i18n, 'listPagination.nextAria', { label })} onclick={() => onPageChange(page + 1)}>{listText(i18n, 'listPagination.next')}</button>
    </div>
  </div>
{:else if showSummary}
  <p {...restProps} class={`svadmin-list-pagination__summary ${className}`.trim()}>{listText(i18n, 'common.total', { total })}</p>
{/if}

<style>
  .svadmin-list-pagination { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: .75rem; min-width: 0; color: var(--foreground); }
  .svadmin-list-pagination__info { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; font-size: .8125rem; color: var(--muted-foreground); }
  .svadmin-list-pagination__size { display: inline-flex; align-items: center; gap: .35rem; }
  .svadmin-list-pagination__size select { height: 2rem; border: 1px solid var(--border); border-radius: .375rem; background: var(--background); color: inherit; padding: 0 .45rem; font: inherit; }
  .svadmin-list-pagination__controls { display: flex; align-items: center; flex-wrap: var(--svadmin-list-pagination-wrap, wrap); gap: .25rem; }
  .svadmin-list-pagination__pages { display: flex; align-items: center; flex-wrap: var(--svadmin-list-pagination-wrap, wrap); min-width: 0; gap: var(--svadmin-list-pagination-gap, .5rem); }
  .svadmin-list-pagination__control,
  .svadmin-list-pagination__page { min-width: 2.25rem; height: 2.25rem; padding: 0 .75rem; border: 1px solid var(--border); border-radius: .375rem; background: var(--background); color: inherit; cursor: pointer; font-size: .8125rem; }
  .svadmin-list-pagination__page { padding: 0 .5rem; }
  .svadmin-list-pagination__control:hover:not(:disabled),
  .svadmin-list-pagination__page:hover:not(:disabled) { border-color: var(--ring); color: var(--primary); }
  .svadmin-list-pagination__page--active,
  .svadmin-list-pagination__page--active:disabled { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); opacity: 1; }
  .svadmin-list-pagination__control:disabled,
  .svadmin-list-pagination__page:disabled { opacity: .55; cursor: not-allowed; }
  .svadmin-list-pagination__ellipsis { min-width: 1.5rem; text-align: center; color: var(--muted-foreground); }
  .svadmin-list-pagination__simple { min-width: 6rem; color: var(--muted-foreground); font-size: .8125rem; text-align: center; }
  .svadmin-list-pagination__jumper { display: inline-flex; align-items: center; gap: .35rem; color: var(--muted-foreground); font-size: .8125rem; }
  .svadmin-list-pagination__jumper input { width: 3.5rem; height: 2.25rem; padding: 0 .4rem; border: 1px solid var(--border); border-radius: .375rem; background: var(--background); color: var(--foreground); font: inherit; }
  .svadmin-list-pagination__summary { margin: 0; font-size: .8125rem; color: var(--muted-foreground); }
</style>
