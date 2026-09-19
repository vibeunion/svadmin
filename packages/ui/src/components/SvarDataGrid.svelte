<script lang="ts">
  import { onMount, onDestroy, type Component, type Snippet } from 'svelte';
  import {
    checkedSvarColumns, buildSvarColumns, projectSvarRows, installSvarGuards,
    nextSvarSort, nextSvarFilter, svarSortMarks, svarFilterValues,
    type SvarColumn, type SvarSort, type SvarTextFilter,
    type SvarGridApi, type SvarGridEngineProps,
  } from './svar-grid-contract.js';

  export interface SvarDataGridProps {
    Grid: Component<SvarGridEngineProps>;
    Theme: Component<{ fonts?: boolean; children?: Snippet }>;
    items: readonly Record<string, unknown>[];
    columns: readonly SvarColumn[];
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
    /** 会话/租户/资源变更时重建引擎；绝不能使用凭据本身。 */
    scopeKey?: string | number;
    loading?: boolean;
    error?: string;
    disabled?: boolean;
    label?: string;
    emptyLabel?: string;
    loadingLabel?: string;
    disabledLabel?: string;
    fallbackLabel?: string;
  }
  let {
    Grid, Theme, items, columns, primaryKey = 'id', childrenKey,
    height = 420, density = 'comfortable', freezeLeft = 0, queryMode = 'local',
    sorters = [], filters = [], onSortChange, onFilterChange, scopeKey = 0,
    loading = false, error, disabled = false, label = 'Data grid',
    emptyLabel = 'No records', loadingLabel = 'Loading', disabledLabel = 'Grid is disabled', fallbackLabel = 'Static preview (up to 20 rows)',
  }: SvarDataGridProps = $props();

  let mounted = $state(false);
  let alive = true;
  let activeApi: SvarGridApi | undefined;
  onMount(() => { mounted = true; });
  onDestroy(() => { alive = false; activeApi = undefined; });

  const model = $derived.by(() => {
    try {
      const checked = checkedSvarColumns(columns);
      if (!Number.isFinite(height) || height < 160 || height > 4096
        || !Number.isInteger(freezeLeft) || freezeLeft < 0 || freezeLeft > checked.length) {
        throw new Error('Invalid grid height or frozen-column count');
      }
      if (queryMode === 'server' && ((checked.some(c => c.sortable) && !onSortChange)
        || (checked.some(c => c.filterable) && !onFilterChange))) {
        throw new Error('Server grids require query callbacks');
      }
      return { ok: true as const, columns: checked, engineColumns: buildSvarColumns(checked, childrenKey !== undefined) };
    } catch (failure) {
      return { ok: false as const, message: failure instanceof Error ? failure.message : 'Invalid grid configuration' };
    }
  });
  const rows = $derived.by(() => {
    // 引擎可能修改树展开信息；新作用域必须获得全新投影。
    void scopeKey;
    if (!model.ok) return { ok: false as const, message: model.message };
    try {
      return { ok: true as const, value: projectSvarRows(items, model.columns, primaryKey, childrenKey) };
    } catch (failure) {
      return { ok: false as const, message: failure instanceof Error ? failure.message : 'Invalid grid data' };
    }
  });
  const queryProps = $derived(queryMode === 'server'
    ? { sortMarks: svarSortMarks(sorters), filterValues: svarFilterValues(filters) }
    : {});

  function init(api: SvarGridApi): void {
    activeApi = api;
    const scope = scopeKey;
    installSvarGuards(api, {
      current: () => alive && activeApi === api && scopeKey === scope && !disabled && !loading && !error && model.ok && rows.ok,
      server: () => queryMode === 'server',
      sort(event) {
        if (!model.ok) return;
        const next = nextSvarSort(event, model.columns, sorters);
        if (next) onSortChange?.(next);
      },
      filter(event) {
        if (!model.ok) return;
        const next = nextSvarFilter(event, model.columns, filters);
        if (next) onFilterChange?.(next);
      },
    });
  }
</script>

<Theme fonts={false}>
  <div class="svadmin-svar-grid" data-svadmin-svar-grid data-density={density} role="region" aria-label={label} aria-busy={loading} aria-disabled={disabled}>
    {#if !model.ok || !rows.ok}
      <p role="alert">{!model.ok ? model.message : !rows.ok ? rows.message : ''}</p>
    {:else}
      {#if error}<p role="alert">{error}</p>
      {:else if loading}<p role="status">{loadingLabel}</p>
      {:else if disabled}<p role="status">{disabledLabel}</p>
      {:else if rows.value.length === 0}<p role="status">{emptyLabel}</p>{/if}
      {#if mounted}
        <div class="grid-viewport" style:height="{height}px" inert={disabled}>
          {#key scopeKey}
            <Grid
              columns={model.engineColumns}
              data={error || loading ? [] : rows.value}
              tree={childrenKey !== undefined}
              split={{ left: freezeLeft }}
              sizes={{ rowHeight: density === 'compact' ? 32 : 44, headerHeight: 36, columnWidth: 160 }}
              select={false} multiselect={false} reorder={false} draggableRows={false} undo={false}
              {...queryProps}
              {init}
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
  /* 变量放在上游 Theme 内部，跟随 svadmin 的亮/暗主题；不加载外部字体。 */
  .svadmin-svar-grid {
    min-width: 0;
    color: var(--foreground, CanvasText);
    background: var(--card, Canvas);
    font-family: var(--font-sans, system-ui);
    --wx-font-family: var(--font-sans, system-ui);
    --wx-font-size: 14px;
    --wx-font-size-md: 14px;
    --wx-color-font: var(--foreground, CanvasText);
    --wx-color-font-alt: var(--muted-foreground, GrayText);
    --wx-color-primary: var(--primary, Highlight);
    --wx-color-primary-font: var(--primary-foreground, HighlightText);
    --wx-background: var(--card, Canvas);
    --wx-background-alt: var(--muted, Canvas);
    --wx-background-hover: var(--accent, Canvas);
    --wx-border: 1px solid var(--border, GrayText);
    --wx-border-medium: 1px solid var(--border, GrayText);
    --wx-border-radius: var(--radius, 6px);
    --wx-table-border: 1px solid var(--border, GrayText);
    --wx-table-cell-border: var(--wx-table-border);
    --wx-table-header-border: var(--wx-table-border);
    --wx-table-header-cell-border: var(--wx-table-border);
    --wx-table-header-background: var(--muted, Canvas);
    --wx-table-select-background: var(--accent, Highlight);
    --wx-table-select-focus-background: var(--accent, Highlight);
    --wx-table-select-color: var(--accent-foreground, CanvasText);
    --wx-table-fixed-column-border: var(--wx-table-border);
    --wx-table-fixed-column-right-border: var(--wx-table-border);
    --wx-input-background: var(--background, Canvas);
    --wx-input-font-color: var(--foreground, CanvasText);
    --wx-input-border: var(--wx-border);
  }
  .grid-viewport { min-width: 0; width: 100%; }
  .grid-viewport[inert] { opacity: 0.6; }
  p { margin: 0; padding: 0.75rem; }
  [role='alert'] { color: var(--destructive, CanvasText); }
  .static-preview { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 0.5rem; text-align: start; border-bottom: var(--wx-border); }
  caption { text-align: start; color: var(--muted-foreground, GrayText); }
  .svadmin-svar-grid :global(.wx-table-tree-toggle),
  .svadmin-svar-grid :global(.wx-sort i) { font-family: system-ui; font-style: normal; }
  .svadmin-svar-grid :global(.wx-sort .wxi-arrow-up)::before { content: '↑'; }
  .svadmin-svar-grid :global(.wx-sort .wxi-arrow-down)::before { content: '↓'; }
  .svadmin-svar-grid :global(.wx-table-tree-toggle.wxi-menu-right)::before { content: '▸'; }
  .svadmin-svar-grid :global(.wx-table-tree-toggle.wxi-menu-down)::before { content: '▾'; }
</style>
