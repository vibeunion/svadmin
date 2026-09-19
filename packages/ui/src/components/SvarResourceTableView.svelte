<script lang="ts">
  import { untrack } from 'svelte';
  import {
    captureAdminContext, useResourceContract, useCan, useList, type Filter, type Sort,
  } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import SvarDataGrid from './SvarDataGrid.svelte';
  import type { SvarColumn, SvarSort, SvarTextFilter } from './svar-grid-contract.js';
  import type { SvarResourceTableProps } from './SvarResourceTable.svelte';

  let {
    Grid, Theme, resourceName, pageSize = 25, filters = [], initialSorters = [],
    height = 420, freezeLeft = 0, density = 'comfortable', childrenKey, dataScopeKey = 0,
  }: SvarResourceTableProps = $props();
  const context = captureAdminContext();
  const i18n = useTranslation();
  const binding = useResourceContract(() => resourceName);
  const resource = $derived(context.getResource(resourceName));
  const permission = useCan(() => ({
    resource: resourceName, action: 'list', meta: { svadminSvarScope: dataScopeKey },
  }));
  const columns = $derived<SvarColumn[]>(resource.fields.filter(field => field.showInList !== false).map(field => ({
    key: field.key, label: field.label,
    sortable: field.sortable === true,
    filterable: field.filterable === true && ['text', 'email', 'url', 'textarea'].includes(field.type),
  })));
  let current = $state(1);
  let sorters = $state<Sort[]>(untrack(() => initialSorters.map(sort => ({ ...sort }))));
  let textFilters = $state<SvarTextFilter[]>([]);
  const validPageSize = $derived(Number.isSafeInteger(pageSize) && pageSize >= 1 && pageSize <= 1000);
  const queryFilters = $derived<Filter[]>([...filters, ...textFilters]);
  const queryPagination = $derived({ current, pageSize });
  const query = useList({
    get resource() { return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
    // 非敏感宿主版本号也进入 core 查询键；仅重建 Grid 不能隔离已有查询缓存。
    get meta() { return { svadminSvarScope: dataScopeKey }; },
    get queryOptions() { return { enabled: permission.allowed && validPageSize }; },
    get pagination() { return queryPagination; },
    get sorters() { return sorters; },
    get filters() { return queryFilters; },
  });
  // 外部约束或每页数量变化必须回到第一页，但不能订阅 current 自身。
  $effect.pre(() => {
    void pageSize;
    void filters;
    untrack(() => { current = 1; });
  });
  const records = $derived(permission.allowed ? query.data?.data ?? [] : []);
  const total = $derived(permission.allowed ? query.data?.total ?? 0 : 0);
  const pageCount = $derived(validPageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1);
  const zh = $derived(i18n.locale.startsWith('zh'));
  const error = $derived(query.isError ? (query.error instanceof Error ? query.error.message : zh ? '数据加载失败' : 'Data request failed') : undefined);

  function changeSort(next: SvarSort[]): void {
    if (!permission.allowed) return;
    sorters = next;
    current = 1;
  }
  function changeFilter(next: SvarTextFilter[]): void {
    if (!permission.allowed) return;
    textFilters = next;
    current = 1;
  }
</script>

<section class="svar-resource-table" aria-label={resource.label}>
  <header>
    <h2>{resource.label}</h2>
    <button type="button" disabled={!permission.allowed || !validPageSize || query.isFetching} onclick={() => { void query.refetch(); }}>
      {zh ? '刷新' : 'Refresh'}
    </button>
  </header>
  {#if !validPageSize}
    <p role="alert">{zh ? '每页数量必须为 1–1000 的整数' : 'Page size must be an integer between 1 and 1000'}</p>
  {:else if permission.isLoading}
    <p role="status">{zh ? '正在检查权限' : 'Checking access'}</p>
  {:else if !permission.allowed}
    <p role="alert">{permission.reason ?? (zh ? '没有读取权限' : 'Read access denied')}</p>
  {:else}
    <SvarDataGrid
      {Grid} {Theme} items={records} {columns} primaryKey={resource.primaryKey ?? 'id'}
      {height} {freezeLeft} {density} queryMode="server" {sorters} filters={textFilters}
      onSortChange={changeSort} onFilterChange={changeFilter}
      loading={query.isLoading}
      {...error === undefined ? {} : { error }}
      {...childrenKey === undefined ? {} : { childrenKey }}
      label={resource.label}
      loadingLabel={zh ? '正在加载' : 'Loading'} emptyLabel={zh ? '暂无记录' : 'No records'}
      fallbackLabel={zh ? '静态预览（最多 20 行）' : 'Static preview (up to 20 rows)'}
    />
    <footer aria-label={zh ? '分页' : 'Pagination'}>
      <button type="button" disabled={current <= 1 || query.isFetching} onclick={() => { current -= 1; }}>{zh ? '上一页' : 'Previous'}</button>
      <span>{current} / {pageCount} · {total} {zh ? '条记录' : 'records'}</span>
      <button type="button" disabled={current >= pageCount || query.isFetching} onclick={() => { current += 1; }}>{zh ? '下一页' : 'Next'}</button>
    </footer>
  {/if}
</section>

<style>
  .svar-resource-table { min-width: 0; color: var(--foreground, CanvasText); }
  header, footer { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.75rem 0; }
  h2 { font-size: 1.125rem; margin: 0; }
  button { font: inherit; color: inherit; background: var(--card, Canvas); border: 1px solid var(--border, GrayText); border-radius: var(--radius, 6px); padding: 0.375rem 0.75rem; cursor: pointer; }
  button:focus-visible { outline: 2px solid var(--ring, Highlight); outline-offset: 2px; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  [role='alert'] { color: var(--destructive, CanvasText); }
</style>
