<script lang="ts">
  import { onMount, onDestroy, untrack, setContext, type Component, type Snippet } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import SvarGridCell from './SvarGridCell.svelte';
  import { SVAR_CELL_CONTEXT, type SvarCellContext, type SvarCellContent } from './svar-grid-cells.js';
  import { projectSvarRows, svarColumnId, svarSortMarks, svarFilterValues, type SvarSort, type SvarTextFilter } from './svar-grid-contract.js';
  import { checkedSvarInteractiveColumns, buildSvarInteractiveColumns, installSvarInteractions, type SvarInteractiveColumn, type SvarCellEdit } from './svar-grid-interactions.js';
  import { svarRecordKey, svarRecordIndex, type SvarRecordId } from './svar-grid-operations.js';
  import { createSvarPanePair, type SvarManagedApi, type SvarManagedEngineProps } from './svar-grid-panes.js';
  import { createSvarLoadCache, checkedSvarRange, snapshotSvarRecords, snapshotSvarWindow, mergeSvarBranches, projectSvarLazyRows, svarRowId, SvarLoadCancelled,
    type SvarRange, type SvarWindowPage, type SvarWindowSource, type SvarChildrenLoader } from './svar-grid-loading.js';

  export interface SvarDataGridProps {
    Grid: Component<SvarManagedEngineProps>;
    Theme: Component<{ fonts?: boolean; children?: Snippet }>;
    items?: readonly Record<string, unknown>[];
    columns: readonly SvarInteractiveColumn[];
    primaryKey?: string;
    childrenKey?: string;
    height?: number;
    density?: 'compact' | 'comfortable';
    freezeLeft?: number;
    /** 独立右侧面板，不使用上游 split.right。 */
    freezeRight?: number;
    queryMode?: 'local' | 'server';
    sorters?: readonly SvarSort[];
    filters?: readonly SvarTextFilter[];
    onSortChange?: (sorters: SvarSort[]) => void;
    onFilterChange?: (filters: SvarTextFilter[]) => void;
    onCellEdit?: (edit: SvarCellEdit) => Promise<void>;
    selectable?: boolean;
    selectedIds?: readonly SvarRecordId[];
    onSelectionChange?: (ids: SvarRecordId[]) => void;
    /** 仅可信宿主可注入的原生单元格内容。 */
    cellContent?: Snippet<[SvarCellContent]>;
    /** 已加载记录的独立快照，含已加载后代，不包含尚未请求的行。 */
    onRecordsChange?: (records: readonly Record<string, unknown>[]) => void;
    windowSource?: SvarWindowSource;
    loadChildren?: SvarChildrenLoader;
    hasChildrenKey?: string;
    onLoadMore?: (request: { signal: AbortSignal }) => Promise<void>;
    hasMore?: boolean;
    /** 查询、租户或会话切换必须改变此宿主版本；追加同一数据集则无需改变。 */
    scopeKey?: string | number;
    loading?: boolean;
    error?: string;
    disabled?: boolean;
    locale?: string;
    label?: string;
    emptyLabel?: string;
    loadingLabel?: string;
    disabledLabel?: string;
    fallbackLabel?: string;
  }
  let { Grid, Theme, items = [], columns, primaryKey = 'id', childrenKey, height = 420, density = 'comfortable', freezeLeft = 0, freezeRight = 0, queryMode = 'local',
    sorters = [], filters = [], onSortChange, onFilterChange, onCellEdit, selectable = false, selectedIds = [], onSelectionChange, onRecordsChange, cellContent,
    windowSource, loadChildren, hasChildrenKey = 'hasChildren', onLoadMore, hasMore = false, scopeKey = 0,
    loading = false, error, disabled = false, locale = 'en-US', label = 'Data grid', emptyLabel = 'No records', loadingLabel = 'Loading',
    disabledLabel = 'Grid is disabled', fallbackLabel = 'Static preview (up to 20 rows)',
  }: SvarDataGridProps = $props();
  const treeKey = $derived(loadChildren ? childrenKey ?? 'children' : childrenKey);
  const rowHeight = $derived(density === 'compact' ? 32 : 44);
  // 普通追加不重建引擎，否则无限加载会把滚动位置重置。懒树根替换必须清理分支缓存。
  const dataOwner = $derived({ scopeKey, items: loadChildren ? items : undefined, source: windowSource,
    loadChildren, onLoadMore, primaryKey, treeKey, hasChildrenKey, freezeRight, Grid });
  let resetOwner = untrack(() => dataOwner);
  let mounted = $state(false);
  let alive = true;
  let pending = $state(false);
  let editFailure = $state('');
  const branches = new SvelteMap<string, readonly Record<string, unknown>[]>();
  const branchPending = new SvelteMap<string, SvarRecordId>();
  const branchErrors = new SvelteMap<string, { id: SvarRecordId; message: string }>();
  const opened = new Set<string>();
  const childCache = createSvarLoadCache<readonly Record<string, unknown>[]>(value => snapshotSvarRecords(value, primaryKey, treeKey));
  const windowCache = createSvarLoadCache<SvarWindowPage>(value => ({ data: snapshotSvarRecords(value.data, primaryKey), total: value.total }), 3);
  let windowRows = $state.raw<readonly Record<string, unknown>[]>([]);
  let windowTotal = $state<number | undefined>();
  let windowLoading = $state(false);
  let windowError = $state('');
  let desiredWindow = '';
  let lastRange: SvarRange | undefined;
  let morePending = $state(false);
  let moreError = $state('');
  let moreController: AbortController | undefined;
  let pairOwner: object | undefined;
  let pair = createSvarPanePair(() => false);
  onMount(() => { mounted = true; });
  onDestroy(() => { alive = false; pair.dispose(); childCache.dispose(); windowCache.dispose(); moreController?.abort(); });
  $effect.pre(() => {
    const owner = dataOwner;
    if (owner === resetOwner) return;
    untrack(() => {
      resetOwner = owner; childCache.clear(); windowCache.clear(); branches.clear(); branchPending.clear(); branchErrors.clear(); opened.clear();
      windowRows = []; windowTotal = undefined; windowLoading = false; windowError = ''; desiredWindow = ''; lastRange = undefined;
      moreController?.abort(); moreController = undefined; morePending = false; moreError = ''; pending = false; editFailure = '';
    });
  });

  const model = $derived.by(() => {
    try {
      const checked = checkedSvarInteractiveColumns(columns);
      if (!Number.isFinite(height) || height < 160 || height > 4096 || !Number.isInteger(freezeLeft) || freezeLeft < 0
        || !Number.isInteger(freezeRight) || freezeRight < 0 || freezeLeft + freezeRight > checked.length || freezeRight >= checked.length) throw new Error('Invalid grid height or frozen-column count');
      if (queryMode === 'server' && ((checked.some(c => c.sortable) && !onSortChange) || (checked.some(c => c.filterable) && !onFilterChange))) throw new Error('Server grids require query callbacks');
      if (windowSource && (queryMode !== 'server' || treeKey !== undefined || onLoadMore)) throw new Error('Window loading requires a flat server grid');
      if (onLoadMore && queryMode !== 'server') throw new Error('Infinite loading requires server query mode');
      if (windowSource) checkedSvarRange({ row: { start: 0, end: 0 } }, windowSource.total);
      const engineColumns = buildSvarInteractiveColumns(checked, treeKey !== undefined, onCellEdit !== undefined, locale)
        .map(column => cellContent ? { ...column, cell: SvarGridCell } : column);
      const rightIds = new Set(engineColumns.slice(engineColumns.length - freezeRight).map(column => column.id));
      return { ok: true as const, columns: checked, engineColumns, rightIds,
        center: engineColumns.map(column => ({ ...column, hidden: freezeRight > 0 && rightIds.has(column.id) })),
        right: engineColumns.map(column => ({ ...column, hidden: !rightIds.has(column.id), width: column.width ?? 160, flexgrow: 0, resize: false })),
        rightWidth: engineColumns.slice(engineColumns.length - freezeRight).reduce((sum, column) => sum + (column.width ?? 160), 0) + 2 };
    } catch (failure) { return { ok: false as const, message: failure instanceof Error ? failure.message : 'Invalid grid configuration' }; }
  });
  const records = $derived.by(() => {
    if (!model.ok) return { ok: false as const, message: model.message };
    try {
      const value = windowSource ? windowRows : loadChildren && treeKey ? mergeSvarBranches(items, branches, primaryKey, treeKey) : items;
      const rows = loadChildren && treeKey ? projectSvarLazyRows(value, model.columns, primaryKey, treeKey, hasChildrenKey, branches, opened)
        : projectSvarRows(value, model.columns, primaryKey, treeKey);
      return { ok: true as const, value, rows };
    } catch (failure) { return { ok: false as const, message: failure instanceof Error ? failure.message : 'Invalid grid data' }; }
  });
  const cellRecords = $derived.by(() => cellContent && records.ok
    ? svarRecordIndex(snapshotSvarRecords(records.value, primaryKey, treeKey), primaryKey, treeKey) : new Map<string, Record<string, unknown>>());
  setContext<SvarCellContext>(SVAR_CELL_CONTEXT, {
    render: () => cellContent,
    resolve(row, column) {
      if (!model.ok || loading || error || windowLoading || windowError) return;
      const rowId: unknown = row && typeof row === 'object' ? Object.getOwnPropertyDescriptor(row, 'id')?.value : undefined;
      const columnId: unknown = column && typeof column === 'object' ? Object.getOwnPropertyDescriptor(column, 'id')?.value : undefined;
      const source = typeof rowId === 'string' ? cellRecords.get(rowId) : undefined;
      const field = model.columns.find(item => svarColumnId(item.key) === columnId);
      if (!source || !field) return;
      // 每个调用取得独立副本，snippet 不能修改 Provider 或其他单元格的记录。
      const record = snapshotSvarRecords([source], primaryKey, treeKey)[0];
      if (!record) return;
      return { id: svarRowId(record, primaryKey), field: field.key, value: record[field.key], record };
    },
  });
  const rightRows = $derived.by(() => {
    if (!records.ok || !model.ok || !freezeRight) return [];
    return loadChildren && treeKey ? projectSvarLazyRows(records.value, model.columns, primaryKey, treeKey, hasChildrenKey, branches, opened)
      : projectSvarRows(records.value, model.columns, primaryKey, treeKey);
  });
  const queryProps = $derived(queryMode === 'server' ? { sortMarks: svarSortMarks(sorters), filterValues: svarFilterValues(filters) } : {});
  const dynamicProps = $derived(windowSource ? { dynamic: { rowCount: windowTotal ?? windowSource.total } } : {});
  const selectedRows = $derived(selectedIds.map(svarRecordKey));
  const isLoading = $derived(loading || windowLoading);
  const activeError = $derived(error || windowError);
  $effect(() => {
    const callback = onRecordsChange, value = records;
    const unavailable = isLoading || activeError || !value.ok;
    untrack(() => {
      if (callback) callback(unavailable || !value.ok ? [] : snapshotSvarRecords(value.value, primaryKey, treeKey));
    });
  });

  function current(owner: typeof dataOwner): boolean { return alive && dataOwner === owner && !disabled && !loading && !error && model.ok && records.ok; }
  function requestWindow(event: unknown, force = false): void {
    const source = windowSource, owner = dataOwner;
    if (!source || !current(owner)) return;
    let range: SvarRange;
    try { range = checkedSvarRange(event, windowTotal ?? source.total); }
    catch { windowError = 'Invalid grid window'; return; }
    // 布局测量也会发出新窗口，不能因此自动重试失败或移除用户的重试按钮。
    if (windowError && !force) { lastRange = range; return; }
    const key = `${range.start}:${range.end}`;
    if (!force && desiredWindow === key) return;
    desiredWindow = key; lastRange = range;
    if (force) windowCache.invalidate(key);
    windowCache.abortPendingExcept(key); windowLoading = true; windowError = ''; windowRows = [];
    void windowCache.request(key, async signal => snapshotSvarWindow(await source.load({ ...range, signal }), range, primaryKey)).then(page => {
      if (!alive || dataOwner !== owner || desiredWindow !== key) return;
      if (!current(owner)) { windowLoading = false; desiredWindow = ''; return; }
      windowRows = page.data; windowTotal = page.total; windowLoading = false;
      if (range.start >= page.total && range.start > 0) void pair.get(0)?.exec('scroll-to', { top: 0 }).catch(() => {});
    }).catch((failure: unknown) => {
      if (!alive || dataOwner !== owner || desiredWindow !== key || failure instanceof SvarLoadCancelled) return;
      windowRows = []; windowLoading = false;
      if (!current(owner)) { desiredWindow = ''; return; }
      windowError = locale.startsWith('zh') ? '窗口加载失败，请重试' : 'Window load failed; retry';
    });
  }
  $effect(() => {
    const available = mounted && !disabled && !loading && !error;
    const source = windowSource;
    if (available && source) untrack(() => { if (!desiredWindow && lastRange) requestWindow({ row: lastRange }); });
  });
  function retryWindow(): void { if (lastRange) requestWindow({ row: lastRange }, true); }
  function openBranch(key: string, force = false): boolean {
    const loader = loadChildren, owner = dataOwner;
    if (!loader || !treeKey || !current(owner) || !records.ok) return false;
    const raw = svarRecordIndex(records.value, primaryKey, treeKey).get(key);
    if (!raw) return false;
    if (branches.has(key) && !force) return true;
    const native: unknown = Object.getOwnPropertyDescriptor(raw, treeKey)?.value;
    const marker: unknown = Object.getOwnPropertyDescriptor(raw, hasChildrenKey)?.value;
    if (!force && ((Array.isArray(native) && native.length > 0) || marker !== true)) return true;
    opened.add(key);
    if (branchPending.has(key)) return false;
    const id = svarRowId(raw, primaryKey);
    if (force) childCache.invalidate(key);
    branchPending.set(key, id); branchErrors.delete(key);
    void childCache.request(key, signal => loader({ id, signal })).then(children => {
      if (!alive || dataOwner !== owner) return;
      branchPending.delete(key);
      if (!current(owner) || !treeKey) return;
      const candidate = new Map(branches); candidate.set(key, children);
      mergeSvarBranches(items, candidate, primaryKey, treeKey); branches.set(key, children);
    }).catch((failure: unknown) => {
      if (!alive || dataOwner !== owner) return;
      branchPending.delete(key);
      if (!current(owner) || failure instanceof SvarLoadCancelled) return;
      branchErrors.set(key, { id, message: locale.startsWith('zh') ? '子节点加载失败' : 'Child loading failed' });
    });
    return false;
  }
  function loadMore(): void {
    const load = onLoadMore, owner = dataOwner;
    if (!load || !hasMore || morePending || !current(owner)) return;
    const controller = new AbortController(); moreController = controller; morePending = true; moreError = '';
    void Promise.resolve().then(() => {
      if (!current(owner) || controller.signal.aborted) throw new SvarLoadCancelled(); return load({ signal: controller.signal });
    }).catch((failure: unknown) => {
      if (current(owner) && !(failure instanceof SvarLoadCancelled)) moreError = locale.startsWith('zh') ? '追加加载失败，请重试' : 'Loading more rows failed; retry';
    }).finally(() => { if (alive && moreController === controller) { morePending = false; moreController = undefined; } });
  }
  function init(api: SvarManagedApi, side: 0 | 1): void {
    const owner = dataOwner;
    if (pairOwner !== owner) { pair.dispose(); pairOwner = owner; pair = createSvarPanePair(() => current(owner)); }
    pair.attach(side, api);
    const active = () => current(owner) && pair.get(side) === api && !windowLoading && !windowError;
    installSvarInteractions(api, {
      current: active, columns: () => model.ok ? model.columns : [], items: () => records.ok ? records.value : [],
      primaryKey: () => primaryKey, childrenKey: () => treeKey,
      server: () => queryMode === 'server', sorters: () => sorters, filters: () => filters,
      sort: next => onSortChange?.(next), filter: next => onFilterChange?.(next),
      editable: () => onCellEdit !== undefined && !pending, selectable: () => selectable && !pending,
      selection: next => onSelectionChange?.(next), error: message => { if (active()) editFailure = message; },
      edit(edit) {
        const write = onCellEdit;
        if (!write || pending || !active()) return;
        pending = true; editFailure = '';
        void Promise.resolve().then(() => { if (!active()) throw new Error('Scope changed'); return write(edit); }).then(() => {
          if (active() && windowSource && lastRange) requestWindow({ row: lastRange }, true);
        }).catch(() => { if (current(owner)) editFailure = locale.startsWith('zh') ? '保存失败，请刷新确认后重试' : 'Save failed; refresh before retrying';
        }).finally(() => { if (alive && dataOwner === owner) pending = false; });
      },
    });
    api.intercept('open-row', event => {
      if (!active()) return false;
      const key: unknown = event && typeof event === 'object' ? Object.getOwnPropertyDescriptor(event, 'id')?.value : undefined;
      if (typeof key !== 'string') return false;
      try { if (loadChildren && !openBranch(key)) return false; } catch { return false; }
    });
    api.on('open-row', event => {
      const key: unknown = event && typeof event === 'object' ? Object.getOwnPropertyDescriptor(event, 'id')?.value : undefined;
      if (active() && typeof key === 'string') opened.add(key);
    });
    api.on('close-row', event => {
      const key: unknown = event && typeof event === 'object' ? Object.getOwnPropertyDescriptor(event, 'id')?.value : undefined;
      if (active() && typeof key === 'string') opened.delete(key);
    });
    if (side === 0) {
      api.on('request-data', event => { if (pair.get(side) === api && current(owner)) requestWindow(event); });
      api.on('scroll-to', () => {
        if (!active() || !onLoadMore || !hasMore) return;
        const state = api.getState();
        if ((state.scrollTop ?? 0) + height * 2 >= (state.flatData?.length ?? 0) * rowHeight) loadMore();
      });
    }
  }
  function navigatePane(event: KeyboardEvent, side: 0 | 1): void {
    if (!freezeRight || !model.ok || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    const focus = pair.get(side)?.getState().focusCell;
    if (focus?.row === undefined || typeof focus.column !== 'string') return;
    const center = model.center.filter(column => !column.hidden), right = model.right.filter(column => !column.hidden);
    const target = side === 0 && event.key === 'ArrowRight' && center.at(-1)?.id === focus.column ? right[0]
      : side === 1 && event.key === 'ArrowLeft' && right[0]?.id === focus.column ? center.at(-1) : undefined;
    if (!target) return;
    event.preventDefault(); event.stopPropagation(); pair.focus(side === 0 ? 1 : 0, focus.row, target.id);
  }
</script>

<Theme fonts={false}>
  <div class="svadmin-svar-grid" data-svadmin-svar-grid data-density={density} role="group" aria-label={label} aria-busy={isLoading || pending || morePending} aria-disabled={disabled}>
    {#if !model.ok || !records.ok}<p role="alert">{!model.ok ? model.message : !records.ok ? records.message : ''}</p>
    {:else}
      {#if activeError}<p role="alert">{activeError}</p>
      {:else if isLoading}<p role="status">{loadingLabel}</p>
      {:else if disabled}<p role="status">{disabledLabel}</p>
      {:else if records.rows.length === 0 && (!windowSource || (windowTotal ?? windowSource.total) === 0)}<p role="status">{emptyLabel}</p>{/if}
      {#if windowError}<button type="button" disabled={disabled} onclick={retryWindow}>{locale.startsWith('zh') ? '重试窗口' : 'Retry window'}</button>{/if}
      {#if editFailure}<p role="alert">{editFailure}</p>{/if}
      {#if pending}<p role="status">{locale.startsWith('zh') ? '正在保存' : 'Saving'}</p>{/if}
      {#if branchPending.size}<p role="status">{locale.startsWith('zh') ? '正在加载子节点' : 'Loading children'}</p>{/if}
      {#each [...branchErrors] as [key, failure] (key)}<p role="alert">{failure.message}: {failure.id} <button type="button" disabled={disabled} onclick={() => openBranch(key, true)}>{locale.startsWith('zh') ? '重试' : 'Retry children'}</button></p>{/each}
      {#if mounted}
        {#key dataOwner}<div class="grid-panes" inert={disabled}>
          <div class="grid-viewport center-pane" data-svar-pane="center" style:height="{height}px" role="region" aria-label="Scrollable columns" onkeydowncapture={event => navigatePane(event, 0)}>
            <Grid columns={model.center} data={activeError || isLoading ? [] : records.rows} tree={treeKey !== undefined}
              split={{ left: freezeLeft }} sizes={{ rowHeight, headerHeight: 36, columnWidth: 160 }} select={selectable} multiselect={selectable} {selectedRows}
              reorder={false} draggableRows={false} undo={false} {...queryProps} {...dynamicProps} init={api => init(api, 0)} />
          </div>
          {#if freezeRight > 0}<div class="grid-viewport right-pane" data-svar-pane="right" style:height="{height}px" style:width="{model.rightWidth}px" role="region" aria-label="Frozen right columns" onkeydowncapture={event => navigatePane(event, 1)}>
            <Grid columns={model.right} data={activeError || isLoading ? [] : rightRows} tree={treeKey !== undefined}
              split={{ left: 0 }} sizes={{ rowHeight, headerHeight: 36, columnWidth: 160 }} select={selectable} multiselect={selectable} {selectedRows}
              reorder={false} draggableRows={false} undo={false} {...queryProps} {...dynamicProps} init={api => init(api, 1)} />
          </div>{/if}
        </div>{/key}
      {:else if !loading && !error}
        <div class="static-preview"><table><caption>{fallbackLabel}</caption>
          <thead><tr>{#each model.engineColumns as column, index (column.id)}<th scope="col">{model.columns[index]?.label}</th>{/each}</tr></thead>
          <tbody>{#each records.rows.slice(0, 20) as row (row.id)}<tr>{#each model.engineColumns as column (column.id)}<td>{row[column.id] ?? ''}</td>{/each}</tr>{/each}</tbody>
        </table></div>
      {/if}
      {#if moreError}<p role="alert">{moreError}</p>{/if}
      {#if onLoadMore && hasMore}<button type="button" disabled={disabled || isLoading || morePending} onclick={loadMore}>{morePending ? (locale.startsWith('zh') ? '正在加载' : 'Loading more') : (locale.startsWith('zh') ? '加载更多' : 'Load more')}</button>{/if}
    {/if}
  </div>
</Theme>

<style>
  .svadmin-svar-grid {
    min-width: 0; color: var(--foreground, CanvasText); background: var(--card, Canvas); font-family: var(--font-sans, system-ui);
    --wx-font-family: var(--font-sans, system-ui); --wx-font-size: 14px; --wx-font-size-md: 14px;
    --wx-color-font: var(--foreground, CanvasText); --wx-color-font-alt: var(--muted-foreground, GrayText);
    --wx-color-primary: var(--primary, Highlight); --wx-color-primary-font: var(--primary-foreground, HighlightText);
    --wx-background: var(--card, Canvas); --wx-background-alt: var(--muted, Canvas); --wx-background-hover: var(--accent, Canvas);
    --wx-border: 1px solid var(--border, GrayText); --wx-border-medium: 1px solid var(--border, GrayText); --wx-border-radius: var(--radius, 6px);
    --wx-table-border: 1px solid var(--border, GrayText); --wx-table-cell-border: var(--wx-table-border);
    --wx-table-header-border: var(--wx-table-border); --wx-table-header-cell-border: var(--wx-table-border);
    --wx-table-header-background: var(--muted, Canvas); --wx-table-select-background: var(--accent, Highlight);
    --wx-table-select-focus-background: var(--accent, Highlight); --wx-table-select-color: var(--accent-foreground, CanvasText);
    --wx-table-fixed-column-border: var(--wx-table-border); --wx-table-fixed-column-right-border: var(--wx-table-border);
    --wx-input-background: var(--background, Canvas); --wx-input-font-color: var(--foreground, CanvasText); --wx-input-border: var(--wx-border);
  }
  .grid-panes { display: flex; min-width: 0; width: 100%; }
  .grid-viewport { min-width: 0; }
  .center-pane { flex: 1; }
  .right-pane { flex: none; max-width: 55%; border-left: 1px solid var(--border, GrayText); box-shadow: -3px 0 6px rgb(0 0 0 / 8%); }
  .grid-panes[inert] { opacity: 0.6; }
  p { margin: 0; padding: 0.75rem; }
  button { font: inherit; color: inherit; background: var(--card, Canvas); border: var(--wx-border); border-radius: var(--radius, 6px); padding: 0.375rem 0.75rem; cursor: pointer; }
  button:disabled { cursor: not-allowed; opacity: 0.5; }
  button:focus-visible { outline: 2px solid var(--ring, Highlight); outline-offset: 2px; }
  [role='alert'] { color: var(--destructive, CanvasText); }
  .static-preview { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 0.5rem; text-align: start; border-bottom: var(--wx-border); }
  caption { text-align: start; color: var(--muted-foreground, GrayText); }
  .svadmin-svar-grid :global(.wx-table-tree-toggle), .svadmin-svar-grid :global(.wx-sort i) { font-family: system-ui; font-style: normal; }
  .svadmin-svar-grid :global(.wx-sort .wxi-arrow-up)::before { content: '↑'; }
  .svadmin-svar-grid :global(.wx-sort .wxi-arrow-down)::before { content: '↓'; }
  .svadmin-svar-grid :global(.wx-table-tree-toggle.wxi-menu-right)::before { content: '▸'; }
  .svadmin-svar-grid :global(.wx-table-tree-toggle.wxi-menu-down)::before { content: '▾'; }
</style>
