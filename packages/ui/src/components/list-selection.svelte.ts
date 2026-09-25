import { untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import type { Filter, Sort } from '@svadmin/core';
import type { RowSelectionState } from '@tanstack/svelte-table';
import { tableRowKey, type BatchSelection } from './table-contract.js';
import { cloneListFilter } from './list-state.svelte.js';

interface ListSelectionOptions {
  filters: () => Filter[];
  sorters: () => Sort[];
  total: () => number;
  selectable: () => boolean;
  allowAllMatching: () => boolean;
  onCriteriaChange: () => void;
}

export function createListSelection(options: ListSelectionOptions) {
  let rowSelection = $state<RowSelectionState>({});
  let allMatchingSelected = $state(false);
  const selectedIdValueByKey = new SvelteMap<string, string | number>();
  const excludedMatchingIds = new SvelteMap<string, string | number>();
  const selectedIds = $derived(
    Object.keys(rowSelection).filter(key => rowSelection[key] === true).flatMap(key => {
      const id = selectedIdValueByKey.get(key);
      return id === undefined ? [] : [id];
    }),
  );
  const selectedCount = $derived(allMatchingSelected
    ? Math.max(0, options.total() - excludedMatchingIds.size) : selectedIds.length);
  const criteria = $derived(JSON.stringify(options.filters()));
  let previousCriteria = untrack(() => criteria);

  $effect.pre(() => {
    const nextCriteria = criteria;
    if (nextCriteria !== previousCriteria) {
      reset();
      options.onCriteriaChange();
    }
    previousCriteria = nextCriteria;
  });
  $effect.pre(() => {
    if (!options.selectable() || !options.allowAllMatching()) clearMatching();
    if (!options.selectable()) clearExplicit();
  });

  function clearMatching(): void {
    allMatchingSelected = false;
    excludedMatchingIds.clear();
  }

  function clearExplicit(): void {
    selectedIdValueByKey.clear();
    rowSelection = {};
  }

  function reset(): void {
    clearMatching();
    clearExplicit();
  }

  function rowIsSelected(key: string): boolean {
    return allMatchingSelected ? !excludedMatchingIds.has(key) : rowSelection[key] === true;
  }

  function trackRow(key: string, id: string | number, selected: boolean): void {
    if (selected) selectedIdValueByKey.set(key, id);
    else selectedIdValueByKey.delete(key);
  }

  function toggleExcluded(key: string, id: string | number): void {
    if (excludedMatchingIds.has(key)) excludedMatchingIds.delete(key);
    else excludedMatchingIds.set(key, id);
  }

  function selectAllMatching(): void {
    clearExplicit();
    excludedMatchingIds.clear();
    allMatchingSelected = true;
  }

  function snapshot(page: ReadonlyArray<{ key: string; id: string | number }>): BatchSelection {
    if (allMatchingSelected) return {
      scope: 'all',
      filters: options.filters().map(cloneListFilter),
      sorters: options.sorters().map(sorter => ({ ...sorter })),
      total: options.total(),
      excludedIds: [...excludedMatchingIds.values()],
    };
    return {
      scope: 'selected',
      ids: [...selectedIds],
      currentPageIds: page.filter(row => rowSelection[row.key] === true).map(row => row.id),
    };
  }

  function captureExplicit(): Map<string, string | number> {
    return new Map(selectedIdValueByKey);
  }

  function restoreExplicit(ids: ReadonlyMap<string, string | number>): void {
    selectedIdValueByKey.clear();
    for (const [key, id] of ids) selectedIdValueByKey.set(key, id);
    rowSelection = Object.fromEntries([...ids.keys()].map(key => [key, true as const]));
  }

  function retainFailedIds(ids: (string | number)[]): void {
    restoreExplicit(new Map(ids.map(id => [tableRowKey(id), id])));
  }

  return {
    get rowSelection() { return rowSelection; },
    set rowSelection(value: RowSelectionState) { rowSelection = value; },
    get allMatchingSelected() { return allMatchingSelected; },
    get selectedIds() { return selectedIds; },
    get selectedCount() { return selectedCount; },
    rowIsSelected, trackRow, toggleExcluded, selectAllMatching, snapshot,
    reset, clearExplicit, captureExplicit, restoreExplicit, retainFailedIds,
  };
}
