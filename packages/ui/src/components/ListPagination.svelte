<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
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
    showSummary?: boolean;
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
    pageSizeLabel = '每页条数',
    showSummary = true,
    onPageChange,
    onPageSizeChange,
    class: className = '',
    ...restProps
  }: Props = $props();

  const items = $derived(listPaginationItems(page, totalPages));
  const paginated = $derived(totalPages > 1);
</script>

{#if paginated}
  <div {...restProps} class={`svadmin-list-pagination ${className}`.trim()} role="navigation" aria-label={`${label}分页导航`}>
    {#if showSummary}
      <div class="svadmin-list-pagination__info">
        <span>第 {rangeStart}–{rangeEnd} 条 / 共 {total} 条</span>
        {#if onPageSizeChange && pageSize !== undefined}
          <span class="svadmin-list-pagination__size">{pageSizeLabel}
            <select
              aria-label={`${label}每页条数`}
              value={pageSize}
              onchange={(event) => onPageSizeChange?.(Number((event.currentTarget as HTMLSelectElement).value))}
            >
              {#each pageSizeOptions as size (size)}<option value={size}>{size} 条</option>{/each}
            </select>
          </span>
        {/if}
      </div>
    {/if}
    <div class="svadmin-list-pagination__controls">
      <button type="button" class="svadmin-list-pagination__control" disabled={page <= 1}
        title={page <= 1 ? '已经是第一页。' : '上一页'}
        aria-label={`${label}上一页`} onclick={() => onPageChange(page - 1)}>上一页</button>
      <div class="svadmin-list-pagination__pages" role="group" aria-label={`${label}页码列表`}>
        {#each items as item, index (item === 'ellipsis' ? `ellipsis-${index}` : item)}
          {#if item === 'ellipsis'}
            <span class="svadmin-list-pagination__ellipsis" aria-hidden="true">…</span>
          {:else}
            <button type="button" class="svadmin-list-pagination__page"
              class:svadmin-list-pagination__page--active={item === page}
              aria-label={`${label}第 ${item} 页`} aria-current={item === page ? 'page' : undefined}
              title={item === page ? `当前第 ${item} 页` : `前往第 ${item} 页`}
              disabled={item === page}
              onclick={() => onPageChange(item)}>{item}</button>
          {/if}
        {/each}
      </div>
      <button type="button" class="svadmin-list-pagination__control" disabled={page >= totalPages}
        title={page >= totalPages ? '已经是最后一页。' : '下一页'}
        aria-label={`${label}下一页`} onclick={() => onPageChange(page + 1)}>下一页</button>
    </div>
  </div>
{:else if showSummary}
  <p class={`svadmin-list-pagination__summary ${className}`.trim()}>共 {total} 条</p>
{/if}

<style>
  .svadmin-list-pagination { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: .75rem; min-width: 0; color: var(--foreground); }
  .svadmin-list-pagination__info { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; font-size: .8125rem; color: var(--muted-foreground); }
  .svadmin-list-pagination__size { display: inline-flex; align-items: center; gap: .35rem; }
  .svadmin-list-pagination__size select { height: 2rem; border: 1px solid var(--border); border-radius: .375rem; background: var(--background); color: inherit; padding: 0 .45rem; font: inherit; }
  .svadmin-list-pagination__controls { display: flex; align-items: center; gap: .25rem; }
  .svadmin-list-pagination__pages { display: flex; align-items: center; gap: .25rem; }
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
  .svadmin-list-pagination__summary { margin: 0; font-size: .8125rem; color: var(--muted-foreground); }
</style>
