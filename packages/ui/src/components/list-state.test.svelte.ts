import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FieldDefinition, Filter, Pagination, Sort } from '@svadmin/core';
import { createListState } from './list-state.svelte.js';
import type { SavedListViewState } from './saved-list-views.js';

type Options = Parameters<typeof createListState>[0];
const disposers: Array<() => void> = [];
const fields: FieldDefinition[] = [
  { key: 'email', label: 'Email', type: 'text', searchable: true, filterable: true },
  { key: 'name', label: 'Name', type: 'text', searchable: true },
];

function savedState(): SavedListViewState {
  return {
    search: 'saved',
    filters: [{ field: 'email', operator: 'contains', value: 'saved' }],
    sorters: [{ field: 'email', order: 'desc' }],
    pagination: { current: 3, pageSize: 20 },
    columnVisibility: {}, columnOrder: [],
  };
}

function setup(input: Partial<Options> = {}) {
  let externalPagination = $state<Pagination | undefined>(undefined);
  let externalSorters = $state<Sort[] | undefined>(undefined);
  let sync = $state(true);
  let defaultPageSize = $state(10);
  let defaultSort = $state<Sort | undefined>(undefined);
  const writeURLState = vi.fn<Options['writeURLState']>();
  const onDirty = vi.fn();
  let model!: ReturnType<typeof createListState>;
  const dispose = $effect.root(() => {
    model = createListState({
      fields: () => fields,
      defaultPageSize: () => defaultPageSize,
      defaultSort: () => defaultSort,
      externalPagination: () => externalPagination,
      externalSorters: () => externalSorters,
      initialURLState: {},
      initialViewState: undefined,
      syncWithLocation: () => sync,
      writeURLState, onDirty, ...input,
    });
  });
  disposers.push(dispose);
  flushSync();
  return {
    model, writeURLState, onDirty, dispose,
    control(pagination: Pagination | undefined, sorters: Sort[] | undefined) {
      externalPagination = pagination;
      externalSorters = sorters;
      flushSync();
    },
    sync(value: boolean) { sync = value; flushSync(); },
    defaults(pageSize: number, sort: Sort) {
      defaultPageSize = pageSize;
      defaultSort = sort;
      flushSync();
    },
  };
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  vi.useRealTimers();
});

describe('list state model', () => {
  it('initializes defaults, saved state, URL state and controlled state in priority order', () => {
    expect(setup().model.pagination).toEqual({ current: 1, pageSize: 10 });
    const saved = savedState();
    expect(setup({ initialViewState: saved }).model.captureState()).toEqual({
      search: saved.search, filters: saved.filters, sorters: saved.sorters, pagination: saved.pagination,
    });
    const url = { page: 4, pageSize: 40, sortField: 'name', search: 'url', filters: [] };
    const { model } = setup({ initialViewState: saved, initialURLState: url });
    expect(model.captureState()).toEqual({
      search: 'url', filters: [], sorters: [{ field: 'name', order: 'asc' }],
      pagination: { current: 4, pageSize: 40 },
    });
    const controlled = setup({
      initialURLState: url,
      externalPagination: () => ({ current: 2, pageSize: 5 }),
      externalSorters: () => [{ field: 'email', order: 'desc' }],
    }).model;
    expect(controlled.pagination).toEqual({ current: 2, pageSize: 5 });
    expect(controlled.sorters).toEqual([{ field: 'email', order: 'desc' }]);
  });

  it('debounces search and keeps generated search filters out of URL filters', () => {
    vi.useFakeTimers();
    const { model, writeURLState } = setup({ initialURLState: { page: 4 } });
    model.scheduleSearch('old');
    vi.advanceTimersByTime(200);
    model.scheduleSearch('Ada');
    vi.advanceTimersByTime(299);
    flushSync();
    expect(model.appliedSearchText).toBe('');
    expect(model.pagination.current).toBe(4);
    vi.advanceTimersByTime(1);
    flushSync();
    expect(model.queryFilters).toEqual([{
      operator: 'or', value: [
        { field: 'email', operator: 'contains', value: 'Ada' },
        { field: 'name', operator: 'contains', value: 'Ada' },
      ],
    }]);
    expect(model.pagination.current).toBe(1);
    expect(writeURLState).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Ada', filters: [] }));
  });

  it.each([0, 1])('builds search filters for %s searchable fields', count => {
    const { model } = setup({ fields: () => fields.slice(0, count), initialURLState: { search: 'Ada' } });
    expect(model.queryFilters).toEqual(count === 0 ? [] : [{ field: 'email', operator: 'contains', value: 'Ada' }]);
  });

  it('flushes pending search before saving without changing the current page', () => {
    vi.useFakeTimers();
    const { model } = setup({ initialURLState: { page: 4 } });
    model.scheduleSearch('Ada');
    model.flushSearch();
    expect(model.captureState().search).toBe('Ada');
    vi.advanceTimersByTime(300);
    expect(model.pagination.current).toBe(4);
  });

  it.each(['clearFilters', 'resetToDefaults'] as const)('%s cancels pending search', action => {
    vi.useFakeTimers();
    const { model, onDirty } = setup({ initialViewState: savedState() });
    model.scheduleSearch('stale');
    model[action]();
    const calls = onDirty.mock.calls.length;
    vi.advanceTimersByTime(300);
    expect(model.searchText).toBe('');
    expect(model.appliedSearchText).toBe('');
    expect(onDirty).toHaveBeenCalledTimes(calls);
    expect(model.captureState().filters).toEqual([]);
  });

  it('clears only the search and page when removing the search tag', () => {
    const { model, onDirty } = setup({ initialViewState: savedState() });
    model.clearSearch();
    expect(model.searchText).toBe('');
    expect(model.appliedSearchText).toBe('');
    expect(model.pagination.current).toBe(1);
    expect(model.captureState().filters).toEqual(savedState().filters);
    expect(onDirty).not.toHaveBeenCalled();
  });

  it('cancels pending search when the owner is destroyed', () => {
    vi.useFakeTimers();
    const { model, dispose, onDirty } = setup();
    model.scheduleSearch('stale');
    dispose();
    vi.advanceTimersByTime(300);
    expect(onDirty).toHaveBeenCalledTimes(1);
    expect(model.appliedSearchText).toBe('');
  });

  it('preserves logical and noneditable filters when editing duplicate contains filters', () => {
    const logical: Filter = { operator: 'or', value: [{ field: 'name', operator: 'eq', value: 'Ada' }] };
    const equal: Filter = { field: 'email', operator: 'eq', value: 'exact' };
    const { model } = setup({ initialURLState: { filters: [
      logical, equal,
      { field: 'email', operator: 'contains', value: 'a' },
      { field: 'email', operator: 'contains', value: 'b' },
    ] } });
    expect(model.filterValues).toEqual({});
    model.setFilterValue('email', '  replacement  ');
    expect(model.captureState().filters).toEqual([
      logical, equal, { field: 'email', operator: 'contains', value: 'replacement' },
    ]);
    expect(model.filterValues.email).toBe('  replacement  ');
    model.setFilterValue('email', ' ');
    expect(model.captureState().filters).toEqual([logical, equal]);
  });

  it('restores an editable value when removing one duplicate and labels logical filters', () => {
    const { model } = setup({ initialURLState: { filters: [
      { field: 'email', operator: 'contains', value: 'a' },
      { field: 'email', operator: 'contains', value: 'b' },
      { operator: 'or', value: [{ field: 'name', operator: 'eq', value: 'Ada' }] },
    ] } });
    expect(model.activeFilterItems.map(item => item.label)).toEqual(['Email: a', 'Email: b', 'or']);
    model.removeActiveFilter(0);
    expect(model.filterValues.email).toBe('b');
    expect(model.activeFilterCount).toBe(2);
    model.removeActiveFilter(0);
    expect(model.filterValues.email).toBe('');
    expect(model.activeFilterCount).toBe(1);
  });

  it('applies a saved view atomically and cancels a pending search without marking it dirty', () => {
    vi.useFakeTimers();
    const { model, onDirty } = setup();
    model.scheduleSearch('stale');
    onDirty.mockClear();
    model.applyState(savedState());
    vi.advanceTimersByTime(300);
    expect(model.captureState().search).toBe('saved');
    expect(model.filterValues).toEqual({ email: 'saved' });
    expect(model.pagination).toEqual({ current: 3, pageSize: 20 });
    expect(onDirty).not.toHaveBeenCalled();
  });

  it('uses live resource defaults on reset and preserves controlled state', () => {
    const { model, control, defaults } = setup();
    defaults(50, { field: 'name', order: 'asc' });
    model.resetToDefaults();
    expect(model.pagination).toEqual({ current: 1, pageSize: 50 });
    expect(model.sorters).toEqual([{ field: 'name', order: 'asc' }]);
    control({ current: 7, pageSize: 30 }, [{ field: 'email', order: 'desc' }]);
    model.resetToDefaults();
    expect(model.pagination).toEqual({ current: 7, pageSize: 30 });
    expect(model.sorters).toEqual([{ field: 'email', order: 'desc' }]);
  });

  it('gates URL writes and supplies explicit undefined values when clearing parameters', () => {
    const { model, sync, writeURLState } = setup({ initialViewState: savedState() });
    sync(false);
    writeURLState.mockClear();
    model.clearFilters();
    model.sorters = [];
    flushSync();
    expect(writeURLState).not.toHaveBeenCalled();
    sync(true);
    expect(writeURLState).toHaveBeenLastCalledWith({
      page: 1, pageSize: 20, sortField: undefined, sortOrder: undefined, search: undefined, filters: [],
    });
  });

  it('keeps query objects stable between reads and isolates nested filter snapshots', () => {
    const { model } = setup({ initialURLState: { filters: [
      { operator: 'or', value: [{ field: 'email', operator: 'in', value: ['a', 'b'] }] },
    ] } });
    expect(model.queryFilters).toBe(model.queryFilters);
    expect(model.queryPagination).toBe(model.queryPagination);
    expect(model.querySorters).toBe(model.querySorters);
    const query = model.queryFilters[0];
    if (query && !('field' in query)) query.value.length = 0;
    const snapshot = model.captureState();
    expect(snapshot.filters).toEqual([
      { operator: 'or', value: [{ field: 'email', operator: 'in', value: ['a', 'b'] }] },
    ]);
    snapshot.filters.length = 0;
    expect(model.activeFilterCount).toBe(1);
  });
});
