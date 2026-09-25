import { untrack } from 'svelte';
import type { FieldDefinition, Filter, Pagination, Sort, readURLState, writeURLState } from '@svadmin/core';
import { definedOptions } from '@svadmin/core/options';
import { snapshotPlainData } from '@svadmin/core/schema';
import type { SavedListViewState } from './saved-list-views.js';

type URLState = ReturnType<typeof readURLState>;
type ListStateSnapshot = Pick<SavedListViewState, 'search' | 'filters' | 'sorters' | 'pagination'>;

interface ListStateOptions {
  fields: () => FieldDefinition[];
  defaultPageSize: () => number;
  defaultSort: () => Sort | undefined;
  externalPagination: () => Pagination | undefined;
  externalSorters: () => Sort[] | undefined;
  initialURLState: URLState;
  initialViewState: SavedListViewState | undefined;
  syncWithLocation: () => boolean;
  writeURLState: (state: Parameters<typeof writeURLState>[0]) => void;
  onDirty: () => void;
}

export function cloneListFilter(filter: Filter): Filter {
  if ('field' in filter) {
    return {
      field: filter.field,
      operator: filter.operator,
      value: filter.value === undefined ? undefined : snapshotPlainData(filter.value),
    };
  }
  return { operator: filter.operator, value: filter.value.map(cloneListFilter) };
}

function editableValues(filters: Filter[], fields: FieldDefinition[]): Record<string, string> {
  const keys = new Set(fields.filter(field => field.filterable).map(field => field.key));
  const counts = new Map<string, number>();
  const values: Record<string, string> = {};
  for (const filter of filters) {
    if ('field' in filter && filter.operator === 'contains' && typeof filter.value === 'string' && keys.has(filter.field)) {
      counts.set(filter.field, (counts.get(filter.field) ?? 0) + 1);
    }
  }
  for (const filter of filters) {
    if ('field' in filter && filter.operator === 'contains' && typeof filter.value === 'string' && counts.get(filter.field) === 1) {
      values[filter.field] = filter.value;
    }
  }
  return values;
}

export function createListState(options: ListStateOptions) {
  const url = options.initialURLState;
  const initialView = options.initialViewState;
  let pagination = $state<Pagination>(untrack(() => options.externalPagination() ?? {
    current: url.page ?? initialView?.pagination.current ?? 1,
    pageSize: url.pageSize ?? initialView?.pagination.pageSize ?? options.defaultPageSize(),
  }));
  let sorters = $state<Sort[]>(untrack(() => {
    const defaultSort = options.defaultSort();
    return options.externalSorters() ?? (url.sortField
      ? [{ field: url.sortField, order: url.sortOrder ?? 'asc' }]
      : initialView?.sorters ?? (defaultSort ? [defaultSort] : []));
  }));
  let filters = $state<Filter[]>(url.filters ?? initialView?.filters ?? []);
  let filterValues = $state(untrack(() => editableValues(filters, options.fields())));
  let searchText = $state(url.search ?? initialView?.search ?? '');
  let appliedSearchText = $state(untrack(() => searchText));
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const searchableFields = $derived(options.fields().filter(field => field.searchable));
  const filterableFields = $derived(options.fields().filter(field => field.filterable));
  const activeFilterItems = $derived.by(() => {
    const labels = new Map(options.fields().map(field => [field.key, field.label]));
    return filters.map((filter, index) => ({
      index,
      label: 'field' in filter
        ? `${labels.get(filter.field) ?? filter.field}: ${String(filter.value)}`
        : filter.operator,
    }));
  });
  const activeFilters = $derived.by(() => {
    const result: Filter[] = [...filters];
    if (appliedSearchText.trim() && searchableFields.length > 0) {
      const first = searchableFields[0];
      if (searchableFields.length === 1 && first) {
        result.push({ field: first.key, operator: 'contains', value: appliedSearchText });
      } else {
        result.push({
          operator: 'or',
          value: searchableFields.map(field => ({
            field: field.key, operator: 'contains', value: appliedSearchText,
          })),
        });
      }
    }
    return result;
  });
  const queryPagination = $derived<Pagination>(definedOptions({
    current: pagination.current, pageSize: pagination.pageSize, mode: pagination.mode,
  }));
  const querySorters = $derived(sorters.map(sorter => ({ field: sorter.field, order: sorter.order })));
  const queryFilters = $derived(activeFilters.map(cloneListFilter));

  $effect(() => {
    const external = options.externalPagination();
    if (external) pagination = external;
  });
  $effect(() => {
    const external = options.externalSorters();
    if (external) sorters = external;
  });
  $effect(() => {
    if (!options.syncWithLocation()) return;
    options.writeURLState({
      page: pagination.current,
      pageSize: pagination.pageSize,
      sortField: sorters[0]?.field,
      sortOrder: sorters[0]?.order,
      search: appliedSearchText || undefined,
      filters,
    });
  });
  $effect(() => cancelSearch);

  function cancelSearch(): void {
    if (searchTimer !== undefined) clearTimeout(searchTimer);
    searchTimer = undefined;
  }

  function scheduleSearch(value: string): void {
    options.onDirty();
    searchText = value;
    cancelSearch();
    searchTimer = setTimeout(() => {
      appliedSearchText = searchText;
      options.onDirty();
      pagination = { ...pagination, current: 1 };
      searchTimer = undefined;
    }, 300);
  }

  function flushSearch(): void {
    if (searchTimer === undefined) return;
    cancelSearch();
    appliedSearchText = searchText;
  }

  function clearSearch(): void {
    searchText = '';
    appliedSearchText = '';
    pagination = { ...pagination, current: 1 };
  }

  function clearFilters(): void {
    options.onDirty();
    cancelSearch();
    clearSearch();
    filters = [];
    filterValues = {};
  }

  function setFilterValue(field: string, value: string): void {
    options.onDirty();
    const trimmedValue = value.trim();
    const nextFilter = { field, operator: 'contains' as const, value: trimmedValue };
    let replaced = false;
    filters = filters.flatMap(filter => {
      if (!('field' in filter) || filter.field !== field || filter.operator !== 'contains') return [filter];
      if (!trimmedValue || replaced) return [];
      replaced = true;
      return [nextFilter];
    });
    if (trimmedValue && !replaced) filters = [...filters, nextFilter];
    filterValues[field] = value;
    pagination = { ...pagination, current: 1 };
  }

  function removeActiveFilter(index: number): void {
    options.onDirty();
    const filter = filters[index];
    if (!filter) return;
    const nextFilters = filters.filter((_, filterIndex) => filterIndex !== index);
    filters = nextFilters;
    if ('field' in filter && filter.operator === 'contains') {
      const remaining = nextFilters.filter(candidate => (
        'field' in candidate && candidate.field === filter.field
        && candidate.operator === 'contains' && typeof candidate.value === 'string'
      ));
      const first = remaining[0];
      filterValues[filter.field] = remaining.length === 1 && first && 'field' in first
        ? String(first.value) : '';
    }
    pagination = { ...pagination, current: 1 };
  }

  function captureState(): ListStateSnapshot {
    return {
      search: appliedSearchText,
      filters: filters.map(cloneListFilter),
      sorters: sorters.map(sorter => ({ ...sorter })),
      pagination: {
        current: pagination.current ?? 1,
        pageSize: pagination.pageSize ?? options.defaultPageSize(),
      },
    };
  }

  function applyState(state: ListStateSnapshot): void {
    cancelSearch();
    searchText = state.search;
    appliedSearchText = state.search;
    filters = state.filters;
    filterValues = editableValues(state.filters, options.fields());
    pagination = { ...pagination, ...state.pagination };
    sorters = state.sorters;
  }

  function resetToDefaults(): void {
    cancelSearch();
    searchText = '';
    appliedSearchText = '';
    filters = [];
    filterValues = {};
    if (!options.externalPagination()) pagination = { current: 1, pageSize: options.defaultPageSize() };
    if (!options.externalSorters()) {
      const defaultSort = options.defaultSort();
      sorters = defaultSort ? [{ ...defaultSort }] : [];
    }
  }

  return {
    get pagination() { return pagination; },
    set pagination(value: Pagination) { pagination = value; },
    get sorters() { return sorters; },
    set sorters(value: Sort[]) { sorters = value; },
    get searchText() { return searchText; },
    get appliedSearchText() { return appliedSearchText; },
    get filterValues() { return filterValues; },
    get searchableFields() { return searchableFields; },
    get filterableFields() { return filterableFields; },
    get activeFilterCount() { return filters.length; },
    get activeFilterItems() { return activeFilterItems; },
    get activeFilters() { return activeFilters; },
    get queryPagination() { return queryPagination; },
    get querySorters() { return querySorters; },
    get queryFilters() { return queryFilters; },
    scheduleSearch, flushSearch, cancelSearch, clearSearch, clearFilters, setFilterValue, removeActiveFilter,
    captureState, applyState, resetToDefaults,
  };
}
