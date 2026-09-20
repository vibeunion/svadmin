<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onDestroy, tick, untrack } from 'svelte';
  import { snapshotPlainData } from '@svadmin/core/schema';
  import { useTranslation } from '@svadmin/core/i18n';
  import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronDown, Folder, File, RotateCw } from '@lucide/svelte';
  import {
    filterTreeTableData, indexTreeTable, sortTreeTableData, treeTableSelection,
    type TreeTableId, type TreeTableNode, type TreeTableSort,
  } from '../tree-table-model.js';
  import { Button } from './ui/button/index.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import { Input } from './ui/input/index.js';
  import { cn } from '../utils.js';

  export interface TreeTableColumn {
    key: string;
    label: string;
    width?: string;
    sortable?: boolean;
  }

  interface Props {
    data: Record<string, unknown>[];
    columns: TreeTableColumn[];
    primaryKey?: string;
    childrenKey?: string;
    selectable?: boolean;
    selectedKeys?: (string | number)[];
    onselect?: (selectedKeys: (string | number)[]) => void;
    rowActions?: Snippet<[{ record: Record<string, unknown>; id: string | number }]>;
    customCell?: Snippet<[{ column: TreeTableColumn; record: Record<string, unknown>; value: unknown }]>;
    scopeKey?: string | number;
    ariaLabel?: string;
    loading?: boolean;
    disabled?: boolean;
    error?: string;
    onRetry?: () => void;
    filterText?: string;
    filterable?: boolean;
    filterPlaceholder?: string;
    filterKeys?: string[];
    sort?: TreeTableSort | undefined;
    onsortchange?: (sort: TreeTableSort | undefined) => void;
    page?: number;
    pageSize?: number;
    onpagechange?: (page: number) => void;
    loadChildren?: (record: Record<string, unknown>, id: TreeTableId) => Promise<Record<string, unknown>[]>;
    canLoadChildren?: (record: Record<string, unknown>) => boolean;
    virtualized?: boolean;
    height?: number;
    rowHeight?: number;
    overscan?: number;
    class?: string;
  }

  let {
    data = [],
    columns = [],
    primaryKey = 'id',
    childrenKey = 'children',
    selectable = false,
    selectedKeys = $bindable([]),
    onselect,
    rowActions,
    customCell,
    scopeKey,
    ariaLabel,
    loading = false,
    disabled = false,
    error,
    onRetry,
    filterText = $bindable(''),
    filterable = false,
    filterPlaceholder,
    filterKeys,
    sort = $bindable(),
    onsortchange,
    page = $bindable(1),
    pageSize = 0,
    onpagechange,
    loadChildren,
    canLoadChildren,
    virtualized = false,
    height = 360,
    rowHeight = 40,
    overscan = 4,
    class: className = '',
  }: Props = $props();

  let expandedKeys = $state<Set<string | number>>(new Set());
  let loadedChildren = $state<Map<TreeTableId, Record<string, unknown>[]>>(new Map());
  let childLoadingKeys = $state<Set<TreeTableId>>(new Set());
  let childErrors = $state<Map<TreeTableId, string>>(new Map());
  let tableRoot: HTMLTableElement | undefined = $state();
  let focusedKey = $state<TreeTableId>();
  let scrollTop = $state(0);
  let viewport: HTMLDivElement | undefined = $state();
  let observedScope = untrack(() => scopeKey);
  let observedPage = untrack(() => page);
  let generation = 0;
  let mounted = true;
  const captureLoadScope = () => ({ data, scopeKey, loadChildren, canLoadChildren, primaryKey, childrenKey, disabled, loading, error });
  let loadScope = $state.raw(untrack(captureLoadScope));
  function sameLoadScope(scope: ReturnType<typeof captureLoadScope>): boolean {
    return scope.data === data && scope.scopeKey === scopeKey && scope.loadChildren === loadChildren
      && scope.canLoadChildren === canLoadChildren && scope.primaryKey === primaryKey
      && scope.childrenKey === childrenKey && scope.disabled === disabled
      && scope.loading === loading && scope.error === error;
  }
  onDestroy(() => { mounted = false; generation++; });
  const i18n = useTranslation();
  const baseIndex = $derived(indexTreeTable(data, primaryKey, childrenKey));
  const fullIndex = $derived(baseIndex.valid
    ? indexTreeTable(data, primaryKey, childrenKey, sameLoadScope(loadScope) ? loadedChildren : undefined)
    : baseIndex);
  const mergedData = $derived.by(() => {
    if (!fullIndex.valid) return [];
    // 完整索引先校验循环和数量；逆序重建后再进行筛选、排序和分页。
    const records = new Map<TreeTableId, Record<string, unknown>>();
    const roots: Record<string, unknown>[] = [];
    for (const node of [...fullIndex.nodes.values()].reverse()) {
      const children = node.children.map(id => records.get(id)).filter(
        (record): record is Record<string, unknown> => record !== undefined,
      );
      records.set(node.id, { ...node.record, [childrenKey]: children });
    }
    for (const node of fullIndex.nodes.values()) {
      const record = records.get(node.id);
      if (node.parent === undefined && record) roots.push(record);
    }
    return roots;
  });
  const filteredData = $derived(filterTreeTableData(
    mergedData, filterText, filterKeys ?? columns.map(column => column.key), childrenKey,
  ));
  const sortedData = $derived(sortTreeTableData(filteredData, sort, childrenKey));
  const normalizedPageSize = $derived(
    Number.isSafeInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 1000) : 0,
  );
  const pageCount = $derived(normalizedPageSize > 0 ? Math.max(1, Math.ceil(sortedData.length / normalizedPageSize)) : 1);
  const normalizedPage = $derived(Math.min(pageCount, Number.isSafeInteger(page) && page > 0 ? page : 1));
  const pagedData = $derived(normalizedPageSize > 0
    ? sortedData.slice((normalizedPage - 1) * normalizedPageSize, normalizedPage * normalizedPageSize)
    : sortedData);
  const index = $derived(indexTreeTable(pagedData, primaryKey, childrenKey));
  const columnsValid = $derived.by(() => {
    const ordering = sort;
    return columns.length > 0
      && columns.every(column => typeof column.key === 'string' && column.key.length > 0)
      && new Set(columns.map(column => column.key)).size === columns.length
      && (!ordering || (columns.some(column => column.key === ordering.key) && ['asc', 'desc'].includes(ordering.direction)));
  });
  const displayError = $derived(error || (!fullIndex.valid || !index.valid || !columnsValid ? i18n.t('treeTable.invalidData') : ''));
  const available = $derived(!loading && !displayError);
  const selection = $derived(treeTableSelection(fullIndex.nodes, new Set(selectedKeys)));
  function isExpanded(id: TreeTableId): boolean {
    return expandedKeys.has(id) || filterText.trim().length > 0;
  }
  function needsChildren(id: TreeTableId): boolean {
    const node = fullIndex.nodes.get(id);
    return !!node && !!loadChildren && !loadedChildren.has(id)
      && (canLoadChildren?.(node.record) ?? !Array.isArray(node.record[childrenKey]));
  }
  const flattenedRows = $derived.by(() => {
    if (!available) return [];
    const visible = new Set<TreeTableId>();
    const rows: (TreeTableNode & { hasChildren: boolean; isExpanded: boolean })[] = [];
    for (const node of index.nodes.values()) {
      if (node.parent !== undefined && (!visible.has(node.parent) || !isExpanded(node.parent))) continue;
      visible.add(node.id);
      const canLoad = needsChildren(node.id);
      rows.push({
        ...node,
        hasChildren: node.children.length > 0 || canLoad,
        isExpanded: isExpanded(node.id),
      });
    }
    return rows;
  });
  const normalizedRowHeight = $derived(Number.isFinite(rowHeight) && rowHeight >= 24
    ? Math.min(Math.floor(rowHeight), 500) : 40);
  const normalizedHeight = $derived(Number.isFinite(height) && height >= normalizedRowHeight * 2
    ? Math.min(Math.floor(height), 4000) : Math.max(360, normalizedRowHeight * 2));
  const normalizedOverscan = $derived(Number.isSafeInteger(overscan) && overscan >= 0
    ? Math.min(overscan, 100) : 4);
  const maxScroll = $derived(Math.max(0, (flattenedRows.length + 1) * normalizedRowHeight - normalizedHeight));
  const boundedScrollTop = $derived(Math.max(0, Math.min(Number.isFinite(scrollTop) ? scrollTop : 0, maxScroll)));
  const windowStart = $derived(virtualized
    ? Math.max(0, Math.floor(boundedScrollTop / normalizedRowHeight) - normalizedOverscan) : 0);
  const windowEnd = $derived(virtualized
    ? Math.min(flattenedRows.length, Math.ceil((boundedScrollTop + normalizedHeight) / normalizedRowHeight) + normalizedOverscan)
    : flattenedRows.length);
  const renderedRows = $derived(flattenedRows.slice(windowStart, windowEnd));
  const focusTarget = $derived(renderedRows.some(row => row.id === focusedKey) ? focusedKey : renderedRows[0]?.id);
  const cellCount = $derived(columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0));

  function nodeKey(id: TreeTableId): string {
    return `${typeof id}:${String(id)}`;
  }

  async function focusRow(id: TreeTableId | undefined): Promise<void> {
    if (id === undefined) return;
    const epoch = generation;
    const position = flattenedRows.findIndex(item => item.id === id);
    if (position < 0) return;
    if (virtualized) {
      const top = position * normalizedRowHeight;
      const bottom = top + normalizedRowHeight;
      if (top < boundedScrollTop) scrollTop = top;
      else if (bottom > boundedScrollTop + normalizedHeight - normalizedRowHeight) {
        scrollTop = Math.min(maxScroll, bottom - normalizedHeight + normalizedRowHeight);
      }
      await tick();
    }
    if (!mounted || epoch !== generation || !available) return;
    tableRoot?.querySelector<HTMLElement>(`[data-tree-key="${CSS.escape(nodeKey(id))}"]`)?.focus();
  }

  function handleKeydown(event: KeyboardEvent, row: TreeTableNode): void {
    if (disabled || event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    const position = flattenedRows.findIndex(item => item.id === row.id);
    switch (event.key) {
      case 'ArrowDown': focusRow(flattenedRows[position + 1]?.id); break;
      case 'ArrowUp': focusRow(flattenedRows[position - 1]?.id); break;
      case 'Home': focusRow(flattenedRows[0]?.id); break;
      case 'End': focusRow(flattenedRows.at(-1)?.id); break;
      case 'ArrowRight':
        if ((!isExpanded(row.id) && row.children.length) || needsChildren(row.id)) toggleExpand(row.id);
        else focusRow(row.children[0]);
        break;
      case 'ArrowLeft':
        if (expandedKeys.has(row.id)) toggleExpand(row.id);
        else focusRow(row.parent);
        break;
      case ' ':
      case 'Enter':
        if (selectable) toggleSelect(row.id);
        else return;
        break;
      default: return;
    }
    event.preventDefault();
  }

  async function loadNodeChildren(row: TreeTableNode): Promise<void> {
    const loader = loadChildren;
    if (!loader || !available || disabled || childLoadingKeys.has(row.id) || !needsChildren(row.id)) return;
    const scope = captureLoadScope();
    const epoch = generation;
    const current = () => mounted && generation === epoch && sameLoadScope(scope);
    childLoadingKeys = new Set([...childLoadingKeys, row.id]);
    const errors = new Map(childErrors);
    errors.delete(row.id);
    childErrors = errors;
    try {
      const rawChildren: unknown = snapshotPlainData(await loader(row.record, row.id));
      if (!current()) return;
      if (!Array.isArray(rawChildren) || !rawChildren.every((child): child is Record<string, unknown> =>
        typeof child === 'object' && child !== null && !Array.isArray(child))) {
        throw new Error('Invalid children');
      }
      const children: Record<string, unknown>[] = rawChildren;
      const candidate = new Map(loadedChildren);
      candidate.set(row.id, children);
      if (!indexTreeTable(data, primaryKey, childrenKey, candidate).valid) throw new Error('Invalid children');
      loadedChildren = candidate;
    } catch {
      if (current()) childErrors = new Map([...childErrors, [row.id, i18n.t('treeTable.loadFailed')]]);
    } finally {
      if (current()) {
        const next = new Set(childLoadingKeys);
        next.delete(row.id);
        childLoadingKeys = next;
      }
    }
  }

  function toggleExpand(id: string | number) {
    if (!available || disabled || filterText.trim().length > 0) return;
    const row = fullIndex.nodes.get(id);
    const next = new Set(expandedKeys);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    expandedKeys = next;
    if (row && next.has(id)) void loadNodeChildren(row);
  }

  function cycleSort(column: TreeTableColumn): void {
    if (!available || disabled || !column.sortable) return;
    if (!sort || sort.key !== column.key) {
      sort = { key: column.key, direction: 'asc' };
    } else if (sort.direction === 'asc') {
      sort = { key: column.key, direction: 'desc' };
    } else {
      sort = undefined;
    }
    onsortchange?.(sort);
  }

  function expandAll() {
    if (!available || disabled || filterText.trim().length > 0) return;
    expandedKeys = new Set([...index.nodes.values()].filter(node => node.children.length).map(node => node.id));
  }

  function collapseAll() {
    if (!available || disabled || filterText.trim().length > 0) return;
    expandedKeys = new Set();
  }

  function toggleSelect(id: TreeTableId) {
    if (!available || disabled || !selectable || fullIndex.nodes.get(id)?.disabled) return;
    const ids = new Set<TreeTableId>();
    const stack = [id];
    while (stack.length) {
      const key = stack.pop();
      const node = key === undefined ? undefined : fullIndex.nodes.get(key);
      if (!node) continue;
      if (!node.disabled) ids.add(node.id);
      for (let child = node.children.length - 1; child >= 0; child -= 1) {
        const next = node.children[child];
        if (next !== undefined) stack.push(next);
      }
    }
    const count = selection.get(id);
    const isSelected = count !== undefined && count.selected === count.total;
    const next = isSelected ? selectedKeys.filter(key => !ids.has(key)) : [...new Set([...selectedKeys, ...ids])];
    selectedKeys = next;
    onselect?.(next);
  }

  $effect.pre(() => {
    if (!sameLoadScope(loadScope)) {
      generation++;
      loadScope = captureLoadScope();
      loadedChildren = new Map();
      childErrors = new Map();
      childLoadingKeys = new Set();
    }
  });

  $effect.pre(() => {
    const changedScope = scopeKey !== observedScope;
    const changedPage = page !== observedPage;
    observedScope = scopeKey;
    observedPage = page;
    const nodes = fullIndex.nodes;
    untrack(() => {
      if (changedScope) focusedKey = undefined;
      if (changedScope || changedPage) scrollTop = 0;
      expandedKeys = new Set(changedScope ? [] : [...expandedKeys].filter(key => nodes.has(key)));
      const next = changedScope ? [] : [...new Set(selectedKeys)].filter(key => nodes.get(key)?.disabled === false);
      if (next.length !== selectedKeys.length || next.some((key, i) => key !== selectedKeys[i])) {
        selectedKeys = next;
        onselect?.([...next]);
      }
    });
  });

  function setPage(next: number): void {
    page = next;
    scrollTop = 0;
    onpagechange?.(next);
  }
  let queryKey = untrack(() => JSON.stringify([filterText, filterKeys, sort, pageSize, scopeKey]));
  $effect.pre(() => {
    const next = JSON.stringify([filterText, filterKeys, sort, pageSize, scopeKey]);
    if (next !== queryKey) {
      queryKey = next;
      scrollTop = 0;
      untrack(() => { if (page !== 1) setPage(1); });
    }
  });
  $effect(() => {
    if (normalizedPageSize > 0 && page !== normalizedPage) setPage(normalizedPage);
  });
  $effect(() => {
    const top = virtualized ? boundedScrollTop : 0;
    if (viewport && viewport.scrollTop !== top) viewport.scrollTop = top;
    if (virtualized && scrollTop !== top) scrollTop = top;
  });
</script>

<div class={cn('svadmin-u-6da6a3c3f741 svadmin-u-6f7e013d6499', className)}>
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-d8e0e382c67b svadmin-u-660d2effb880 svadmin-u-359090c2d529">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      {#if filterable}
        <Input
          bind:value={filterText}
          disabled={disabled || loading}
          placeholder={filterPlaceholder ?? i18n.t('common.search')}
          aria-label={filterPlaceholder ?? i18n.t('common.search')}
        />
      {/if}
      <Button type="button" disabled={!available || disabled || filterText.trim().length > 0} variant="ghost" size="sm" class="svadmin-u-f6fe902450dc svadmin-u-d5eab218aa34 svadmin-u-359090c2d529" onclick={expandAll}>
        {i18n.t('treeTable.expandAll')}
      </Button>
      {#if normalizedPageSize > 0}
        <span role="status">{normalizedPage} / {pageCount}</span>
        <Button type="button" disabled={!available || disabled || normalizedPage <= 1} variant="ghost" size="sm"
          title={i18n.t('treeTable.previousPage')} aria-label={i18n.t('treeTable.previousPage')}
          onclick={() => setPage(normalizedPage - 1)}><ChevronLeft aria-hidden="true" /></Button>
        <Button type="button" disabled={!available || disabled || normalizedPage >= pageCount} variant="ghost" size="sm"
          title={i18n.t('treeTable.nextPage')} aria-label={i18n.t('treeTable.nextPage')}
          onclick={() => setPage(normalizedPage + 1)}><ChevronRight aria-hidden="true" /></Button>
      {/if}
      <Button type="button" disabled={!available || disabled || filterText.trim().length > 0} variant="ghost" size="sm" class="svadmin-u-f6fe902450dc svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-bfa603190748" onclick={collapseAll}>
        {i18n.t('treeTable.collapseAll')}
      </Button>
    </div>
    {#if selectable && selectedKeys.length > 0}
      <span class="svadmin-u-359090c2d529 svadmin-u-bfa603190748">
        {i18n.t('common.selectedCount', { count: String(selectedKeys.length) })}
      </span>
    {/if}
  </div>

  {#if loading}
    <div role="status">{i18n.t('common.loading')}</div>
  {:else if displayError}
    <div role="alert">{displayError}</div>
    {#if error && onRetry}
      <Button type="button" variant="ghost" size="sm" onclick={onRetry}><RotateCw aria-hidden="true" />{i18n.t('common.retry')}</Button>
    {/if}
  {:else}
  <div bind:this={viewport} data-testid="tree-table-viewport" class:tree-table-virtual={virtualized}
    onscroll={event => { scrollTop = event.currentTarget.scrollTop; }}
    style={virtualized ? `height: ${normalizedHeight}px; overflow: auto; --tree-row-height: ${normalizedRowHeight}px;` : 'overflow-x: auto;'}
    class="svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-c9ed8c5f79ae svadmin-u-2cd02d11d1af svadmin-u-cd0ad9a56558">
    <!-- 原生表格保留列布局，treegrid 为可聚焦的层级行提供交互语义。 -->
    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
    <table bind:this={tableRoot} role="treegrid" aria-label={ariaLabel ?? i18n.t('treeTable.label')}
      aria-rowcount={flattenedRows.length + 1} aria-colcount={cellCount}
      aria-multiselectable={selectable ? 'true' : undefined} aria-disabled={disabled}
      class="svadmin-u-6da6a3c3f741 svadmin-u-2eba0d65d059 svadmin-u-359090c2d529 svadmin-u-4583f90cd9bd">
      <thead class="svadmin-u-358af0b65a31 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-e83a7042bc91 svadmin-u-bfa603190748">
        <tr>
          {#if selectable}
            <th class="svadmin-u-2bbcfc3b5179 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-ca6bf63030aa"></th>
          {/if}
          {#each columns as col (col.key)}
            <th class="svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b" style={col.width ? `width: ${col.width}` : ''}
              aria-sort={sort?.key === col.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : col.sortable ? 'none' : undefined}>
              {#if col.sortable}
                <button class="tree-sort" type="button" disabled={!available || disabled} onclick={() => cycleSort(col)}
                  title={i18n.t('treeTable.sortColumn', { column: col.label })}
                  aria-label={i18n.t('treeTable.sortColumn', { column: col.label })}>
                  {col.label}
                  {#if sort?.key !== col.key}<ArrowUpDown size={14} aria-hidden="true" />
                  {:else if sort.direction === 'asc'}<ArrowUp size={14} aria-hidden="true" />
                  {:else}<ArrowDown size={14} aria-hidden="true" />{/if}
                </button>
              {:else}
                {col.label}
              {/if}
            </th>
          {/each}
          {#if rowActions}
            <th class="svadmin-u-ed831a4dff32 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-308fc069e46e">{i18n.t('common.actions')}</th>
          {/if}
        </tr>
      </thead>
      <tbody class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258">
        {#if virtualized && windowStart > 0}
          <tr aria-hidden="true" class="tree-spacer"><td colspan={cellCount}
            style={`height: ${windowStart * normalizedRowHeight}px;`}></td></tr>
        {/if}
        {#key scopeKey}
        {#each renderedRows as row, renderedIndex (nodeKey(row.id))}
          {@const count = selection.get(row.id)}
          {@const isSelected = count !== undefined && count.total > 0 && count.selected === count.total}
          {@const partial = count !== undefined && count.selected > 0 && count.selected < count.total}
          <tr tabindex={focusTarget === row.id ? 0 : -1}
            aria-rowindex={windowStart + renderedIndex + 2}
            aria-level={row.level + 1} aria-expanded={row.hasChildren ? row.isExpanded : undefined}
            aria-busy={childLoadingKeys.has(row.id)}
            aria-disabled={disabled || row.disabled ? 'true' : undefined}
            aria-selected={selectable ? isSelected : undefined} data-tree-key={nodeKey(row.id)}
            onfocus={() => { focusedKey = row.id; }} onkeydown={event => handleKeydown(event, row)}
            class="svadmin-u-12251b8f1749 svadmin-u-ceb69a6b0e5f {isSelected ? 'svadmin-u-989c466fdbe7' : ''}">
            {#if selectable}
              <td class="svadmin-u-2bbcfc3b5179 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-ca6bf63030aa">
                <div class="tree-cell">
                <Checkbox
                  checked={isSelected}
                  indeterminate={partial}
                  disabled={disabled || row.disabled}
                  onCheckedChange={() => toggleSelect(row.id)}
                  aria-label={i18n.t('common.selectRow', { id: String(row.id) })}
                />
                </div>
              </td>
            {/if}

            {#each columns as col, colIdx (col.key)}
              {@const val = row.record[col.key]}
              <td class="svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b">
                <div class="tree-cell">
                {#if colIdx === 0}
                  <!-- Primary tree node column with indent -->
                  <div
                    class="tree-node-content svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568"
                    style="padding-left: {row.level * 20}px;"
                  >
                    {#if row.hasChildren}
                      <button
                        type="button"
                        disabled={disabled || filterText.trim().length > 0}
                        class="svadmin-u-cd0d9c512cdc svadmin-u-72470489ff4e svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-07389a777c1f svadmin-u-8e551981c8d7 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e svadmin-u-ceb69a6b0e5f"
                        onclick={() => toggleExpand(row.id)}
                        aria-label={`${String(val ?? row.id)}: ${i18n.t(row.isExpanded ? 'treeTable.collapse' : 'treeTable.expand')}`}
                      >
                        {#if childLoadingKeys.has(row.id)}
                          <RotateCw class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" aria-label={i18n.t('common.loading')} />
                        {:else if row.isExpanded}
                          <ChevronDown class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                        {:else}
                          <ChevronRight class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                        {/if}
                      </button>
                      <Folder class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-96747a728556 svadmin-u-012fbd121f37" />
                    {:else}
                      <span class="svadmin-u-72470489ff4e svadmin-u-bb0c4bfc52bd"></span>
                      <File class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-3a33f11548cd svadmin-u-012fbd121f37" />
                    {/if}

                    {#if customCell}
                      {@render customCell({ column: col, record: row.record, value: val })}
                    {:else}
                      <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-f283ea9bea0e">{val ?? '—'}</span>
                    {/if}
                  </div>
                  {#if childErrors.has(row.id)}
                    <span role="alert" title={childErrors.get(row.id)}>{childErrors.get(row.id)}</span>
                    <Button type="button" variant="ghost" size="sm" disabled={disabled || childLoadingKeys.has(row.id)}
                      onclick={() => {
                        const node = fullIndex.nodes.get(row.id);
                        if (node) {
                          expandedKeys = new Set([...expandedKeys, row.id]);
                          void loadNodeChildren(node);
                        }
                      }}><RotateCw aria-hidden="true" />{i18n.t('common.retry')}</Button>
                  {/if}
                {:else if customCell}
                  {@render customCell({ column: col, record: row.record, value: val })}
                {:else}
                  <span class="svadmin-u-d4108abe6359 svadmin-u-f283ea9bea0e">{val ?? '—'}</span>
                {/if}
                </div>
              </td>
            {/each}

            {#if rowActions}
              <td class="svadmin-u-ed831a4dff32 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-308fc069e46e">
                <div class="tree-cell">
                {@render rowActions({ record: row.record, id: row.id })}
                </div>
              </td>
            {/if}
          </tr>
        {:else}
          <tr>
            <td colspan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} class="svadmin-u-a1f611f027dd svadmin-u-ca6bf63030aa svadmin-u-bfa603190748">
              {i18n.t('common.noData')}
            </td>
          </tr>
        {/each}
        {/key}
        {#if virtualized && windowEnd < flattenedRows.length}
          <tr aria-hidden="true" class="tree-spacer"><td colspan={cellCount}
            style={`height: ${(flattenedRows.length - windowEnd) * normalizedRowHeight}px;`}></td></tr>
        {/if}
      </tbody>
    </table>
  </div>
  {/if}
</div>

<style>
  .tree-sort {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .tree-table-virtual .tree-node-content {
    display: flex;
    align-items: center;
    min-width: 0;
    overflow: hidden;
  }
  .tree-table-virtual .tree-cell > [role='alert'] {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tree-table-virtual .tree-cell > :global(button) {
    flex-shrink: 0;
    max-height: var(--tree-row-height);
  }
  .tree-table-virtual table {
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
  }
  .tree-table-virtual thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--background, white);
  }
  .tree-table-virtual th {
    height: var(--tree-row-height);
    box-sizing: border-box;
    padding-block: 0;
    overflow: hidden;
    white-space: nowrap;
  }
  .tree-table-virtual td {
    padding: 0;
    border: 0;
  }
  .tree-table-virtual .tree-cell {
    height: var(--tree-row-height);
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 4px;
    padding-inline: 12px;
    white-space: nowrap;
  }
  .tree-spacer td {
    padding: 0;
    border: 0;
  }
</style>
