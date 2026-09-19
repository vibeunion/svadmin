<script lang="ts">
  import { onMount, onDestroy, type Component, type Snippet } from 'svelte';
  import { projectSvarRows, svarSortMarks, svarFilterValues, type SvarSort, type SvarTextFilter } from './svar-grid-contract.js';
  import {
    checkedSvarInteractiveColumns, buildSvarInteractiveColumns, installSvarInteractions,
    type SvarInteractiveApi, type SvarInteractiveEngineProps, type SvarInteractiveColumn, type SvarCellEdit,
  } from './svar-grid-interactions.js';
  import { svarRecordKey, type SvarRecordId } from './svar-grid-operations.js';

  export interface SvarDataGridProps {
    Grid: Component<SvarInteractiveEngineProps>;
    Theme: Component<{ fonts?: boolean; children?: Snippet }>;
    items: readonly Record<string, unknown>[];
    columns: readonly SvarInteractiveColumn[];
    primaryKey?: string;
    childrenKey?: string;
    height?: number;
    density?: 'compact' | 'comfortable';
    freezeLeft?: number;
    queryMode?: 'local' | 'server';
    sorters?: readonly SvarSort[];
    filters?: readonly SvarTextFilter[];
    onSortChange?: (sorters: SvarSort[]) => void;
    onFilterChange?: (filters: SvarTextFilter[]) => void;
    /** 仅可信宿主可提供写回调；引擎本身始终不提交数据。 */
    onCellEdit?: (edit: SvarCellEdit) => Promise<void>;
    selectable?: boolean;
    selectedIds?: readonly SvarRecordId[];
    onSelectionChange?: (ids: SvarRecordId[]) => void;
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
  let {
    Grid, Theme, items, columns, primaryKey = 'id', childrenKey,
    height = 420, density = 'comfortable', freezeLeft = 0, queryMode = 'local',
    sorters = [], filters = [], onSortChange, onFilterChange, onCellEdit,
    selectable = false, selectedIds = [], onSelectionChange, scopeKey = 0,
    loading = false, error, disabled = false, locale = 'en-US', label = 'Data grid',
    emptyLabel = 'No records', loadingLabel = 'Loading', disabledLabel = 'Grid is disabled', fallbackLabel = 'Static preview (up to 20 rows)',
  }: SvarDataGridProps = $props();
  let mounted = $state(false);
  let alive = true;
  let activeApi: SvarInteractiveApi | undefined;
  let pending = $state(false);
  let editFailure = $state('');
  onMount(() => { mounted = true; });
  onDestroy(() => { alive = false; activeApi = undefined; });

  const model = $derived.by(() => {
    try {
      const checked = checkedSvarInteractiveColumns(columns);
      if (!Number.isFinite(height) || height < 160 || height > 4096
        || !Number.isInteger(freezeLeft) || freezeLeft < 0 || freezeLeft > checked.length) throw new Error('Invalid grid height or frozen-column count');
      if (queryMode === 'server' && ((checked.some(c => c.sortable) && !onSortChange)
        || (checked.some(c => c.filterable) && !onFilterChange))) throw new Error('Server grids require query callbacks');
      return { ok: true as const, columns: checked,
        engineColumns: buildSvarInteractiveColumns(checked, childrenKey !== undefined, onCellEdit !== undefined, locale) };
    } catch (failure) {
      return { ok: false as const, message: failure instanceof Error ? failure.message : 'Invalid grid configuration' };
    }
  });
  const rows = $derived.by(() => {
    void scopeKey;
    if (!model.ok) return { ok: false as const, message: model.message };
    try { return { ok: true as const, value: projectSvarRows(items, model.columns, primaryKey, childrenKey) }; }
    catch (failure) { return { ok: false as const, message: failure instanceof Error ? failure.message : 'Invalid grid data' }; }
  });
  const queryProps = $derived(queryMode === 'server'
    ? { sortMarks: svarSortMarks(sorters), filterValues: svarFilterValues(filters) } : {});
  const selectedRows = $derived(selectedIds.map(svarRecordKey));
  $effect(() => { void scopeKey; editFailure = ''; pending = false; });

  function init(api: SvarInteractiveApi): void {
    activeApi = api;
    const scope = scopeKey;
    const current = () => alive && activeApi === api && scopeKey === scope && !disabled && !loading && !error && model.ok && rows.ok;
    installSvarInteractions(api, {
      current,
      columns: () => model.ok ? model.columns : [], items: () => items,
      primaryKey: () => primaryKey, childrenKey: () => childrenKey,
      server: () => queryMode === 'server', sorters: () => sorters, filters: () => filters,
      sort: next => onSortChange?.(next), filter: next => onFilterChange?.(next),
      editable: () => onCellEdit !== undefined && !pending,
      selectable: () => selectable && !pending,
      selection: next => onSelectionChange?.(next),
      error: message => { editFailure = message; },
      edit(edit) {
        const write = onCellEdit;
        if (!write || pending) return;
        pending = true;
        editFailure = '';
        // 宿主通过 mutation 返回结果；引擎的默认 update-cell 已被取消。
        void Promise.resolve().then(() => {
          if (!current()) throw new Error('Scope changed');
          return write(edit);
        }).catch(() => {
          if (current()) editFailure = locale.startsWith('zh') ? '保存失败，请刷新确认后重试' : 'Save failed; refresh before retrying';
        }).finally(() => { if (alive && activeApi === api && scopeKey === scope) pending = false; });
      },
    });
  }
</script>

<Theme fonts={false}>
  <div class="svadmin-svar-grid" data-svadmin-svar-grid data-density={density} role="region" aria-label={label} aria-busy={loading || pending} aria-disabled={disabled}>
    {#if !model.ok || !rows.ok}
      <p role="alert">{!model.ok ? model.message : !rows.ok ? rows.message : ''}</p>
    {:else}
      {#if error}<p role="alert">{error}</p>
      {:else if loading}<p role="status">{loadingLabel}</p>
      {:else if disabled}<p role="status">{disabledLabel}</p>
      {:else if rows.value.length === 0}<p role="status">{emptyLabel}</p>{/if}
      {#if editFailure}<p role="alert">{editFailure}</p>{/if}
      {#if pending}<p role="status">{locale.startsWith('zh') ? '正在保存' : 'Saving'}</p>{/if}
      {#if mounted}
        <div class="grid-viewport" style:height="{height}px" inert={disabled}>
          {#key scopeKey}
            <Grid
              columns={model.engineColumns} data={error || loading ? [] : rows.value}
              tree={childrenKey !== undefined} split={{ left: freezeLeft }}
              sizes={{ rowHeight: density === 'compact' ? 32 : 44, headerHeight: 36, columnWidth: 160 }}
              select={selectable} multiselect={selectable} {selectedRows}
              reorder={false} draggableRows={false} undo={false} {...queryProps} {init}
            />
          {/key}
        </div>
      {:else if !loading && !error}
        <div class="static-preview">
          <table>
            <caption>{fallbackLabel}</caption>
            <thead><tr>{#each model.engineColumns as column, index (column.id)}<th scope="col">{model.columns[index]?.label}</th>{/each}</tr></thead>
            <tbody>{#each rows.value.slice(0, 20) as row (row.id)}<tr>{#each model.engineColumns as column (column.id)}<td>{row[column.id] ?? ''}</td>{/each}</tr>{/each}</tbody>
          </table>
        </div>
      {/if}
    {/if}
  </div>
</Theme>

<style>
  .svadmin-svar-grid {
    min-width: 0; color: var(--foreground, CanvasText); background: var(--card, Canvas); font-family: var(--font-sans, system-ui);
    --wx-font-family: var(--font-sans, system-ui);
    --wx-font-size: 14px; --wx-font-size-md: 14px;
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
  .grid-viewport { min-width: 0; width: 100%; }
  .grid-viewport[inert] { opacity: 0.6; }
  p { margin: 0; padding: 0.75rem; }
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
