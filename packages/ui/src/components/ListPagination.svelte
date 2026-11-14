<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { useTranslation } from '@svadmin/core/i18n';
  import { useComponentConfig, DEFAULT_PAGE_SIZE_OPTIONS } from './ConfigProvider.svelte';
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
    pageSizeOptions,
    pageSizeLabel,
    showSummary,
    simple,
    showJumper,
    onPageChange,
    onPageSizeChange,
    class: className = '',
    ...restProps
  }: Props = $props();

  const i18n = useTranslation();
  const config = useComponentConfig();

  function booleanDefault(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
  }

  function numberList(value: unknown): readonly number[] | undefined {
    if (!Array.isArray(value) || value.length === 0) return undefined;
    if (value.some((item) => typeof item !== 'number' || !Number.isFinite(item))) return undefined;
    return value;
  }

  function numberDefault(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  const paginationDefaults = $derived(config.pagination);
  const paginationComponentDefaults = $derived(config.componentDefaults['Pagination'] ?? {});
  const resolvedPageSizeOptions = $derived(
    pageSizeOptions
      ?? paginationDefaults.pageSizeOptions
      ?? numberList(paginationComponentDefaults['pageSizeOptions'])
      ?? DEFAULT_PAGE_SIZE_OPTIONS,
  );
  const resolvedShowSummary = $derived(
    showSummary
      ?? paginationDefaults.showSummary
      ?? booleanDefault(paginationComponentDefaults['showSummary'])
      ?? true,
  );
  const resolvedSimple = $derived(
    simple
      ?? paginationDefaults.simple
      ?? booleanDefault(paginationComponentDefaults['simple'])
      ?? false,
  );
  const resolvedShowJumper = $derived(
    showJumper
      ?? paginationDefaults.showJumper
      ?? booleanDefault(paginationComponentDefaults['showJumper'])
      ?? false,
  );
  const resolvedPageSize = $derived(
    pageSize
      ?? paginationDefaults.pageSize
      ?? numberDefault(paginationComponentDefaults['pageSize']),
  );

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
    {#if resolvedShowSummary}
      <div class="svadmin-list-pagination__info">
        <span>{listText(i18n, 'listPagination.range', { start: rangeStart, end: rangeEnd, total })}</span>
        {#if onPageSizeChange && resolvedPageSize !== undefined}
          <span class="svadmin-list-pagination__size">{pageSizeLabel ?? listText(i18n, 'listPagination.pageSizeLabel')}
            <select
              aria-label={listText(i18n, 'listPagination.pageSizeAria', { label })}
              value={resolvedPageSize}
              onchange={(event) => onPageSizeChange?.(Number((event.currentTarget as HTMLSelectElement).value))}
            >
              {#each resolvedPageSizeOptions as size (size)}<option value={size}>{listText(i18n, 'listPagination.pageSizeOption', { size })}</option>{/each}
            </select>
          </span>
        {/if}
      </div>
    {/if}
    <div class="svadmin-list-pagination__controls">
      <button type="button" class="svadmin-list-pagination__control" disabled={page <= 1}
        title={listText(i18n, page <= 1 ? 'listPagination.firstPage' : 'listPagination.previous')}
        aria-label={listText(i18n, 'listPagination.previousAria', { label })} onclick={() => onPageChange(page - 1)}>{listText(i18n, 'listPagination.previous')}</button>
      {#if resolvedSimple}
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
        {#if resolvedShowJumper}
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
{:else if resolvedShowSummary}
  <p {...restProps} class={`svadmin-list-pagination__summary ${className}`.trim()}>{listText(i18n, 'common.total', { total })}</p>
{/if}

<style>
  .svadmin-list-pagination { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: .75rem; min-width: 0; color: var(--foreground); }
  .svadmin-list-pagination__info { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; font-size: .8125rem; color: var(--muted-foreground); }
  .svadmin-list-pagination__size { display: inline-flex; align-items: center; gap: .35rem; }
  .svadmin-list-pagination__size select {
    height: 2rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm, .25rem);
    background-color: var(--background);
    color: inherit;
    padding: 0 1.75rem 0 .5rem;
    font: inherit;
    font-size: .8125rem;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234E5969' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.45rem center;
    background-size: 0.75rem 0.75rem;
    outline: none;
    cursor: pointer;
    transition: border-color var(--svadmin-motion-fast) var(--svadmin-motion-easing);
  }
  .svadmin-list-pagination__size select:focus-visible,
  .svadmin-list-pagination__jumper input:focus-visible {
    border-color: var(--ring);
    outline: var(--svadmin-focus-width) solid color-mix(in oklch, var(--ring) 48%, transparent);
    outline-offset: var(--svadmin-focus-offset);
  }
  :is(.dark, [data-color-scheme="dark"]) .svadmin-list-pagination__size select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23B3B3B3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  }
  .svadmin-list-pagination__controls { display: flex; align-items: center; flex-wrap: var(--svadmin-list-pagination-wrap, wrap); gap: .25rem; }
  .svadmin-list-pagination__pages { display: flex; align-items: center; flex-wrap: var(--svadmin-list-pagination-wrap, wrap); min-width: 0; gap: var(--svadmin-list-pagination-gap, .5rem); }
  .svadmin-list-pagination__control,
  .svadmin-list-pagination__page {
    min-width: 2rem;
    height: 2rem;
    padding: 0 .625rem;
    border: 0;
    border-radius: 2px;
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
    font-size: .875rem;
    transition: background-color var(--svadmin-motion-fast) var(--svadmin-motion-easing), color var(--svadmin-motion-fast) var(--svadmin-motion-easing);
  }
  .svadmin-list-pagination__page { padding: 0 .5rem; }
  .svadmin-list-pagination__control:hover:not(:disabled),
  .svadmin-list-pagination__page:hover:not(:disabled) { background: var(--svadmin-fill-1, var(--muted)); color: var(--muted-foreground); }
  .svadmin-list-pagination__page--active,
  .svadmin-list-pagination__page--active:disabled { background: var(--primary-light-1, var(--accent)); color: var(--primary); opacity: 1; }
  .svadmin-list-pagination__control:disabled,
  .svadmin-list-pagination__page:disabled { opacity: 1; color: var(--svadmin-text-4); cursor: not-allowed; }
  .svadmin-list-pagination__control:focus-visible,
  .svadmin-list-pagination__page:focus-visible {
    outline: var(--svadmin-focus-width) solid color-mix(in oklch, var(--ring) 48%, transparent);
    outline-offset: var(--svadmin-focus-offset);
  }
  .svadmin-list-pagination__ellipsis { min-width: 1.5rem; text-align: center; color: var(--muted-foreground); }
  .svadmin-list-pagination__simple { min-width: 6rem; color: var(--muted-foreground); font-size: .8125rem; text-align: center; }
  .svadmin-list-pagination__jumper { display: inline-flex; align-items: center; gap: .35rem; color: var(--muted-foreground); font-size: .8125rem; }
  .svadmin-list-pagination__jumper input { width: 3.5rem; height: 2rem; padding: 0 .4rem; border: 1px solid var(--border); border-radius: 2px; background: var(--background); color: var(--foreground); font: inherit; font-size: .875rem; outline: none; }
  .svadmin-list-pagination__summary { margin: 0; font-size: .8125rem; color: var(--muted-foreground); }
</style>
