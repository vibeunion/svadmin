<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { cn } from '../utils.js';
  import {
    createTable,
    tableFeatures,
    columnOrderingFeature,
    columnSizingFeature,
    columnVisibilityFeature,
    rowExpandingFeature,
    rowSelectionFeature,
    rowSortingFeature,
    type ColumnDef,
    type SortingState,
    type RowSelectionState,
    type ColumnVisibilityState,
    type ExpandedState,
  } from '@tanstack/svelte-table';
  import type { Column, Header, Row, TableFeatures } from '@tanstack/table-core';
  import { createAtom, useSelector } from '@tanstack/svelte-store';
  import {
    column_getCanSort,
    column_getIsSorted,
    column_toggleSorting,
    header_getSize,
    table_getHeaderGroups,
    table_getRowModel,
    table_getAllLeafColumns,
    table_getIsAllRowsSelected,
    table_toggleAllRowsSelected,
    row_toggleSelected,
    row_getVisibleCells,
    cell_getValue,
  } from '@tanstack/table-core/static-functions';

  import { captureAdminContext, DeleteManyPartialError, getAdminOptions, useList, useDelete, useDeleteMany, getResource, useNavigation, useParsed } from '@svadmin/core';
  import type {
    BaseRecord,
    FieldDefinition,
    Filter,
    LogicalFilter,
    Pagination as PaginationState,
    Sort,
  } from '@svadmin/core';
  import { useCan } from '@svadmin/core';
  import { readURLState, writeURLState } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import {
    activeSavedListViewStorageKey,
    canMigrateLegacyListPreferences,
    cloneSavedListViewState,
    columnOrderStorageKey,
    columnVisibilityStorageKey,
    legacyActiveSavedListViewStorageKey,
    legacyColumnOrderStorageKey,
    legacyColumnVisibilityStorageKey,
    legacySavedListViewsStorageKey,
    listPreferenceScopeId,
    readSavedListViews,
    savedListViewsStorageKey,
    serializeSavedListViews,
    type ListPreferenceScope,
    type SavedListView,
    type SavedListViewState,
  } from './saved-list-views.js';

  import { fade } from 'svelte/transition';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Checkbox } from './ui/checkbox/index.js';
  import { Badge } from './ui/badge/index.js';
  import * as Table from './ui/table/index.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import * as Popover from './ui/popover/index.js';
  import * as DropdownMenu from './ui/dropdown-menu/index.js';
  import * as PaginationUI from './ui/pagination/index.js';
  import * as ContextMenu from './ui/context-menu/index.js';
  import * as Select from './ui/select/index.js';
  import {
    Plus, Pencil, Trash2,
    Search, Download, ChevronDown, ChevronUp, SlidersHorizontal, Filter as FilterIcon,
    Eye, Copy, RefreshCw, Rows, X, Bookmark, Check
  } from '@lucide/svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import RecordDetailDrawer from './RecordDetailDrawer.svelte';
  import CanAccess from './CanAccess.svelte';
  import TooltipButton from './TooltipButton.svelte';
  import InlineEdit from './InlineEdit.svelte';
  import DraggableHeader from './DraggableHeader.svelte';
  import DataState from './content/DataState.svelte';
  import type { Snippet } from 'svelte';

  const i18n = useTranslation();

  // ─── Props with Snippet composability ─────────────────────────
  interface Props {
    resourceName: string;
    selectable?: boolean;
    density?: 'compact' | 'comfortable';
    showHeader?: boolean;
    title?: string;
    showFilterTags?: boolean;
    showDensitySwitcher?: boolean;
    showRefresh?: boolean;
    /** Custom header actions (right side) */
    headerActions?: Snippet;
    /** Custom cell renderers by field key */
    columns?: Record<string, Snippet<[{ value: unknown; record: Record<string, unknown> }]>>;
    /** Global fallback cell renderer */
    defaultCellRenderer?: Snippet<[{ field: FieldDefinition; value: unknown; record: Record<string, unknown> }]>;
    /** Custom row actions (edit/delete column) */
    rowActions?: Snippet<[{ record: Record<string, unknown>; id: string | number }]>;
    /** Custom empty state */
    emptyState?: Snippet;
    /** Expandable row content */
    expandedRowRender?: Snippet<[{ record: Record<string, unknown> }]>;
    /** Externally controlled pagination */
    pagination?: { current: number; pageSize: number };
    /** Externally controlled sorters */
    sorters?: Sort[];
    /** Custom batch actions to render when rows are selected */
    batchActions?: Snippet<[{ selectedIds: (string | number)[] }]>;
  }

  let {
    resourceName,
    selectable = true,
    density = 'comfortable',
    showHeader = true,
    title,
    showFilterTags = true,
    showDensitySwitcher = true,
    showRefresh = true,
    headerActions,
    columns: customColumns,
    defaultCellRenderer,
    rowActions,
    emptyState,
    expandedRowRender,
    batchActions,
    pagination: externalPagination,
    sorters: externalSorters,
  }: Props = $props();

  let densityOverride = $state<'compact' | 'comfortable' | undefined>(undefined);
  const currentDensity = $derived(densityOverride ?? density);
  const adminContext = captureAdminContext();
  const adminOptions = getAdminOptions();
  const mutationMode = $derived(adminOptions.mutationMode ?? 'pessimistic');
  const parsed = useParsed();
  const navigation = useNavigation();

  const resource = $derived(getResource(resourceName));
  const primaryKey = $derived(resource.primaryKey ?? 'id');
  const listPreferenceScope = $derived.by(() => {
    const matcher = adminContext.queryKeyMatcher(resourceName);
    return {
      resourceName,
      providerName: matcher.provider ?? 'default',
      tenantIdentity: matcher.tenant,
    };
  });

  function readLocalPreference(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function readScopedPreference(scope: ListPreferenceScope, scopedKey: string, legacyKey: string): string | null {
    const scoped = readLocalPreference(scopedKey);
    if (scoped !== null || !canMigrateLegacyListPreferences(scope)) return scoped;
    const legacy = readLocalPreference(legacyKey);
    if (legacy === null || typeof window === 'undefined') return null;
    try {
      localStorage.setItem(scopedKey, legacy);
      localStorage.removeItem(legacyKey);
    } catch { /* keep the legacy value readable when migration cannot persist */ }
    return legacy;
  }

  // ─── URL state + server-side state ────────────────────────────
  const urlState = readURLState(adminContext);

  const savedViewColumnIds = new Set([
    ...untrack(() => resource.fields.map((field) => field.key)),
    '_select', '_expand', '_actions',
  ]);
  const storedSavedViews = untrack(() => readSavedListViews(
    readScopedPreference(
      listPreferenceScope,
      savedListViewsStorageKey(listPreferenceScope),
      legacySavedListViewsStorageKey(resourceName),
    ),
    savedViewColumnIds,
  ));
  let savedViews = $state<SavedListView[]>(storedSavedViews);
  const storedActiveSavedViewId = untrack(() => {
    const candidate = readScopedPreference(
      listPreferenceScope,
      activeSavedListViewStorageKey(listPreferenceScope),
      legacyActiveSavedListViewStorageKey(resourceName),
    );
    return storedSavedViews.some((view) => view.id === candidate) ? candidate ?? undefined : undefined;
  });
  let savedViewName = $state('');
  let savedViewsOpen = $state(false);

  const hasExplicitURLState = untrack(() => (
    urlState.page !== undefined
    || urlState.pageSize !== undefined
    || urlState.sortField !== undefined
    || urlState.search !== undefined
    || urlState.filters !== undefined
  ));
  let activeSavedViewId = $state<string | undefined>(hasExplicitURLState ? undefined : storedActiveSavedViewId);
  const activeSavedViewName = $derived(savedViews.find((view) => view.id === activeSavedViewId)?.name);
  const initialSavedView = untrack(() => (
    !hasExplicitURLState && storedActiveSavedViewId
      ? storedSavedViews.find((view) => view.id === storedActiveSavedViewId)
      : undefined
  ));
  const initialViewState = initialSavedView?.state;

  // The table can stay mounted while the surrounding tenant/provider changes.
  // Keep persistence effects paused until the new scope has been loaded.
  let loadedPreferenceScopeId = $state(untrack(() => listPreferenceScopeId(listPreferenceScope)));

  function readColumnVisibilityPreference(scope: ListPreferenceScope): ColumnVisibilityState {
    const stored = readScopedPreference(
      scope,
      columnVisibilityStorageKey(scope),
      legacyColumnVisibilityStorageKey(resourceName),
    );
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const visibility: ColumnVisibilityState = {};
          for (const [columnId, visible] of Object.entries(parsed as Record<string, unknown>)) {
            if (savedViewColumnIds.has(columnId) && typeof visible === 'boolean') {
              visibility[columnId] = visible;
            }
          }
          return visibility;
        }
      } catch { /* fall through to resource defaults */ }
    }

    const visibility: ColumnVisibilityState = {};
    for (const field of resource.fields) {
      if (field.showInList === false) visibility[field.key] = false;
    }
    return visibility;
  }

  function readColumnOrderPreference(scope: ListPreferenceScope): string[] {
    const stored = readScopedPreference(
      scope,
      columnOrderStorageKey(scope),
      legacyColumnOrderStorageKey(resourceName),
    );
    if (!stored) return [];
    try {
      const parsed: unknown = JSON.parse(stored);
      return Array.isArray(parsed)
        ? [...new Set(parsed.filter((columnId): columnId is string => (
          typeof columnId === 'string' && savedViewColumnIds.has(columnId)
        )))]
        : [];
    } catch {
      return [];
    }
  }

  function readScopedSavedViewPreferences(scope: ListPreferenceScope): {
    savedViews: SavedListView[];
    activeSavedViewId?: string;
    activeSavedView?: SavedListView;
    columnVisibility: ColumnVisibilityState;
    columnOrder: string[];
  } {
    const scopedSavedViews = readSavedListViews(
      readScopedPreference(
        scope,
        savedListViewsStorageKey(scope),
        legacySavedListViewsStorageKey(resourceName),
      ),
      savedViewColumnIds,
    );
    const candidate = readScopedPreference(
      scope,
      activeSavedListViewStorageKey(scope),
      legacyActiveSavedListViewStorageKey(resourceName),
    );
    const activeSavedView = scopedSavedViews.find((view) => view.id === candidate);
    return {
      savedViews: scopedSavedViews,
      activeSavedViewId: activeSavedView?.id,
      activeSavedView,
      columnVisibility: readColumnVisibilityPreference(scope),
      columnOrder: readColumnOrderPreference(scope),
    };
  }

  // Snapshot resource values for initial state (untrack to avoid reactive tracking)
  const storedPageSize = parseInt(readLocalPreference('svadmin-default-page-size') ?? '', 10);
  const initPageSize = untrack(() => resource.pageSize ?? (isNaN(storedPageSize) ? 10 : storedPageSize));
  const initDefaultSort = untrack(() => resource.defaultSort);

  let pagination = $state<PaginationState>(untrack(() => externalPagination ?? {
    current: urlState.page ?? initialViewState?.pagination.current ?? 1,
    pageSize: urlState.pageSize ?? initialViewState?.pagination.pageSize ?? initPageSize,
  }));
  let sorters = $state<Sort[]>(untrack(() =>
    externalSorters ??
    (urlState.sortField
      ? [{ field: urlState.sortField, order: urlState.sortOrder ?? 'asc' }]
      : initialViewState?.sorters ?? (initDefaultSort ? [initDefaultSort] : [])))
  );
  const initialURLFilters = untrack(() => urlState.filters ?? initialViewState?.filters ?? []);
  const editableFilterKeys = new Set(untrack(() => resource.fields.filter((field) => field.filterable).map((field) => field.key)));
  const editableFilterCounts: Record<string, number> = {};
  for (const filter of initialURLFilters) {
    if ('field' in filter && filter.operator === 'contains' && typeof filter.value === 'string' && editableFilterKeys.has(filter.field)) {
      editableFilterCounts[filter.field] = (editableFilterCounts[filter.field] ?? 0) + 1;
    }
  }
  const initialFilterValues: Record<string, string> = {};
  for (const filter of initialURLFilters) {
    if (
      'field' in filter
      && filter.operator === 'contains'
      && typeof filter.value === 'string'
      && editableFilterCounts[filter.field] === 1
    ) {
      initialFilterValues[filter.field] = filter.value;
    }
  }
  let filters = $state<Filter[]>(initialURLFilters);
  let searchText = $state(urlState.search ?? initialViewState?.search ?? '');
  let appliedSearchText = $state(untrack(() => searchText));
  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleSearch(event: Event) {
    searchText = (event.currentTarget as HTMLInputElement).value;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      appliedSearchText = searchText;
      markSavedViewDirty();
      pagination = { ...pagination, current: 1 };
      searchDebounceTimer = undefined;
    }, 300);
  }

  onDestroy(() => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  });

  // Sync external controlled state
  $effect(() => {
    if (externalPagination) {
      pagination = externalPagination;
    }
  });

  $effect(() => {
    if (externalSorters) {
      sorters = externalSorters;
    }
  });

  // ─── Build active filters with search ─────────────────────────
  const searchableFields = $derived(resource.fields.filter(f => f.searchable));
  const filterableFields = $derived(resource.fields.filter(f => f.filterable));
  let filterValues = $state<Record<string, string>>(initialFilterValues);
  const locationFilters = $derived<Filter[]>(filters);
  const activeFilterCount = $derived(locationFilters.length);
  const activeFilterItems = $derived.by(() => {
    const labels = new Map(resource.fields.map((field) => [field.key, field.label]));
    return locationFilters.map((filter, index) => {
      if ('field' in filter) {
        return { index, label: `${labels.get(filter.field) ?? filter.field}: ${String(filter.value)}` };
      }
      return { index, label: filter.operator };
    });
  });
  const activeFilters = $derived.by(() => {
    const result: Filter[] = [...locationFilters];
    if (appliedSearchText.trim() && searchableFields.length > 0) {
      if (searchableFields.length === 1) {
        result.push({ field: searchableFields[0].key, operator: 'contains', value: appliedSearchText });
      } else {
        const searchFilter: LogicalFilter = {
          operator: 'or',
          value: searchableFields.map(f => ({
            field: f.key,
            operator: 'contains',
            value: appliedSearchText
          }))
        };
        result.push(searchFilter);
      }
    }
    return result;
  });

  // URL sync
  $effect(() => {
    writeURLState({
      page: pagination.current,
      pageSize: pagination.pageSize,
      sortField: sorters[0]?.field,
      sortOrder: sorters[0]?.order,
      search: appliedSearchText || undefined,
      filters: locationFilters,
    }, adminContext);
  });

  function clearFilters(): void {
    markSavedViewDirty();
    filters = [];
    filterValues = {};
    pagination = { ...pagination, current: 1 };
  }

  function setFilterValue(field: string, value: string): void {
    markSavedViewDirty();
    const trimmedValue = value.trim();
    const nextFilter = { field, operator: 'contains' as const, value: trimmedValue };
    let replaced = false;
    filters = filters.flatMap((filter) => {
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
    markSavedViewDirty();
    const filter = locationFilters[index];
    if (!filter) return;
    const nextFilters = filters.filter((_, filterIndex) => filterIndex !== index);
    filters = nextFilters;
    if ('field' in filter && filter.operator === 'contains') {
      const remaining = nextFilters.filter((candidate) => (
        'field' in candidate
        && candidate.field === filter.field
        && candidate.operator === 'contains'
        && typeof candidate.value === 'string'
      ));
      filterValues[filter.field] = remaining.length === 1 && 'field' in remaining[0]
        ? String(remaining[0].value)
        : '';
    }
    pagination = { ...pagination, current: 1 };
  }

  function clonePlainValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(clonePlainValue);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, clonePlainValue(entry)])
      );
    }
    return value;
  }

  function cloneFilter(filter: Filter): Filter {
    if ('field' in filter) {
      return {
        field: filter.field,
        operator: filter.operator,
        value: clonePlainValue(filter.value),
      };
    }
    return {
      operator: filter.operator,
      value: filter.value.map(cloneFilter),
    };
  }

  const queryPagination = $derived<PaginationState>({
    current: pagination.current,
    pageSize: pagination.pageSize,
    mode: pagination.mode,
  });
  const querySorters = $derived<Sort[]>(sorters.map(sorter => ({
    field: sorter.field,
    order: sorter.order,
  })));
  const queryFilters = $derived<Filter[]>(activeFilters.map(cloneFilter));

  // ─── Data fetching ────────────────────────────────────────────
  const listResult = useList({
    get resource() { return resourceName; },
    get pagination() { return queryPagination; },
    get sorters() { return querySorters; },
    get filters() { return queryFilters; },
  });
  const query = listResult;
  const deleteResult = useDelete({ get resource() { return resourceName; } });
  const deleteMutation = deleteResult.mutation;
  let batchOperationCount = $state(0);
  const deleteManyResult = useDeleteMany({
    get resource() { return resourceName; },
    successNotification: () => ({
      message: i18n.t('common.batchDeleteSuccess', { count: batchOperationCount }),
    }),
    errorNotification: (error) => ({
      type: 'error',
      message: error instanceof DeleteManyPartialError
        ? i18n.t('common.batchDeletePartialFail', { failed: error.failedIds.length, total: batchOperationCount })
        : i18n.t('common.batchDeleteFailed', { count: batchOperationCount }),
    }),
  });
  const deleteManyMutation = deleteManyResult.mutation;

  // ─── Permissions ──────────────────────────────────────────────
  const acEnabled = $derived(!!adminContext.accessControlProvider);
  const canCreatePerm = useCan(() => ({ resource: resourceName, action: 'create', queryOptions: { enabled: acEnabled } }));
  const canExportPerm = useCan(() => ({ resource: resourceName, action: 'export', queryOptions: { enabled: acEnabled } }));
  const canCreate = $derived(resource.canCreate !== false && (!acEnabled || canCreatePerm.allowed));
  const canEdit = $derived(resource.canEdit !== false);
  const canShow = $derived(resource.canShow !== false);
  const canDelete = $derived(resource.canDelete !== false);
  const canExport = $derived(canExportPerm.allowed);

  // ─── TanStack Table state ────────────────────────────────────
  const initialSorting = untrack<SortingState>(() =>
    sorters.map(s => ({ id: s.field, desc: s.order === 'desc' }))
  );
  const initialColumnVisibility = untrack(() => (
    initialViewState?.columnVisibility ?? readColumnVisibilityPreference(listPreferenceScope)
  ));
  const sortingAtom = createAtom(initialSorting);
  const columnVisibilityAtom = createAtom(initialColumnVisibility);
  const rowSelectionAtom = createAtom({} as RowSelectionState);
  const expandedAtom = createAtom({} as ExpandedState);
  const initialColumnOrder = untrack(() => (
    initialViewState?.columnOrder?.length
      ? initialViewState.columnOrder
      : readColumnOrderPreference(listPreferenceScope)
  ));
  const columnOrderAtom = createAtom(initialColumnOrder);
  const features = tableFeatures({
    columnOrderingFeature,
    columnSizingFeature,
    columnVisibilityFeature,
    rowExpandingFeature,
    rowSelectionFeature,
    rowSortingFeature,
  });

  const tableSorting = useSelector(sortingAtom);
  const tableColumnVisibility = useSelector(columnVisibilityAtom);
  const tableRowSelection = useSelector(rowSelectionAtom);
  const tableExpanded = useSelector(expandedAtom);
  const tableColumnOrder = useSelector(columnOrderAtom);
  const selectedIdValueByKey = new SvelteMap<string, string | number>();

  function preferenceScopeIsLoaded(): boolean {
    return loadedPreferenceScopeId === listPreferenceScopeId(listPreferenceScope);
  }

  function rowIsExpanded(rowId: string): boolean {
    const expanded = tableExpanded.current;
    return expanded === true || expanded[rowId] === true;
  }

  function rowIsSelected(rowId: string): boolean {
    return tableRowSelection.current[rowId] === true;
  }

  function rowIdValue(row: Row<TableFeatures, BaseRecord>): string | number {
    const value = row.original[primaryKey];
    return typeof value === 'string' || typeof value === 'number' ? value : row.id;
  }

  function toggleRowSelection(row: Row<TableFeatures, BaseRecord>): void {
    const wasSelected = rowIsSelected(row.id);
    if (!wasSelected) {
      selectedIdValueByKey.set(row.id, rowIdValue(row));
    } else if (wasSelected) {
      selectedIdValueByKey.delete(row.id);
    }
    row_toggleSelected(row);
  }

  $effect(() => {
    const nextSorters: Sort[] = tableSorting.current.map((sorter) => ({
      field: sorter.id,
      order: sorter.desc ? 'desc' as const : 'asc' as const,
    }));

    if (JSON.stringify(nextSorters) !== JSON.stringify(sorters)) {
      sorters = nextSorters;
    }
  });

  // Persist column visibility to localStorage
  $effect(() => {
    if (!preferenceScopeIsLoaded()) return;
    const storageKey = columnVisibilityStorageKey(listPreferenceScope);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(tableColumnVisibility.current));
      } catch { /* ignore quota errors */ }
    }
  });

  $effect(() => {
    if (!preferenceScopeIsLoaded()) return;
    const ids = tableColumnOrder.current;
    persistColumnOrder(ids);
  });

  function persistSavedViews(): void {
    if (typeof window === 'undefined' || !preferenceScopeIsLoaded()) return;
    try {
      localStorage.setItem(savedListViewsStorageKey(listPreferenceScope), serializeSavedListViews(savedViews));
    } catch { /* ignore quota errors */ }
  }

  function persistActiveSavedView(): void {
    if (typeof window === 'undefined' || !preferenceScopeIsLoaded()) return;
    try {
      const key = activeSavedListViewStorageKey(listPreferenceScope);
      if (activeSavedViewId) localStorage.setItem(key, activeSavedViewId);
      else localStorage.removeItem(key);
    } catch { /* ignore quota errors */ }
  }

  function markSavedViewDirty(): void {
    if (!activeSavedViewId) return;
    activeSavedViewId = undefined;
    persistActiveSavedView();
  }

  function getCurrentSavedViewState(): SavedListViewState {
    return {
      search: appliedSearchText,
      filters: locationFilters.map(cloneFilter),
      sorters: sorters.map((sorter) => ({ ...sorter })),
      pagination: {
        current: pagination.current ?? 1,
        pageSize: pagination.pageSize ?? initPageSize,
      },
      columnVisibility: { ...tableColumnVisibility.current },
      columnOrder: [...tableColumnOrder.current],
    };
  }

  function applySavedView(view: SavedListView): void {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = undefined;
    }
    const state = cloneSavedListViewState(view.state);
    activeSavedViewId = view.id;
    persistActiveSavedView();
    searchText = state.search;
    appliedSearchText = state.search;
    filters = state.filters;
    const restoredFilterCounts: Record<string, number> = {};
    for (const filter of state.filters) {
      if ('field' in filter && filter.operator === 'contains' && typeof filter.value === 'string' && editableFilterKeys.has(filter.field)) {
        restoredFilterCounts[filter.field] = (restoredFilterCounts[filter.field] ?? 0) + 1;
      }
    }
    filterValues = {};
    for (const filter of state.filters) {
      if (
        'field' in filter
        && filter.operator === 'contains'
        && typeof filter.value === 'string'
        && restoredFilterCounts[filter.field] === 1
      ) {
        filterValues[filter.field] = filter.value;
      }
    }
    pagination = { ...pagination, ...state.pagination };
    sorters = state.sorters;
    sortingAtom.set(state.sorters.map((sorter) => ({ id: sorter.field, desc: sorter.order === 'desc' })));
    columnVisibilityAtom.set(state.columnVisibility);
    columnOrderAtom.set(state.columnOrder);
    persistColumnOrder(state.columnOrder);
    rowSelectionAtom.set({});
  }

  function resetToDefaultListState(): void {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = undefined;
    }
    searchText = '';
    appliedSearchText = '';
    filters = [];
    filterValues = {};
    if (!externalPagination) {
      pagination = { current: 1, pageSize: initPageSize };
    }
    if (!externalSorters) {
      const defaultSorters = initDefaultSort ? [{ ...initDefaultSort }] : [];
      sorters = defaultSorters;
      sortingAtom.set(defaultSorters.map((sorter) => ({ id: sorter.field, desc: sorter.order === 'desc' })));
    }
  }

  $effect(() => {
    const scope = listPreferenceScope;
    const scopeId = listPreferenceScopeId(scope);
    if (scopeId === loadedPreferenceScopeId) return;

    const preferences = readScopedSavedViewPreferences(scope);
    savedViews = preferences.savedViews;
    activeSavedViewId = preferences.activeSavedViewId;

    if (!hasExplicitURLState && preferences.activeSavedView) {
      applySavedView(preferences.activeSavedView);
    } else {
      if (!hasExplicitURLState) resetToDefaultListState();
      columnVisibilityAtom.set(preferences.columnVisibility);
      columnOrderAtom.set(preferences.columnOrder);
      rowSelectionAtom.set({});
    }

    loadedPreferenceScopeId = scopeId;
  });

  function saveCurrentView(): void {
    const name = savedViewName.trim().slice(0, 60);
    if (!name) return;
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = undefined;
      appliedSearchText = searchText;
    }
    const existing = savedViews.find((view) => view.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    const view: SavedListView = {
      id: existing?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      state: getCurrentSavedViewState(),
    };
    savedViews = existing
      ? savedViews.map((candidate) => candidate.id === existing.id ? view : candidate)
      : [view, ...savedViews].slice(0, 25);
    activeSavedViewId = view.id;
    savedViewName = '';
    persistSavedViews();
    persistActiveSavedView();
  }

  function deleteSavedView(id: string): void {
    savedViews = savedViews.filter((view) => view.id !== id);
    if (activeSavedViewId === id) activeSavedViewId = undefined;
    persistSavedViews();
    persistActiveSavedView();
  }

  function setColumnVisibility(columnId: string, visible: boolean): void {
    markSavedViewDirty();
    columnVisibilityAtom.set({ ...tableColumnVisibility.current, [columnId]: visible });
  }

  function persistColumnOrder(ids: string[]): void {
    if (typeof window === 'undefined' || !preferenceScopeIsLoaded()) return;
    try { localStorage.setItem(columnOrderStorageKey(listPreferenceScope), JSON.stringify(ids)); } catch { /* ignore */ }
  }

  function setColumnOrder(newOrder: Array<{ id: string }>): void {
    markSavedViewDirty();
    const ids = newOrder.map((column) => column.id);
    columnOrderAtom.set(ids);
  }

  function toggleColumnSort(column: Column<TableFeatures, BaseRecord, unknown>): void {
    markSavedViewDirty();
    column_toggleSorting(column);
  }

  // Sync external sorters ? local sorting state (controlled mode only)
  $effect(() => {
    if (!externalSorters) return;
    if (JSON.stringify(externalSorters) !== JSON.stringify(sorters)) {
      sorters = externalSorters;
    }
    const nextSorting = externalSorters.map(s => ({ id: s.field, desc: s.order === 'desc' }));
    if (JSON.stringify(nextSorting) !== JSON.stringify(tableSorting.current)) {
      sortingAtom.set(nextSorting);
    }
  });


  // ─── Auto-generate columns from resource fields ──────────────
  const visibleFields = $derived(
    resource.fields.filter(f => f.showInList !== false)
  );

  const columns = $derived<ColumnDef<TableFeatures, BaseRecord, unknown>[]>([
    // Selection column
    ...(selectable && (canDelete || batchActions) ? [{
      id: '_select',
      header: () => '',
      cell: () => '',
      size: 40,
      enableSorting: false,
    } satisfies ColumnDef<TableFeatures, BaseRecord, unknown>] : []),
    // Expand column
    ...(expandedRowRender ? [{
      id: '_expand',
      header: () => '',
      cell: () => '',
      size: 40,
      enableSorting: false,
    } satisfies ColumnDef<TableFeatures, BaseRecord, unknown>] : []),
    // Data columns
    ...visibleFields.map((field): ColumnDef<TableFeatures, BaseRecord, unknown> => ({
      id: field.key,
      accessorKey: field.key,
      header: () => field.label,
      size: field.width ? parseInt(String(field.width)) : undefined,
    })),
    // Actions column
    {
      id: '_actions',
      header: () => i18n.t('common.actions'),
      cell: () => '',
      size: 100,
      enableSorting: false,
    },
  ]);
  const orderedColumns = $derived.by(() => {
    const columnOrder = tableColumnOrder.current;
    if (!columnOrder.length) return columns;

    const columnsById = new Map(columns.map((column) => [column.id, column]));
    return [
      ...columnOrder.flatMap((id) => {
        const column = columnsById.get(id);
        return column ? [column] : [];
      }),
      ...columns.filter((column) => !columnOrder.includes(column.id ?? '')),
    ];
  });

  // ─── Create TanStack Table ────────────────────────────────────
  const tbl = createTable<TableFeatures, BaseRecord>(
    {
      features,
      get data() { return query.data?.data ?? []; },
      get columns() { return orderedColumns; },
      manualSorting: true,
      getRowId: (row: BaseRecord) => String(row[primaryKey]),
      state: {
        get sorting() { return tableSorting.current; },
        get columnVisibility() { return tableColumnVisibility.current; },
      },
      onSortingChange: (updater) => {
        sortingAtom.set(typeof updater === 'function' ? updater(tableSorting.current) : updater);
      },
      atoms: {
        rowSelection: rowSelectionAtom,
        expanded: expandedAtom,
      },
      autoResetExpanded: false,
      get enableRowSelection() { return selectable && (canDelete || !!batchActions); },
      get enableExpanding() { return !!expandedRowRender; },
      getRowCanExpand: () => !!expandedRowRender,
    },
  );

  function toggleAllRowsSelection(): void {
    const willSelect = !table_getIsAllRowsSelected(tbl);
    for (const row of tableView.rows) {
      if (willSelect) {
        selectedIdValueByKey.set(row.id, rowIdValue(row));
      } else if (!willSelect) {
        selectedIdValueByKey.delete(row.id);
      }
    }
    table_toggleAllRowsSelected(tbl);
  }

  const selectedIds = $derived(
    Object.keys(tableRowSelection.current).map((key) => selectedIdValueByKey.get(key) ?? key)
  );
  const selectedCount = $derived(selectedIds.length);
  const batchDeletePerm = useCan(() => ({
    resource: resourceName,
    action: 'delete',
    params: { ids: selectedIds },
    queryOptions: { enabled: acEnabled && canDelete && selectedIds.length > 0 },
  }));
  const canBatchDelete = $derived(
    canDelete && (!acEnabled || (!batchDeletePerm.isLoading && batchDeletePerm.allowed))
  );

  function clearSelection(): void {
    if (!deleteManyMutation.isPending) {
      selectedIdValueByKey.clear();
      rowSelectionAtom.set({});
    }
  }

  function isColumnVisible(columnId: string): boolean {
    return tableColumnVisibility.current[columnId] !== false;
  }

  const tableView = $derived.by(() => {
    void tableSorting.current;
    void tableColumnVisibility.current;
    void orderedColumns;
    void tableRowSelection.current;
    void tableExpanded.current;
    void tableColumnOrder.current;
    const headerGroups = table_getHeaderGroups(tbl);
    return {
      headerGroups,
      rows: table_getRowModel(tbl).rows,
    };
  });

  function toggleRowExpanded(rowId: string): void {
    const current = tableExpanded.current;
    if (current === true) {
      expandedAtom.set(Object.fromEntries(
        table_getRowModel(tbl).flatRows
          .filter((row) => row.id !== rowId)
          .map((row) => [row.id, true])
      ));
      return;
    }
    if (current[rowId]) {
      expandedAtom.set(Object.fromEntries(
        Object.entries(current).filter(([id, isExpanded]) => id !== rowId && isExpanded)
      ));
      return;
    }
    expandedAtom.set({ ...current, [rowId]: true });
  }

  const totalPages = $derived(Math.ceil((query.data?.total ?? 0) / (pagination.pageSize ?? 10)));

  // ─── Pagination helpers ───────────────────────────────────────
  const currentPage = $derived(pagination.current ?? 1);
  const pages = $derived.by(() => {
    const p: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) p.push(i);
    } else {
      p.push(1);
      if (currentPage > 3) p.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) p.push(i);
      if (currentPage < totalPages - 2) p.push('...');
      p.push(totalPages);
    }
    return p;
  });

  // ─── Confirm dialog ───────────────────────────────────────────
  let confirmOpen = $state(false);
  let confirmMessage = $state('');
  let confirmAction = $state<() => void>(() => {});
  let confirmPending = $state(false);
  let detailOpenedInHistory = $state(false);
  const detailRecordId = $derived(parsed.params.detail);
  const detailOpen = $derived(detailRecordId != null);

  function confirmDelete(id: string | number) {
    confirmMessage = i18n.t('common.deleteConfirm');
    confirmAction = async () => {
      confirmPending = true;
      if (mutationMode !== 'pessimistic') confirmOpen = false;
      try {
        await deleteMutation.mutateAsync({
          id,
          resource: resourceName,
          onCancel: () => { confirmOpen = false; },
        });
        confirmOpen = false;
      } catch {
        // useDelete owns error feedback and restores optimistic cache state.
      } finally {
        confirmPending = false;
      }
    };
    confirmOpen = true;
  }

  function confirmBatchDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0 || deleteManyMutation.isPending) return;
    batchOperationCount = ids.length;
    confirmMessage = i18n.t('common.batchDeleteConfirm', { count: ids.length });
    confirmAction = async () => {
      confirmPending = true;
      if (mutationMode !== 'pessimistic') confirmOpen = false;
      try {
        await deleteManyMutation.mutateAsync({
          ids,
          resource: resourceName,
          onCancel: () => { confirmOpen = false; },
        });
        selectedIdValueByKey.clear();
        rowSelectionAtom.set({});
        confirmOpen = false;
      } catch (error) {
        if (error instanceof DeleteManyPartialError) {
          const failedSelection: RowSelectionState = {};
          for (const id of error.failedIds) failedSelection[String(id)] = true;
          for (const id of error.succeededIds) selectedIdValueByKey.delete(String(id));
          rowSelectionAtom.set(failedSelection);
        }
        // useDeleteMany owns the error notification; keep failed selection for retry.
      } finally {
        confirmPending = false;
      }
    };
    confirmOpen = true;
  }

  function openDetail(id: string | number): void {
    detailOpenedInHistory = true;
    writeURLState({ detailId: String(id) }, adminContext, 'push');
  }

  function closeDetail(): void {
    if (detailOpenedInHistory && adminContext.routerProvider) {
      detailOpenedInHistory = false;
      adminContext.routerProvider.back();
      return;
    }
    detailOpenedInHistory = false;
    writeURLState({ detailId: undefined }, adminContext);
  }

  // ─── CSV Export ───────────────────────────────────────────────
  function exportCSV() {
    const data = query.data?.data ?? [];
    if (data.length === 0) return;
    const headers = visibleFields.map(f => f.label);
    const rows = data.map(record =>
      visibleFields.map(f => {
        const val = record[f.key];
        if (val == null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      })
    );
    const csv = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${resourceName}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function goToPage(page: number) {
    markSavedViewDirty();
    pagination = { ...pagination, current: page };
  }
</script>

<div class="space-y-3">
  {#if showHeader}
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-lg sm:text-xl font-semibold text-foreground">{title ?? resource.label}</h1>
      <div class="flex flex-wrap items-center gap-2">
        {#if canExport}
          <Button variant="outline" size="sm" onclick={exportCSV}>
            <Download class="h-4 w-4" data-icon="inline-start" /> {i18n.t("common.export")}
          </Button>
        {/if}
        {#if headerActions}
          {@render headerActions()}
        {/if}
        {#if canCreate}
          <Button onclick={() => navigation.create(resourceName)}>
            <Plus class="h-4 w-4" data-icon="inline-start" /> {i18n.t("common.create")}
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Selection Banner (Enterprise Batch Actions) -->
  {#if selectedCount > 0}
    <div
      class="flex flex-col gap-3 border border-primary/20 bg-primary/10 px-3.5 py-2 rounded-lg text-sm text-foreground animate-in fade-in duration-200 sm:flex-row sm:items-center sm:justify-between"
      aria-label={i18n.t("common.selectedCount", { count: selectedCount })}
      data-svadmin-batch-toolbar
    >
      <div class="flex min-w-0 items-center gap-2 text-sm">
        <span class="font-medium text-foreground">{i18n.t("common.selectedCount", { count: selectedCount })}</span>
        {#if deleteManyMutation.isPending}
          <span class="text-muted-foreground" role="status">{i18n.t("common.processing")}</span>
        {/if}
      </div>
      <div class="flex flex-wrap items-center gap-2">
        {#if batchActions}
          {@render batchActions({ selectedIds })}
        {/if}
        {#if canBatchDelete}
          <Button
            variant="destructive"
            size="sm"
            class="h-8 text-xs whitespace-nowrap"
            disabled={deleteManyMutation.isPending}
            onclick={confirmBatchDelete}
          >
            <Trash2 class="h-3.5 w-3.5" data-icon="inline-start" /> {i18n.t("common.batchDelete", { count: selectedCount })}
          </Button>
        {/if}
        <Button
          variant="ghost"
          size="sm"
          class="h-8 text-xs text-muted-foreground hover:text-foreground"
          disabled={deleteManyMutation.isPending}
          onclick={clearSelection}
        >
          {i18n.t("common.clearSelection")}
        </Button>
      </div>
    </div>
  {/if}

  <!-- Search, Filter & Table Utility Toolbar -->
  <div class="flex flex-wrap items-center justify-between gap-2">
    <!-- Left: Search and Advanced Filters -->
    <div class="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
      {#if searchableFields.length > 0}
        <div class="relative max-w-sm flex-1 sm:min-w-[220px]">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchText}
            oninput={scheduleSearch}
            placeholder={i18n.t("common.search")}
            class="pl-9 h-9 text-sm"
          />
        </div>
      {/if}

      {#if filterableFields.length > 0}
        <Popover.Root>
          <Popover.Trigger>
            {#snippet child({ props })}
              <Button variant="outline" size="sm" class="h-9 px-3" {...props}>
                <FilterIcon class="h-4 w-4" data-icon="inline-start" />
                {i18n.t("common.filter")}
                {#if activeFilterCount > 0}
                  <Badge variant="secondary" class="ml-1 h-5 min-w-5 px-1">{activeFilterCount}</Badge>
                {/if}
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-80">
            <div class="space-y-3">
              <h4 class="font-medium text-sm">{i18n.t("common.filter")}</h4>
              {#each filterableFields as field, _i (_i)}
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground" for="filter-{field.key}">{field.label}</label>
                  {#if field.type === "select" && field.options}
                    <Select.Root
                      id="filter-{field.key}"
                      class="h-9 text-sm"
                      value={filterValues[field.key] ?? ""}
                      onchange={(e) => setFilterValue(field.key, (e.currentTarget as HTMLSelectElement).value)}
                    >
                      <option value="">{i18n.t("common.all")}</option>
                      {#each field.options as opt, _i (_i)}
                        <option value={opt.value}>{opt.label}</option>
                      {/each}
                    </Select.Root>
                  {:else}
                    <Input
                      id="filter-{field.key}"
                      type="text"
                      value={filterValues[field.key] ?? ""}
                      oninput={(e) => setFilterValue(field.key, e.currentTarget.value)}
                      placeholder={field.label}
                      class="h-9 text-sm"
                    />
                  {/if}
                </div>
              {/each}
              <div class="flex gap-2 pt-2">
                <Button size="sm" class="flex-1" onclick={() => { pagination = { ...pagination, current: 1 }; }}>
                  {i18n.t("common.confirm")}
                </Button>
                <Button variant="outline" size="sm" onclick={clearFilters}>
                  {i18n.t("common.reset")}
                </Button>
              </div>
            </div>
          </Popover.Content>
        </Popover.Root>
      {/if}
    </div>

    <!-- Right: Table Controls (Density, Columns, Saved Views, Refresh, Export if !showHeader) -->
    <div class="flex items-center gap-1.5 shrink-0">
      {#if !showHeader && canExport}
        <TooltipButton tooltip={i18n.t("common.export")} variant="outline" size="sm" class="h-9 px-2.5" onclick={exportCSV}>
          <Download class="h-4 w-4" />
        </TooltipButton>
      {/if}

      {#if showDensitySwitcher}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <TooltipButton tooltip={i18n.t("common.density")} variant="outline" size="sm" class="h-9 px-2.5" {...props}>
                <Rows class="h-4 w-4" />
              </TooltipButton>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="w-36">
            <DropdownMenu.Item onclick={() => { densityOverride = "comfortable"; }} class={currentDensity === "comfortable" ? "font-semibold text-primary" : ""}>
              {i18n.t("common.densityComfortable")}
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => { densityOverride = "compact"; }} class={currentDensity === "compact" ? "font-semibold text-primary" : ""}>
              {i18n.t("common.densityCompact")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}

      <!-- Column Visibility Picker -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <TooltipButton tooltip={i18n.t("common.columns")} variant="outline" size="sm" class="h-9 px-2.5" {...props}>
              <SlidersHorizontal class="h-4 w-4" />
            </TooltipButton>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="w-48">
          {#each table_getAllLeafColumns(tbl).filter((column) => !column.id.startsWith("_")) as column, _i (_i)}
            <DropdownMenu.CheckboxItem
              checked={tableColumnVisibility.current[column.id] ?? true}
              onCheckedChange={(v) => setColumnVisibility(column.id, !!v)}
            >
              {visibleFields.find(f => f.key === column.id)?.label ?? column.id}
            </DropdownMenu.CheckboxItem>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <!-- Saved Views -->
      <Popover.Root bind:open={savedViewsOpen}>
        <Popover.Trigger>
          {#snippet child({ props })}
            <Button variant="outline" size="sm" class="h-9 px-2.5" {...props} aria-label={i18n.t("common.savedViews")}>
              <Bookmark class="h-4 w-4" data-icon="inline-start" /> {activeSavedViewName ?? i18n.t("common.savedViews")}
            </Button>
          {/snippet}
        </Popover.Trigger>
        <Popover.Content align="end" class="w-80">
          <div class="space-y-3">
            <div>
              <h4 class="font-medium text-sm">{i18n.t("common.savedViews")}</h4>
              <p class="mt-1 text-xs text-muted-foreground">{i18n.t("common.savedViewsHint")}</p>
            </div>
            <div class="space-y-1">
              <label class="text-xs text-muted-foreground" for="saved-list-view">{i18n.t("common.currentView")}</label>
              <Select.Root
                id="saved-list-view"
                class="h-9 w-full"
                value={activeSavedViewId ?? ""}
                onchange={(event) => {
                  const id = (event.currentTarget as HTMLSelectElement).value;
                  const view = savedViews.find((candidate) => candidate.id === id);
                  if (view) applySavedView(view);
                  else {
                    activeSavedViewId = undefined;
                    persistActiveSavedView();
                  }
                }}
              >
                <option value="">{i18n.t("common.currentView")}</option>
                {#each savedViews as view (view.id)}
                  <option value={view.id}>{view.name}</option>
                {/each}
              </Select.Root>
            </div>
            <div class="flex gap-2">
              <Input
                aria-label={i18n.t("common.viewName")}
                placeholder={i18n.t("common.viewName")}
                maxlength={60}
                bind:value={savedViewName}
                class="h-9"
              />
              <Button size="sm" class="shrink-0" disabled={!savedViewName.trim()} onclick={saveCurrentView}>
                <Check class="h-4 w-4" data-icon="inline-start" /> {i18n.t("common.saveView")}
              </Button>
            </div>
            {#if savedViews.length > 0}
              <div class="space-y-1 border-t border-border pt-2">
                {#each savedViews as view (view.id)}
                  <div class="flex items-center justify-between gap-2 text-sm">
                    <span class="min-w-0 truncate">{view.name}</span>
                    <button
                      type="button"
                      class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="{i18n.t("common.delete")} {view.name}"
                      title="{i18n.t("common.delete")} {view.name}"
                      onclick={() => deleteSavedView(view.id)}
                    >
                      <Trash2 class="size-3.5" />
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </Popover.Content>
      </Popover.Root>

      {#if showRefresh}
        <TooltipButton
          tooltip={i18n.t("common.refresh")}
          variant="outline"
          size="sm"
          class="h-9 px-2.5"
          onclick={() => listResult.refetch()}
        >
          <RefreshCw class="h-4 w-4 {query.isFetching ? "animate-spin" : ""}" />
        </TooltipButton>
      {/if}

      {#if !showHeader && canCreate}
        <Button onclick={() => navigation.create(resourceName)}>
          <Plus class="h-4 w-4" data-icon="inline-start" /> {i18n.t("common.create")}
        </Button>
      {/if}
    </div>
  </div>

  <!-- Active Filter Tags -->
  {#if showFilterTags && ((appliedSearchText || searchText).trim() || activeFilterItems.length > 0)}
    <div
      class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pt-0.5 border-y border-border py-2"
      aria-label={i18n.t('common.filterTags')}
      data-svadmin-active-filters
    >
      <span class="font-medium text-foreground">{i18n.t('common.filterTags')}:</span>
      {#if (appliedSearchText || searchText).trim()}
        <Badge variant="secondary" class="gap-1 pr-1 font-normal text-xs">
          <span>{i18n.t('common.search')}: "{(appliedSearchText || searchText).trim()}"</span>
          <button
            type="button"
            class="hover:text-foreground cursor-pointer inline-flex size-4 items-center justify-center rounded-sm"
            aria-label="{i18n.t('common.clear')}: {i18n.t('common.search')}"
            title="{i18n.t('common.clear')}: {i18n.t('common.search')}"
            onclick={() => { searchText = ""; appliedSearchText = ""; pagination = { ...pagination, current: 1 }; }}
          >
            <X class="size-3" />
          </button>
        </Badge>
      {/if}
      {#each activeFilterItems as item (`${item.label}-${item.index}`)}
        <Badge variant="outline" class="max-w-full gap-1 pr-1 font-normal">
          <span class="truncate">{item.label}</span>
          <button
            type="button"
            class="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            aria-label="{i18n.t('common.clear')}: {item.label}"
            title="{i18n.t('common.clear')}: {item.label}"
            onclick={() => removeActiveFilter(item.index)}
          >
            <X class="size-3" />
          </button>
        </Badge>
      {/each}
      <Button variant="ghost" size="sm" class="h-6 px-2 text-xs text-muted-foreground hover:text-foreground" onclick={clearFilters}>
        {i18n.t('common.clearAllFilters')}
      </Button>
    </div>
  {/if}

  <!-- Table (TanStack-powered) -->
  <div class="overflow-hidden rounded-lg border border-border bg-card shadow-sm" role="region" aria-label="{resource.label} {i18n.t('common.list')}" data-table-density={currentDensity}>
    {#if query.isLoading}
      <div class="p-4 space-y-3">
        <div class="flex gap-4 mb-2">
          {#each visibleFields.slice(0, 4) as _, _i (_i)}
            <Skeleton class="h-4 flex-1" />
          {/each}
        </div>
        {#each Array(5) as _, _i (_i)}
          <div class="flex gap-4">
            {#each visibleFields.slice(0, 4) as __, _i (_i)}
              <Skeleton class="h-8 flex-1" />
            {/each}
          </div>
        {/each}
      </div>
    {:else if query.error}
      <DataState
        state="error"
        description={i18n.t('common.loadFailed', { message: (query.error as Error).message })}
        retry={() => listResult.refetch()}
      />
    {:else}
      <div in:fade={{ duration: 150 }}>
        <!-- Desktop Table (hidden on mobile) -->
        <div class="hidden md:block">
        <Table.Root density={currentDensity}>
          <Table.Header>
            {#each tableView.headerGroups as headerGroup, _i (_i)}
              {@const visibleHeaders = headerGroup.headers.filter((header: Header<TableFeatures, BaseRecord, unknown>) => isColumnVisible(header.column.id))}
              <DraggableHeader
                columns={visibleHeaders.map((header) => ({ id: header.column.id, header }))}
                onReorder={setColumnOrder}
              >
                {#snippet header(col, _index, dragProps)}
                  {@const header = col.header as typeof headerGroup.headers[0]}
                  <Table.Head
                    {...dragProps}
                    class={cn('border-b border-border bg-muted/25 font-medium tracking-normal text-muted-foreground hover:bg-muted/40', dragProps.class)}
                    style={header_getSize(header) != null && header_getSize(header) !== 150 ? `width:${header_getSize(header)}px` : undefined}
                  >
                    {#if header.id === '_select'}
                      {#if batchActions}
                        <Checkbox
                          aria-label={i18n.t('common.selectAll')}
                          checked={table_getIsAllRowsSelected(tbl)}
                          onCheckedChange={toggleAllRowsSelection}
                        />
                      {:else}
                        <CanAccess resource={resourceName} action="delete" params={{ ids: tableView.rows.map(rowIdValue) }}>
                          <Checkbox
                            aria-label={i18n.t('common.selectAll')}
                            checked={table_getIsAllRowsSelected(tbl)}
                            onCheckedChange={toggleAllRowsSelection}
                          />
                        </CanAccess>
                      {/if}
                    {:else if header.id === '_expand'}
                      <!-- empty -->
                    {:else if header.id === '_actions'}
                      <span class="text-right block">{i18n.t('common.actions')}</span>
                    {:else if column_getCanSort(header.column)}
                      <Button
                        variant="ghost"
                        size="sm"
                        class="flex items-center gap-1 hover:text-foreground -ml-2 h-auto py-1 px-2 uppercase tracking-wide text-[0.7rem] font-semibold"
                        onclick={() => toggleColumnSort(header.column)}
                      >
                        {visibleFields.find(f => f.key === header.id)?.label ?? header.id}
                        <span class="text-xs opacity-50">
                          {#if column_getIsSorted(header.column) === 'asc'}↑
                          {:else if column_getIsSorted(header.column) === 'desc'}↓
                          {:else}⇅
                          {/if}
                        </span>
                      </Button>
                    {:else}
                      {visibleFields.find(f => f.key === header.id)?.label ?? header.id}
                    {/if}
                  </Table.Head>
                {/snippet}
              </DraggableHeader>
            {/each}
          </Table.Header>
          <Table.Body>
            {#each tableView.rows as row (row.id)}
              {@const record = row.original}
              {@const id = record[primaryKey] as string | number}
              {@const visibleCells = row_getVisibleCells(row).filter((cell) => isColumnVisible(cell.column.id))}
              <ContextMenu.Root>
                <ContextMenu.Trigger>
                  {#snippet child({ props })}
                    <Table.Row {...props} class="transition-all duration-300 border-b border-border/10 {rowIsSelected(row.id) ? 'bg-primary/5' : 'hover:bg-muted/20'}">
                      {#each visibleCells as cell, _i (_i)}
                        <Table.Cell>
                          {#if cell.column.id === '_select'}
                            {#if batchActions}
                              <Checkbox
                                aria-label={i18n.t('common.selectRow', { id })}
                                checked={rowIsSelected(row.id)}
                                onCheckedChange={() => toggleRowSelection(row)}
                              />
                            {:else}
                              <CanAccess resource={resourceName} action="delete" params={{ id }}>
                                <Checkbox
                                  aria-label={i18n.t('common.selectRow', { id })}
                                  checked={rowIsSelected(row.id)}
                                  onCheckedChange={() => toggleRowSelection(row)}
                                />
                              </CanAccess>
                            {/if}
                          {:else if cell.column.id === '_expand'}
                            <TooltipButton tooltip={rowIsExpanded(row.id) ? i18n.t('common.collapse') : i18n.t('common.expand')} variant="ghost" size="icon" class="h-7 w-7" onclick={() => toggleRowExpanded(row.id)}>
                              {#if rowIsExpanded(row.id)}
                                <ChevronUp class="h-4 w-4" />
                              {:else}
                                <ChevronDown class="h-4 w-4" />
                              {/if}
                            </TooltipButton>
                          {:else if cell.column.id === '_actions'}
                            <div class="flex items-center justify-end gap-1">
                              {#if rowActions}
                                {@render rowActions({ record, id })}
                              {:else}
                                {#if canShow}
                                  <CanAccess resource={resourceName} action="show" params={{ id }}>
                                    <TooltipButton tooltip={i18n.t('common.detail')} variant="ghost" size="icon-sm" onclick={() => openDetail(id)}>
                                      <Eye class="h-4 w-4" />
                                    </TooltipButton>
                                  </CanAccess>
                                {/if}
                                {#if canEdit}
                                  <CanAccess resource={resourceName} action="edit" params={{ id }}>
                                    <TooltipButton tooltip={i18n.t('common.edit')} variant="ghost" size="icon-sm" onclick={() => navigation.edit(resourceName, id)}>
                                      <Pencil class="h-4 w-4" />
                                    </TooltipButton>
                                  </CanAccess>
                                {/if}
                                {#if canDelete}
                                  <CanAccess resource={resourceName} action="delete" params={{ id }}>
                                    <TooltipButton tooltip={i18n.t('common.delete')} variant="ghost" size="icon-sm" onclick={() => confirmDelete(id)} class="hover:text-destructive">
                                      <Trash2 class="h-4 w-4" />
                                    </TooltipButton>
                                  </CanAccess>
                                {/if}
                              {/if}
                            </div>
                          {:else}
                            {@const field = visibleFields.find(f => f.key === cell.column.id)}
                            {#if customColumns && field && customColumns[field.key]}
                              {@render customColumns[field.key]({ value: cell_getValue(cell), record })}
                            {:else if defaultCellRenderer && field}
                              {@render defaultCellRenderer({ field, value: cell_getValue(cell), record })}
                            {:else if field?.type === 'boolean'}
                              <span class="inline-block h-2 w-2 rounded-full {cell_getValue(cell) ? 'bg-success' : 'bg-muted-foreground/30'}"></span>
                            {:else if field?.type === 'date' && cell_getValue(cell)}
                              {new Date(cell_getValue(cell) as string).toLocaleDateString()}
                            {:else if field?.type === 'tags' && Array.isArray(cell_getValue(cell))}
                              <div class="flex flex-wrap gap-1">
                                {#each (cell_getValue(cell) as string[]).slice(0, 3) as tag, _i (_i)}
                                  <Badge variant="secondary">{tag}</Badge>
                                {/each}
                              </div>
                            {:else if field?.type === 'select' && field.options}
                              {@const opt = field.options.find(o => o.value === cell_getValue(cell))}
                              <Badge variant="outline">{opt?.label ?? cell_getValue(cell) ?? '—'}</Badge>
                            {:else if canEdit && field && ['text', 'number', 'email', 'url'].includes(field.type)}
                              <CanAccess resource={resourceName} action="edit" params={{ id }}>
                                <InlineEdit
                                  {resourceName}
                                  recordId={id}
                                  {field}
                                  value={cell_getValue(cell)}
                                  onSave={() => listResult.refetch()}
                                />
                                {#snippet fallback()}
                                  <span class="block truncate" title={String(cell_getValue(cell) ?? '—')}>{cell_getValue(cell) ?? '—'}</span>
                                {/snippet}
                              </CanAccess>
                            {:else if field?.key === primaryKey}
                              <span class="block truncate font-mono text-xs" title={String(cell_getValue(cell) ?? '—')}>{cell_getValue(cell) ?? '—'}</span>
                            {:else}
                              <span class="block truncate" title={String(cell_getValue(cell) ?? '—')}>{cell_getValue(cell) ?? '—'}</span>
                            {/if}
                          {/if}
                        </Table.Cell>
                      {/each}
                    </Table.Row>
                  {/snippet}
                </ContextMenu.Trigger>
                <ContextMenu.Content class="w-48">
                  {#if canEdit}
                    <CanAccess resource={resourceName} action="edit" params={{ id }}>
                      <ContextMenu.Item onclick={() => navigation.edit(resourceName, id)} class="gap-2">
                        <Pencil class="h-4 w-4" /> {i18n.t('common.edit')}
                      </ContextMenu.Item>
                    </CanAccess>
                  {/if}
                  {#if canShow}
                    <CanAccess resource={resourceName} action="show" params={{ id }}>
                      <ContextMenu.Item onclick={() => openDetail(id)} class="gap-2">
                        <Eye class="h-4 w-4" /> {i18n.t('common.detail')}
                      </ContextMenu.Item>
                    </CanAccess>
                  {/if}
                  <ContextMenu.Item onclick={() => navigator.clipboard?.writeText(String(id))} class="gap-2">
                    <Copy class="h-4 w-4" /> {i18n.t('common.copyId')}
                  </ContextMenu.Item>
                  {#if canDelete}
                    <CanAccess resource={resourceName} action="delete" params={{ id }}>
                      <ContextMenu.Separator />
                      <ContextMenu.Item onclick={() => confirmDelete(id)} class="gap-2 text-destructive">
                        <Trash2 class="h-4 w-4" /> {i18n.t('common.delete')}
                      </ContextMenu.Item>
                    </CanAccess>
                  {/if}
                </ContextMenu.Content>
              </ContextMenu.Root>
              {#if expandedRowRender && rowIsExpanded(row.id)}
                <Table.Row class="bg-muted/10 border-b border-border/10 transition-all">
                  <Table.Cell colspan={visibleCells.length}>
                    {@render expandedRowRender({ record })}
                  </Table.Cell>
                </Table.Row>
              {/if}
            {:else}
              <Table.Row>
                <Table.Cell colspan={columns.length} class="h-48 text-center">
                  {#if emptyState}
                    {@render emptyState()}
                  {:else}
                    <div class="flex flex-col items-center justify-center py-8">
                      <svg class="h-16 w-16 text-muted-foreground/30 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p class="text-sm font-medium text-muted-foreground mb-1">{i18n.t('common.noData')}</p>
                      <p class="text-xs text-muted-foreground/60 mb-4">{i18n.t('common.noDataHint')}</p>
                      {#if canCreate}
                        <Button variant="outline" size="sm" class="gap-2" onclick={() => navigation.create(resourceName)}>
                          <Plus class="h-3.5 w-3.5" />
                          {i18n.t('common.create')}
                        </Button>
                      {/if}
                    </div>
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
        </div>

        <!-- Mobile Card View (visible only on small screens) -->
        <div class="md:hidden space-y-3 p-2">
          {#each tableView.rows as row, _i (_i)}
            {@const record = row.original}
            {@const id = record[primaryKey] as string | number}
            <div
              class="rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] ring-1 ring-border/20 bg-card p-5 transition-all {rowIsSelected(row.id) ? 'ring-2 ring-primary/50 bg-primary/5' : ''}"
            >
              <!-- Card header: ID + select + actions -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  {#if selectable && (canDelete || batchActions)}
                    {#if batchActions}
                      <Checkbox
                        aria-label={i18n.t('common.selectRow', { id })}
                        checked={rowIsSelected(row.id)}
                        onCheckedChange={() => toggleRowSelection(row)}
                      />
                    {:else}
                      <CanAccess resource={resourceName} action="delete" params={{ id }}>
                        <Checkbox
                          aria-label={i18n.t('common.selectRow', { id })}
                          checked={rowIsSelected(row.id)}
                          onCheckedChange={() => toggleRowSelection(row)}
                        />
                      </CanAccess>
                    {/if}
                  {/if}
                  <span class="text-xs font-mono text-muted-foreground">#{id}</span>
                </div>
                <div class="flex items-center gap-1">
                  {#if rowActions}
                    {@render rowActions({ record, id })}
                  {:else}
                    {#if canEdit}
                      <CanAccess resource={resourceName} action="edit" params={{ id }}>
                        <TooltipButton tooltip={i18n.t('common.edit')} variant="ghost" size="icon-sm" onclick={() => navigation.edit(resourceName, id)}>
                          <Pencil class="h-4 w-4" />
                        </TooltipButton>
                      </CanAccess>
                    {/if}
                    {#if canShow}
                      <CanAccess resource={resourceName} action="show" params={{ id }}>
                        <TooltipButton tooltip={i18n.t('common.detail')} variant="ghost" size="icon-sm" onclick={() => openDetail(id)}>
                          <Eye class="h-4 w-4" />
                        </TooltipButton>
                      </CanAccess>
                    {/if}
                    {#if canDelete}
                      <CanAccess resource={resourceName} action="delete" params={{ id }}>
                        <TooltipButton tooltip={i18n.t('common.delete')} variant="ghost" size="icon-sm" onclick={() => confirmDelete(id)} class="hover:text-destructive">
                          <Trash2 class="h-4 w-4" />
                        </TooltipButton>
                      </CanAccess>
                    {/if}
                  {/if}
                </div>
              </div>
              <!-- Card fields -->
              <div class="space-y-2">
                {#each visibleFields.filter((field) => isColumnVisible(field.key)).slice(0, 6) as field (field.key)}
                  {@const value = record[field.key]}
                  <div class="flex items-start justify-between gap-4">
                    <span class="text-xs font-medium text-muted-foreground shrink-0">{field.label}</span>
                    <span class="text-sm text-right truncate max-w-[60%]">
                      {#if customColumns && field && customColumns[field.key]}
                        {@render customColumns[field.key]({ value, record })}
                      {:else if defaultCellRenderer && field}
                        {@render defaultCellRenderer({ field, value, record })}
                      {:else if field.type === 'boolean'}
                        <span class="inline-block h-2 w-2 rounded-full {value ? 'bg-success' : 'bg-muted-foreground/30'}"></span>
                      {:else if field.type === 'date' && value}
                        {new Date(value as string).toLocaleDateString()}
                      {:else if field.type === 'tags' && Array.isArray(value)}
                        <div class="flex flex-wrap gap-1 justify-end">
                          {#each (value as string[]).slice(0, 2) as tag, _i (_i)}
                            <Badge variant="secondary" class="text-[10px]">{tag}</Badge>
                          {/each}
                        </div>
                      {:else if field.type === 'select' && field.options}
                        {@const opt = field.options.find(o => o.value === value)}
                        <Badge variant="outline" class="text-[10px]">{opt?.label ?? value ?? '—'}</Badge>
                      {:else}
                        {value ?? '—'}
                      {/if}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="text-center py-10 text-muted-foreground">
              {#if emptyState}
                {@render emptyState()}
              {:else}
                <DataState state="empty" class="border-0 bg-transparent px-2 py-4" />
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Pagination (shadcn) -->
  {#if totalPages > 0}
  <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-2 text-sm text-muted-foreground">
    <div class="flex shrink-0 items-center gap-3 leading-8">
      <span class="shrink-0 whitespace-nowrap">{i18n.t('common.total', { total: query.data?.total ?? 0 })}</span>
      <Select.Root
        aria-label={i18n.t('common.perPage')}
        class="h-8 w-[78px] shrink-0"
        value={String(pagination.pageSize ?? 10)}
        onchange={(e) => {
          const size = Number((e.currentTarget as HTMLSelectElement).value);
          if (!isNaN(size)) {
            markSavedViewDirty();
            pagination = { ...pagination, pageSize: size, current: 1 };
          }
        }}
      >
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </Select.Root>
    </div>
    <PaginationUI.Root>
      <PaginationUI.Content>
        <PaginationUI.Item>
          <PaginationUI.Previous
            onclick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          />
        </PaginationUI.Item>
        {#each pages as page, _i (_i)}
          <PaginationUI.Item>
            {#if page === '...'}
              <PaginationUI.Ellipsis />
            {:else}
              <PaginationUI.Link
                isActive={page === currentPage}
                onclick={() => goToPage(page as number)}
              >
                {page}
              </PaginationUI.Link>
            {/if}
          </PaginationUI.Item>
        {/each}
        <PaginationUI.Item>
          <PaginationUI.Next
            onclick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          />
        </PaginationUI.Item>
      </PaginationUI.Content>
    </PaginationUI.Root>
  </div>
  {/if}
</div>

<ConfirmDialog
  open={confirmOpen}
  message={confirmMessage}
  confirmText={i18n.t('common.delete')}
  confirming={confirmPending}
  onconfirm={confirmAction}
  oncancel={() => { confirmOpen = false; }}
/>

{#if detailRecordId != null}
  <RecordDetailDrawer
    resourceName={resourceName}
    open={detailOpen}
    recordId={detailRecordId}
    onClose={closeDetail}
  />
{/if}
