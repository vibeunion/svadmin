<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import {
    captureAdminContext, captureAuthSession, useResourceContract, useCan, useList,
    useUpdate, useDelete, getContractFormFields, type Filter, type Sort,
  } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { snapshotPlainData } from '@svadmin/core/schema';
  import SvarDataGrid from './SvarDataGrid.svelte';
  import { projectSvarRows, type SvarSort, type SvarTextFilter } from './svar-grid-contract.js';
  import type { SvarInteractiveColumn, SvarCellEdit } from './svar-grid-interactions.js';
  import { runSvarBatch, checkedSvarSelection, svarRecordIndex, svarRecordKey, svarCsv, downloadSvarCsv, type SvarRecordId, type SvarBatchResult } from './svar-grid-operations.js';
  import { readSavedListViews, serializeSavedListViews, savedListViewsStorageKey, type SavedListView, type SavedListViewState } from './saved-list-views.js';
  import type { SvarResourceTableProps } from './SvarResourceTable.svelte';

  let {
    Grid, Theme, resourceName, pageSize = 25, filters = [], initialSorters = [], height = 420,
    freezeLeft = 0, density = 'comfortable', childrenKey, dataScopeKey = 0, disabled = false,
    editable = false, selectable = false, batchUpdate = false, batchDelete = false, exportable = false,
    savedViews = false, preferenceScopeKey, migrateAutoTableViews = false, deleteVariables, formats = {},
  }: SvarResourceTableProps = $props();
  const context = captureAdminContext();
  const i18n = useTranslation();
  const zh = $derived(i18n.locale.startsWith('zh'));
  const binding = useResourceContract(() => resourceName);
  const resource = $derived(context.getResource(resourceName));
  const primaryKey = $derived(resource.primaryKey ?? 'id');
  const permission = useCan(() => ({ resource: resourceName, action: 'list', meta: { svadminSvarScope: dataScopeKey } }));
  const editPermission = useCan(() => ({ resource: resourceName, action: 'edit', meta: { svadminSvarScope: dataScopeKey }, queryOptions: { enabled: editable || batchUpdate } }));
  const deletePermission = useCan(() => ({ resource: resourceName, action: 'delete', meta: { svadminSvarScope: dataScopeKey }, queryOptions: { enabled: batchDelete } }));
  const exportPermission = useCan(() => ({ resource: resourceName, action: 'export', meta: { svadminSvarScope: dataScopeKey }, queryOptions: { enabled: exportable } }));
  const writableFields = $derived.by(() => {
    try { return new Set(getContractFormFields(binding.resource, 'edit')); }
    catch { return new Set<string>(); }
  });
  const fields = $derived(resource.fields.filter(field => field.showInList !== false));
  const editableFields = $derived(fields.filter(field => field.key !== primaryKey && field.key !== 'id'
    && field.showInEdit !== false && writableFields.has(field.key) && ['text', 'number', 'email', 'url', 'textarea'].includes(field.type)));
  let columnVisibility = $state<Record<string, boolean>>({});
  let columnOrder = $state<string[]>([]);
  const allColumns = $derived<SvarInteractiveColumn[]>(fields.map(field => {
    const format = formats[field.key];
    const canEdit = editable && resource.canEdit !== false && editPermission.allowed && editableFields.some(item => item.key === field.key);
    return {
      key: field.key, label: field.label, sortable: field.sortable === true,
      filterable: field.filterable === true && ['text', 'email', 'url', 'textarea'].includes(field.type),
      ...(canEdit ? { editable: field.type === 'number' ? 'number' as const : 'text' as const } : {}),
      ...(format === undefined ? {} : format),
    };
  }));
  const columns = $derived([...allColumns].sort((a, b) => {
    const ai = columnOrder.indexOf(a.key), bi = columnOrder.indexOf(b.key);
    return (ai < 0 ? allColumns.length : ai) - (bi < 0 ? allColumns.length : bi);
  }).filter(column => columnVisibility[column.key] !== false));

  let current = $state(1);
  let viewPageSize = $state<number | undefined>(undefined);
  const effectivePageSize = $derived(viewPageSize ?? pageSize);
  let sorters = $state<Sort[]>(untrack(() => initialSorters.map(sort => ({ ...sort }))));
  let textFilters = $state<SvarTextFilter[]>([]);
  let viewFilters = $state<Filter[]>([]);
  let viewSearch = $state('');
  const validPageSize = $derived(Number.isSafeInteger(effectivePageSize) && effectivePageSize >= 1 && effectivePageSize <= 1000);
  const queryFilters = $derived<Filter[]>([
    ...filters, ...viewFilters, ...textFilters,
    ...(viewSearch ? [{ operator: 'or' as const, value: resource.fields.filter(field => field.searchable).map(field => ({ field: field.key, operator: 'contains' as const, value: viewSearch })) }] : []),
  ]);
  const queryPagination = $derived({ current, pageSize: effectivePageSize });
  const query = useList({
    get resource() { return binding.resource; }, get dataProviderName() { return binding.dataProviderName; },
    get meta() { return { svadminSvarScope: dataScopeKey }; },
    get queryOptions() { return { enabled: permission.allowed && validPageSize && !disabled }; },
    get pagination() { return queryPagination; }, get sorters() { return sorters; }, get filters() { return queryFilters; },
  });
  $effect.pre(() => { void pageSize; void filters; untrack(() => { current = 1; viewPageSize = undefined; }); });
  const records = $derived(permission.allowed ? query.data?.data ?? [] : []);
  const total = $derived(permission.allowed ? query.data?.total ?? 0 : 0);
  const pageCount = $derived(validPageSize ? Math.max(1, Math.ceil(total / effectivePageSize)) : 1);
  const queryIdentity = $derived(JSON.stringify([resourceName, dataScopeKey, queryPagination, queryFilters, sorters]));
  const error = $derived(query.isError ? (query.error instanceof Error ? query.error.message : zh ? '数据加载失败' : 'Data request failed') : undefined);
  let selectedIds = $state<SvarRecordId[]>([]);
  let busy = $state(false);
  let feedback = $state('');
  let result = $state.raw<SvarBatchResult>();
  let confirmation = $state<'delete' | 'update' | undefined>();
  let batchField = $state('');
  let batchValue = $state('');
  let alive = true;
  let activeId = $state<SvarRecordId>(0);
  let authorizedWrite = $state(false);
  onDestroy(() => { alive = false; authorizedWrite = false; });
  const operationScope = $derived({
    resource: binding.resource, provider: context.getDataProviderForResource(resourceName),
    auth: captureAuthSession(context.authProvider), access: context.accessControlProvider,
    tenant: context.tenantCacheKey?.__svadminTenant, dataScopeKey, queryIdentity,
    permission: permission.allowed, disabled, editable, batchUpdate, batchDelete, exportable,
  });
  const update = useUpdate({ get resource() { return binding.resource; }, get id() { return activeId; }, get enabled() { return alive && authorizedWrite && permission.allowed && !disabled; } });
  const deletion = useDelete({ get resource() { return binding.resource; }, get id() { return activeId; }, get enabled() { return alive && authorizedWrite && permission.allowed && !disabled; } });
  $effect.pre(() => { void queryIdentity; untrack(() => { selectedIds = []; confirmation = undefined; }); });

  function selection(next: SvarRecordId[]): void {
    if (busy || disabled || !permission.allowed) return;
    try { selectedIds = checkedSvarSelection(next); feedback = ''; }
    catch { feedback = zh ? '最多选择 100 条记录' : 'Select at most 100 records'; }
  }
  function selectPage(): void {
    try {
      const index = svarRecordIndex(records, primaryKey, childrenKey);
      const ids: SvarRecordId[] = [];
      for (const record of index.values()) {
        const id: unknown = record[primaryKey];
        if (typeof id === 'string' || typeof id === 'number') ids.push(id);
      }
      selection(ids);
    } catch { feedback = zh ? '记录标识无效' : 'Invalid record IDs'; }
  }
  function changeSort(next: SvarSort[]): void { if (!busy && !disabled && permission.allowed) { sorters = next; current = 1; } }
  function changeFilter(next: SvarTextFilter[]): void { if (!busy && !disabled && permission.allowed) { textFilters = next; current = 1; } }

  async function allowed(action: 'edit' | 'delete' | 'export' | 'list', id: SvarRecordId | undefined, scope: typeof operationScope): Promise<boolean> {
    if (!alive || operationScope !== scope || !scope.auth.available || !scope.auth.isCurrent() || !permission.allowed || disabled) return false;
    const provider = scope.access;
    try {
      const decision: unknown = provider ? await provider.can({ resource: resourceName, action,
        ...(id === undefined ? {} : { params: { id } }), meta: { svadminSvarScope: scope.dataScopeKey },
      }) : { can: true };
      return alive && operationScope === scope && scope.auth.isCurrent() && decision !== null && typeof decision === 'object'
        && Object.getOwnPropertyDescriptor(decision, 'can')?.value === true;
    } catch { return false; }
  }
  async function execute(action: 'edit' | 'delete', ids: readonly SvarRecordId[], variables?: Record<string, unknown>): Promise<void> {
    if (busy || disabled || !permission.allowed) throw new Error('Unavailable');
    if (action === 'edit' && (!(editable || batchUpdate) || resource.canEdit === false)) throw new Error('Editing disabled');
    if (action === 'delete' && (!batchDelete || resource.canDelete === false)) throw new Error('Deletion disabled');
    const scope = operationScope;
    const input = variables === undefined ? undefined : snapshotPlainData(variables);
    if (input !== undefined && Object.keys(input).some(key => !editableFields.some(field => field.key === key))) throw new Error('Field is not writable');
    const idsCopy = checkedSvarSelection(ids);
    const index = svarRecordIndex(records, primaryKey, childrenKey);
    if (idsCopy.some(id => !index.has(svarRecordKey(id)))) throw new Error('Selection is no longer in the current page');
    const removeInput = snapshotPlainData(deleteVariables ?? {});
    const currentScope = () => alive && operationScope === scope && scope.auth.isCurrent() && !disabled && permission.allowed;
    busy = true; feedback = ''; result = undefined; confirmation = undefined;
    try {
      const outcome = await runSvarBatch({
        ids: idsCopy, current: currentScope, authorize: id => allowed(action, id, scope),
        async write(id) {
          if (!currentScope()) throw new Error('Scope changed');
          activeId = id; authorizedWrite = true;
          try {
            if (action === 'edit') return await update.mutation.mutateAsync({ variables: input ?? {}, dataProviderName: binding.dataProviderName, meta: { svadminSvarScope: dataScopeKey } });
            return await deletion.mutation.mutateAsync({ variables: removeInput, dataProviderName: binding.dataProviderName, meta: { svadminSvarScope: dataScopeKey } });
          } finally { authorizedWrite = false; }
        },
      });
      if (currentScope()) {
        result = outcome;
        const done = new Set(outcome.succeeded.map(svarRecordKey));
        selectedIds = selectedIds.filter(id => !done.has(svarRecordKey(id)));
      }
      if (outcome.failed.length || outcome.cancelled) throw new Error('Operation incomplete');
    } finally { if (alive) { busy = false; authorizedWrite = false; } }
  }
  async function editCell(edit: SvarCellEdit): Promise<void> { await execute('edit', [edit.id], { [edit.field]: edit.value }); }
  async function confirmBatch(): Promise<void> {
    const action = confirmation;
    if (!action) return;
    try {
      if (action === 'delete') await execute('delete', selectedIds);
      else {
        const field = editableFields.find(field => field.key === batchField);
        if (!field) throw new Error('Choose a writable field');
        const value = field.type === 'number' ? Number(batchValue) : batchValue;
        if (field.type === 'number' && (!batchValue.trim() || !Number.isFinite(value))) throw new Error('Invalid number');
        await execute('edit', selectedIds, { [field.key]: value });
      }
    } catch { if (alive) feedback = zh ? '操作未全部完成，请检查结果并刷新后再重试' : 'Operation incomplete; inspect the results and refresh before retrying'; }
  }
  async function exportPage(): Promise<void> {
    if (busy || !exportable || !exportPermission.allowed || disabled || query.isError) return;
    const scope = operationScope;
    const page = projectSvarRows(records, columns, primaryKey, childrenKey);
    const exportColumns = columns.map(column => ({ ...column }));
    busy = true; feedback = '';
    try {
      if (!await allowed('list', undefined, scope) || !await allowed('export', undefined, scope)) throw new Error('Access denied');
      for (const record of records) {
        const id: unknown = record[primaryKey];
        if ((typeof id !== 'string' && typeof id !== 'number') || !await allowed('export', id, scope)) throw new Error('Access denied');
      }
      if (alive && operationScope === scope && scope.auth.isCurrent()) downloadSvarCsv(svarCsv(page, exportColumns), resourceName);
    } catch { if (alive && operationScope === scope) feedback = zh ? '导出失败或没有导出权限' : 'Export failed or access denied'; }
    finally { if (alive) busy = false; }
  }

  let views = $state<SavedListView[]>([]);
  let viewName = $state('');
  let activeView = $state('');
  const allowedColumns = $derived(new Set(allColumns.map(column => column.key)));
  const preferencesKey = $derived(preferenceScopeKey ? `svadmin-svar-views-v1:${JSON.stringify([resourceName, binding.dataProviderName, context.tenantCacheKey?.__svadminTenant, preferenceScopeKey])}` : undefined);
  onMount(() => {
    if (!savedViews || !preferencesKey) return;
    try { views = readSavedListViews(localStorage.getItem(preferencesKey), allowedColumns); }
    catch { feedback = zh ? '无法读取保存视图' : 'Saved views unavailable'; }
  });
  function persist(): void {
    if (!preferencesKey) return;
    try { localStorage.setItem(preferencesKey, serializeSavedListViews(views)); }
    catch { feedback = zh ? '视图保存在本次会话中，浏览器存储不可用' : 'View is kept in memory; browser storage is unavailable'; }
  }
  function saveView(): void {
    if (!savedViews || !viewName.trim() || views.length >= 25 || busy) return;
    const state: SavedListViewState = { search: viewSearch, filters: [...viewFilters, ...textFilters], sorters: [...sorters],
      pagination: { current: 1, pageSize: effectivePageSize }, columnVisibility: { ...columnVisibility }, columnOrder: [...columnOrder] };
    const view = { id: crypto.randomUUID(), name: viewName.trim().slice(0, 60), state };
    views = [...views, view]; activeView = view.id; viewName = ''; persist();
  }
  function applyView(id: string): void {
    if (busy) return;
    const view = views.find(view => view.id === id);
    activeView = id; current = 1; textFilters = []; selectedIds = [];
    if (!view) { viewFilters = []; viewSearch = ''; sorters = [...initialSorters]; columnVisibility = {}; columnOrder = []; viewPageSize = undefined; return; }
    if (view.state.sorters.some(sort => !allColumns.some(column => column.key === sort.field && column.sortable))) { feedback = zh ? '视图包含不可排序的列' : 'View contains a non-sortable column'; return; }
    viewFilters = [...view.state.filters]; viewSearch = view.state.search;
    sorters = [...view.state.sorters]; columnVisibility = { ...view.state.columnVisibility };
    columnOrder = [...view.state.columnOrder]; viewPageSize = view.state.pagination.pageSize;
  }
  function importViews(): void {
    if (!migrateAutoTableViews || busy) return;
    try {
      const matcher = context.queryKeyMatcher(resourceName);
      const oldKey = savedListViewsStorageKey({ resourceName, providerName: binding.dataProviderName, ...(matcher.tenant === undefined ? {} : { tenantIdentity: matcher.tenant }) });
      const incoming = readSavedListViews(localStorage.getItem(oldKey), allowedColumns);
      const existing = new Set(views.map(view => view.id));
      views = [...views, ...incoming.filter(view => !existing.has(view.id))].slice(0, 25); persist();
    } catch { feedback = zh ? '无法导入视图' : 'Unable to import views'; }
  }
</script>

<section class="svar-resource-table" aria-label={resource.label}>
  <header>
    <h2>{resource.label}</h2>
    <button type="button" disabled={!permission.allowed || !validPageSize || query.isFetching || busy || disabled} onclick={() => { void query.refetch(); }}>{zh ? '刷新' : 'Refresh'}</button>
    {#if exportable}<button type="button" disabled={!permission.allowed || !exportPermission.allowed || busy || disabled || query.isLoading || query.isError} onclick={exportPage}>{zh ? '导出当前页 CSV' : 'Export page CSV'}</button>{/if}
  </header>
  {#if !validPageSize}<p role="alert">{zh ? '每页数量必须为 1–1000 的整数' : 'Page size must be an integer between 1 and 1000'}</p>
  {:else if permission.isLoading}<p role="status">{zh ? '正在检查权限' : 'Checking access'}</p>
  {:else if !permission.allowed}<p role="alert">{permission.reason ?? (zh ? '没有读取权限' : 'Read access denied')}</p>
  {:else}
    {#if savedViews}
      <div class="toolbar" aria-label={zh ? '保存视图' : 'Saved views'}>
        <select aria-label={zh ? '当前视图' : 'Current view'} value={activeView} disabled={busy || disabled} onchange={event => applyView(event.currentTarget.value)}>
          <option value="">{zh ? '默认视图' : 'Default view'}</option>
          {#each views as view (view.id)}<option value={view.id}>{view.name}</option>{/each}
        </select>
        <input aria-label={zh ? '视图名称' : 'View name'} bind:value={viewName} maxlength={60} disabled={busy || disabled} />
        <button type="button" disabled={!viewName.trim() || busy || disabled || views.length >= 25} onclick={saveView}>{zh ? '保存视图' : 'Save view'}</button>
        <button type="button" disabled={!activeView || busy || disabled} onclick={() => { views = views.filter(view => view.id !== activeView); activeView = ''; persist(); }}>{zh ? '删除视图' : 'Delete view'}</button>
        {#if migrateAutoTableViews}<button type="button" disabled={busy || disabled} onclick={importViews}>{zh ? '导入 AutoTable 视图' : 'Import AutoTable views'}</button>{/if}
        <details><summary>{zh ? '列设置' : 'Columns'}</summary>
          {#each allColumns as column (column.key)}<label><input type="checkbox" checked={columnVisibility[column.key] !== false} disabled={busy || disabled || (columns.length === 1 && columnVisibility[column.key] !== false)} onchange={event => { columnVisibility = { ...columnVisibility, [column.key]: event.currentTarget.checked }; }} />{column.label}</label>{/each}
        </details>
      </div>
    {/if}
    {#if selectable || batchUpdate || batchDelete}
      <div class="toolbar" aria-label={zh ? '批量操作' : 'Batch actions'}>
        <button type="button" disabled={busy || disabled || query.isLoading || records.length === 0} onclick={selectPage}>{zh ? '选择当前页' : 'Select page'}</button>
        <button type="button" disabled={busy || disabled || selectedIds.length === 0} onclick={() => { selectedIds = []; }}>{zh ? '清除选择' : 'Clear selection'}</button>
        <span role="status">{zh ? '已选' : 'Selected'}: {selectedIds.length}</span>
        {#if batchUpdate}<button type="button" disabled={!selectedIds.length || busy || disabled || !editPermission.allowed || resource.canEdit === false} onclick={() => { confirmation = 'update'; }}>{zh ? '批量修改' : 'Update selected'}</button>{/if}
        {#if batchDelete}<button type="button" disabled={!selectedIds.length || busy || disabled || !deletePermission.allowed || resource.canDelete === false} onclick={() => { confirmation = 'delete'; }}>{zh ? '删除所选' : 'Delete selected'}</button>{/if}
      </div>
    {/if}
    {#if confirmation}
      <div class="confirmation" role="group" aria-label={zh ? '确认批量操作' : 'Confirm batch action'}>
        <p>{zh ? `确认对所选 ${selectedIds.length} 条记录执行操作？` : `Confirm operation on ${selectedIds.length} selected records?`}</p>
        {#if confirmation === 'update'}
          <select aria-label={zh ? '修改字段' : 'Update field'} bind:value={batchField}><option value="">{zh ? '选择字段' : 'Choose field'}</option>{#each editableFields as field (field.key)}<option value={field.key}>{field.label}</option>{/each}</select>
          <input aria-label={zh ? '新值' : 'New value'} bind:value={batchValue} />
        {/if}
        <button type="button" disabled={busy || disabled || (confirmation === 'update' && !batchField)} onclick={confirmBatch}>{zh ? '确认执行' : 'Confirm action'}</button>
        <button type="button" onclick={() => { confirmation = undefined; }}>{zh ? '取消' : 'Cancel'}</button>
      </div>
    {/if}
    {#if feedback}<p role="alert">{feedback}</p>{/if}
    {#if result}<p role="status">{zh ? '成功 / 失败 / 未执行' : 'Succeeded / failed / skipped'}: {result.succeeded.length} / {result.failed.length} / {result.skipped.length}</p>{/if}
    <SvarDataGrid
      {Grid} {Theme} items={records} {columns} {primaryKey} {height} freezeLeft={Math.min(freezeLeft, columns.length)} {density}
      queryMode="server" {sorters} filters={textFilters} onSortChange={changeSort} onFilterChange={changeFilter}
      selectable={selectable || batchUpdate || batchDelete} {selectedIds} onSelectionChange={selection}
      {...editable ? { onCellEdit: editCell } : {}} disabled={disabled || busy} locale={i18n.locale}
      loading={query.isLoading} {...error === undefined ? {} : { error }} {...childrenKey === undefined ? {} : { childrenKey }}
      label={resource.label} loadingLabel={zh ? '正在加载' : 'Loading'} emptyLabel={zh ? '暂无记录' : 'No records'}
      disabledLabel={zh ? '暂时不可操作' : 'Grid is disabled'} fallbackLabel={zh ? '静态预览（最多 20 行）' : 'Static preview (up to 20 rows)'}
    />
    <footer aria-label={zh ? '分页' : 'Pagination'}>
      <button type="button" disabled={current <= 1 || query.isFetching || busy || disabled} onclick={() => { current -= 1; }}>{zh ? '上一页' : 'Previous'}</button>
      <span>{current} / {pageCount} · {total} {zh ? '条记录' : 'records'}</span>
      <button type="button" disabled={current >= pageCount || query.isFetching || busy || disabled} onclick={() => { current += 1; }}>{zh ? '下一页' : 'Next'}</button>
    </footer>
  {/if}
</section>

<style>
  .svar-resource-table { min-width: 0; color: var(--foreground, CanvasText); }
  header, footer, .toolbar, .confirmation { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; padding: 0.75rem 0; }
  header, footer { justify-content: space-between; }
  h2 { font-size: 1.125rem; margin: 0; }
  button, input, select { max-width: 100%; font: inherit; color: inherit; background: var(--card, Canvas); border: 1px solid var(--border, GrayText); border-radius: var(--radius, 6px); padding: 0.375rem 0.75rem; }
  button { cursor: pointer; } button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--ring, Highlight); outline-offset: 2px; }
  button:disabled, input:disabled, select:disabled { opacity: 0.5; cursor: not-allowed; }
  .confirmation { border-block: 1px solid var(--border, GrayText); } .confirmation p { width: 100%; margin: 0; }
  details label { display: block; } [role='alert'] { color: var(--destructive, CanvasText); }
</style>
