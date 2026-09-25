import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Filter, Sort } from '@svadmin/core';
import { createListSelection } from './list-selection.svelte.js';
import { tableRowKey } from './table-contract.js';

const disposers: Array<() => void> = [];

function setup() {
  let filters = $state<Filter[]>([]);
  let sorters = $state<Sort[]>([]);
  let total = $state(100);
  let selectable = $state(true);
  let allowAll = $state(true);
  const onCriteriaChange = vi.fn();
  let model!: ReturnType<typeof createListSelection>;
  const dispose = $effect.root(() => {
    model = createListSelection({
      filters: () => filters, sorters: () => sorters, total: () => total,
      selectable: () => selectable, allowAllMatching: () => allowAll, onCriteriaChange,
    });
  });
  disposers.push(dispose);
  flushSync();
  return {
    model, onCriteriaChange,
    filters(value: Filter[]) { filters = value; flushSync(); },
    sorters(value: Sort[]) { sorters = value; flushSync(); },
    total(value: number) { total = value; flushSync(); },
    permissions(enabled: boolean, all = true) { selectable = enabled; allowAll = all; flushSync(); },
    select(id: string | number) {
      const key = tableRowKey(id);
      model.trackRow(key, id, true);
      model.rowSelection = { ...model.rowSelection, [key]: true };
      flushSync();
    },
  };
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

describe('list selection model', () => {
  it('preserves numeric and string IDs across pages and snapshots', () => {
    const { model, select } = setup();
    select(1);
    select('1');
    const page = [{ key: tableRowKey('1'), id: '1' }];
    expect(model.selectedIds).toEqual([1, '1']);
    expect(model.snapshot(page)).toEqual({ scope: 'selected', ids: [1, '1'], currentPageIds: ['1'] });
    expect(model.selectedCount).toBe(2);
  });

  it('does not treat unknown row keys as selected IDs', () => {
    const { model, select } = setup();
    select(1);
    model.rowSelection = { unknown: true };
    expect(model.selectedIds).toEqual([]);
    expect(model.selectedCount).toBe(0);
  });

  it('tracks deselection without coercing identifiers', () => {
    const { model, select } = setup();
    select(1);
    model.trackRow(tableRowKey(1), 1, false);
    model.rowSelection = {};
    expect(model.rowIsSelected(tableRowKey(1))).toBe(false);
    expect(model.captureExplicit().size).toBe(0);
  });

  it('selects the full query and toggles exclusions with live total counts', () => {
    const { model, select, total } = setup();
    select(1);
    model.selectAllMatching();
    expect(model.selectedIds).toEqual([]);
    expect(model.rowSelection).toEqual({});
    expect(model.selectedCount).toBe(100);
    model.toggleExcluded(tableRowKey(1), 1);
    expect(model.rowIsSelected(tableRowKey(1))).toBe(false);
    expect(model.rowIsSelected(tableRowKey('1'))).toBe(true);
    expect(model.selectedCount).toBe(99);
    expect(model.snapshot([])).toEqual({
      scope: 'all', filters: [], sorters: [], total: 100, excludedIds: [1],
    });
    total(0);
    expect(model.selectedCount).toBe(0);
    model.toggleExcluded(tableRowKey(1), 1);
    expect(model.rowIsSelected(tableRowKey(1))).toBe(true);
  });

  it('returns isolated query snapshots for custom batch operations', () => {
    const { model, filters, sorters } = setup();
    const source: Filter[] = [{ operator: 'or', value: [{ field: 'id', operator: 'in', value: [1] }] }];
    filters(source);
    sorters([{ field: 'id', order: 'asc' }]);
    model.selectAllMatching();
    const snapshot = model.snapshot([]);
    expect(snapshot.scope).toBe('all');
    if (snapshot.scope !== 'all') throw new Error('Expected all-matching selection');
    snapshot.filters.length = 0;
    snapshot.sorters.length = 0;
    snapshot.excludedIds.push(1);
    expect(model.snapshot([])).toEqual({
      scope: 'all', filters: source, sorters: [{ field: 'id', order: 'asc' }], total: 100, excludedIds: [],
    });
  });

  it.each([false, true])('clears changed criteria in all-matching mode = %s', all => {
    const { model, select, filters, onCriteriaChange } = setup();
    select(1);
    if (all) {
      model.selectAllMatching();
      model.toggleExcluded(tableRowKey(1), 1);
    }
    filters([{ field: 'id', operator: 'eq', value: 2 }]);
    expect(model.selectedIds).toEqual([]);
    expect(model.allMatchingSelected).toBe(false);
    expect(model.captureExplicit().size).toBe(0);
    expect(onCriteriaChange).toHaveBeenCalledTimes(1);
  });

  it('preserves selection for equal filters and sorter changes', () => {
    const { model, filters, sorters, select, onCriteriaChange } = setup();
    select(1);
    filters([]);
    sorters([{ field: 'id', order: 'desc' }]);
    expect(model.selectedIds).toEqual([1]);
    expect(onCriteriaChange).not.toHaveBeenCalled();
  });

  it('revokes all-matching mode without dropping explicit selection', () => {
    const { model, select, permissions } = setup();
    select(1);
    permissions(true, false);
    expect(model.selectedIds).toEqual([1]);
    permissions(true, true);
    model.selectAllMatching();
    permissions(true, false);
    expect(model.allMatchingSelected).toBe(false);
    permissions(false);
    expect(model.selectedIds).toEqual([]);
  });

  it('drops explicit IDs when selection is disabled', () => {
    const { model, select, permissions } = setup();
    select(1);
    permissions(false);
    expect(model.rowSelection).toEqual({});
    expect(model.captureExplicit().size).toBe(0);
  });

  it('restores failed deletion state from an isolated explicit snapshot', () => {
    const { model, select } = setup();
    select(1);
    select('2');
    const before = model.captureExplicit();
    model.clearExplicit();
    expect(model.selectedIds).toEqual([]);
    model.restoreExplicit(before);
    before.clear();
    expect(model.selectedIds).toEqual([1, '2']);
    model.retainFailedIds(['2']);
    expect(model.selectedIds).toEqual(['2']);
    expect(model.rowSelection).toEqual({ [tableRowKey('2')]: true });
  });

  it('resets both selection modes and their identifier maps', () => {
    const { model } = setup();
    model.selectAllMatching();
    model.toggleExcluded(tableRowKey(1), 1);
    model.reset();
    expect(model.allMatchingSelected).toBe(false);
    expect(model.selectedCount).toBe(0);
    model.selectAllMatching();
    expect(model.snapshot([])).toEqual({
      scope: 'all', filters: [], sorters: [], total: 100, excludedIds: [],
    });
  });
});
