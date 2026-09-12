<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

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

  import { captureAdminContext, DeleteManyPartialError, getContractFormFields, useNavigation, useParsed, useResourceContract, useList, useDeleteMany, downloadData } from '@svadmin/core';
  import { decodeBaseRecord, snapshotPlainData, parseContractRouteId, formatContractRouteId } from '@svadmin/core/schema';
  import { checkedTableRows, copyTableRecord, tableExportRows, tableRowKey, type TableRecord } from './table-contract';
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
  import FieldDisplay from './FieldDisplay.svelte';
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
    /** Summary row rendered at table footer */
    summary?: Snippet<[{ data: BaseRecord[]; total: number; visibleColumnsCount: number }]>;
    deleteVariables?: unknown;
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
    summary,
    pagination: externalPagination,
    sorters: externalSorters,
    deleteVariables,
  }: Props = $props();

  let densityOverride = $state<'compact' | 'comfortable' | undefined>(undefined);
  const currentDensity = $derived(densityOverride ?? density);
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const navigation = useNavigation();

  const binding = useResourceContract(() => resourceName);
  const resource = $derived(adminContext.getResource(resourceName));
  const primaryKey = $derived(resource.primaryKey ?? 'id');
  const listPermission = useCan(() => ({ resource: resourceName, action: 'list' }));
  const canRead = $derived(listPermission.allowed);
  const listPreferenceScope = $derived.by(() => {
    const matcher = adminContext.queryKeyMatcher(resourceName);
    return definedOptions({
      resourceName,
      providerName: matcher.provider ?? 'default',
      tenantIdentity: matcher.tenant,
    });
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

  const savedViewColumnIds = $derived(new Set([
    ...resource.fields.map((field) => field.key),
    '_select', '_expand', '_actions',
  ]));
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
          for (const [columnId, visible] of Object.entries(decodeBaseRecord(parsed))) {
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
        ? [...new Set(parsed.filter((columnId: unknown): columnId is string => (
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
    return definedOptions({
      savedViews: scopedSavedViews,
      activeSavedViewId: activeSavedView?.id,
      activeSavedView,
      columnVisibility: readColumnVisibilityPreference(scope),
      columnOrder: readColumnOrderPreference(scope),
    });
  }

  // Snapshot resource values for initial state (untrack to avoid reactive tracking)
  const storedPageSize = parseInt(readLocalPreference('svadmin-default-page-size') ?? '', 10);
  const initPageSize = $derived(resource.pageSize ?? (Number.isSafeInteger(storedPageSize) && storedPageSize > 0 ? storedPageSize : 10));
  const initDefaultSort = $derived(resource.defaultSort);

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
  const editableFilterKeys = $derived(new Set(resource.fields.filter((field) => field.filterable).map((field) => field.key)));
  const editableFilterCounts: Record<string, number> = {};
  for (const filter of initialURLFilters) {
    if ('field' in filter && filter.operator === 'contains' && typeof filter.value === 'string' && untrack(() => editableFilterKeys.has(filter.field))) {
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
    if (!(event.currentTarget instanceof HTMLInputElement)) return;
    searchText = event.currentTarget.value;
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
      const firstSearchableField = searchableFields[0];
      if (searchableFields.length === 1 && firstSearchableField) {
        result.push({ field: firstSearchableField.key, operator: 'contains', value: appliedSearchText });
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

  function setFilterFromEvent(field: string, event: Event): void {
    if (event.currentTarget instanceof HTMLInputElement || event.currentTarget instanceof HTMLSelectElement) {
      setFilterValue(field, event.currentTarget.value);
    }
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
      const remainingFilter = remaining[0];
      filterValues[filter.field] = remaining.length === 1 && remainingFilter && 'field' in remainingFilter
        ? String(remainingFilter.value)
        : '';
    }
    pagination = { ...pagination, current: 1 };
  }

  function clonePlainValue(value: unknown): unknown {
    return value === undefined ? undefined : snapshotPlainData(value);
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

  const queryPagination = $derived<PaginationState>(definedOptions({
    current: pagination.current,
    pageSize: pagination.pageSize,
    mode: pagination.mode,
  }));
  const querySorters = $derived<Sort[]>(sorters.map(sorter => ({
    field: sorter.field,
    order: sorter.order,
  })));
  const queryFilters = $derived<Filter[]>(activeFilters.map(cloneFilter));

  // ─── Data fetching ────────────────────────────────────────────
  const listResult = useList({
    get resource() { return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
    get queryOptions() { return { enabled: canRead }; },
    get pagination() { return queryPagination; },
    get sorters() { return querySorters; },
    get filters() { return queryFilters; },
  });
  const query = listResult;
  const pageRecords = $derived.by(() => {
    try { return { ok: true as const, data: canRead ? checkedTableRows(query.data?.data ?? []) : [] }; }
    catch { return { ok: false as const, data: [] }; }
  });
  let deleteRequest = $state<{ ids: (string | number)[]; batch: boolean } | null>(null);
  const deletePermission = useCan(() => definedOptions({
    resource: resourceName, action: 'delete',
    id: deleteRequest?.batch === false ? deleteRequest.ids[0] : undefined,
    params: deleteRequest?.batch ? { ids: deleteRequest.ids } : undefined,
    queryOptions: { enabled: deleteRequest !== null },
  }));
  const deleteAllowed = $derived(canRead && resource.canDelete !== false && deleteRequest !== null && deletePermission.allowed);
  const deleteManyResult = useDeleteMany({
    get resource() { return binding.resource; },
    get enabled() { return deleteAllowed; },
  });
  const deleteManyMutation = deleteManyResult.mutation;

  // ─── Permissions ──────────────────────────────────────────────
  const acEnabled = $derived(!!adminContext.accessControlProvider);
  const canCreatePerm = useCan(() => ({ resource: resourceName, action: 'create', queryOptions: { enabled: acEnabled } }));
  const canExportPerm = useCan(() => ({ resource: resourceName, action: 'export', queryOptions: { enabled: acEnabled } }));
  const canCreate = $derived(resource.canCreate !== false && (!acEnabled || canCreatePerm.allowed));
  const canEdit = $derived(resource.canEdit !== false);
  const writableFields = $derived.by(() => {
    try { return new Set(getContractFormFields(binding.resource, 'edit')); }
    catch { return new Set<string>(); }
  });
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
  const rowSelectionAtom = createAtom<RowSelectionState>({});
  const expandedAtom = createAtom<ExpandedState>({});
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

  function rowIdValue(row: Row<TableFeatures, TableRecord>): string | number {
    return row.original.id;
  }

  function toggleRowSelection(row: Row<TableFeatures, TableRecord>): void {
    if (confirmPending || !canRead) return;
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
    selectedIdValueByKey.clear();
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
      selectedIdValueByKey.clear();
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

  function toggleColumnSort(column: Column<TableFeatures, TableRecord, unknown>): void {
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

  const columns = $derived<ColumnDef<TableFeatures, TableRecord, unknown>[]>([
    // Selection column
    ...(selectable && (canDelete || batchActions) ? [{
      id: '_select',
      header: () => '',
      cell: () => '',
      size: 40,
      enableSorting: false,
    } satisfies ColumnDef<TableFeatures, TableRecord, unknown>] : []),
    // Expand column
    ...(expandedRowRender ? [{
      id: '_expand',
      header: () => '',
      cell: () => '',
      size: 40,
      enableSorting: false,
    } satisfies ColumnDef<TableFeatures, TableRecord, unknown>] : []),
    // Data columns
    ...visibleFields.map((field): ColumnDef<TableFeatures, TableRecord, unknown> => (definedOptions({
      id: field.key,
      accessorKey: field.key,
      header: () => field.label,
      size: field.width ? parseInt(String(field.width)) : undefined,
    }))),
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
  const tbl = createTable<TableFeatures, TableRecord>(
    {
      features,
      get data() { return pageRecords.data; },
      get columns() { return orderedColumns; },
      manualSorting: true,
      getRowId: (row: TableRecord) => tableRowKey(row.id),
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
    if (confirmPending || !canRead) return;
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
    Object.keys(tableRowSelection.current).filter(key => tableRowSelection.current[key] === true)
      .flatMap(key => {
        const id = selectedIdValueByKey.get(key);
        return id === undefined ? [] : [id];
      })
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

  const totalPages = $derived(canRead && pageRecords.ok && !query.isError
    ? Math.ceil((query.data?.total ?? 0) / (pagination.pageSize ?? 10)) : 0);

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
  let confirmPending = $state(false);
  let operationError = $state<string | null>(null);
  let activeDelete: object | undefined;
  let detailOpenedInHistory = $state(false);
  const tableScope = $derived({
    contract: binding.resource, resourceName, provider: adminContext.providers?.[binding.dataProviderName],
    meta: JSON.stringify(binding.meta), tenant: adminContext.tenantCacheKey?.__svadminTenant,
    auth: adminContext.authProvider, router: adminContext.routerProvider,
    permissionProvider: adminContext.accessControlProvider, canRead, canDelete,
    variables: deleteVariables,
  });
  let previousTableScope: typeof tableScope | undefined;
  const detailState = $derived.by(() => {
    const route = parsed.params['detail'];
    if (route === undefined || !canRead) return { id: undefined, invalid: false };
    try { return { id: parseContractRouteId(binding.resource, route), invalid: false }; }
    catch { return { id: undefined, invalid: true }; }
  });
  const detailRecordId = $derived(detailState.id);
  const detailOpen = $derived(detailRecordId != null);
  $effect.pre(() => {
    const scope = tableScope;
    if (previousTableScope && previousTableScope !== scope) {
      activeDelete = undefined;
      confirmOpen = false;
      confirmPending = false;
      deleteRequest = null;
      operationError = null;
      selectedIdValueByKey.clear();
      rowSelectionAtom.set({});
      expandedAtom.set({});
      detailOpenedInHistory = false;
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = undefined;
      if (previousTableScope.resourceName !== scope.resourceName) resetToDefaultListState();
    }
    previousTableScope = scope;
  });
  $effect(() => {
    if (deleteRequest && !deletePermission.isLoading && !deletePermission.allowed) {
      confirmOpen = false;
      deleteRequest = null;
      operationError = i18n.t('common.operationFailed');
    }
  });
  onDestroy(() => { activeDelete = undefined; });

  function confirmDelete(id: string | number) {
    if (!canRead || !pageRecords.ok || query.isError || !canDelete || confirmPending) return;
    confirmMessage = i18n.t('common.deleteConfirm');
    deleteRequest = { ids: [id], batch: false };
    operationError = null;
    confirmOpen = true;
  }

  function confirmBatchDelete() {
    const ids = [...selectedIds];
    if (!canRead || !pageRecords.ok || query.isError || !canBatchDelete || ids.length === 0 || confirmPending) return;
    confirmMessage = i18n.t('common.batchDeleteConfirm', { count: ids.length });
    deleteRequest = { ids, batch: true };
    operationError = null;
    confirmOpen = true;
  }

  async function confirmAction() {
    if (!confirmOpen || !pageRecords.ok || query.isError || !deleteAllowed || confirmPending || !deleteRequest) return;
    const request = deleteRequest;
    if (request.batch && JSON.stringify(request.ids) !== JSON.stringify(selectedIds)) {
      confirmOpen = false;
      deleteRequest = null;
      return;
    }
    const scope = tableScope;
    const token = {};
    activeDelete = token;
    confirmPending = true;
    const current = () => activeDelete === token && tableScope === scope && deleteAllowed;
    try {
      await deleteManyMutation.mutateAsync({
        ids: [...request.ids],
        ...definedOptions({ variables: deleteVariables, dataProviderName: binding.dataProviderName }),
      });
      if (!current()) return;
      for (const id of request.ids) selectedIdValueByKey.delete(tableRowKey(id));
      rowSelectionAtom.set(Object.fromEntries(Object.entries(tableRowSelection.current)
        .filter(([key]) => selectedIdValueByKey.has(key))));
      confirmOpen = false;
    } catch (error) {
      if (!current()) return;
      if (error instanceof DeleteManyPartialError) {
        for (const id of error.succeededIds) selectedIdValueByKey.delete(tableRowKey(id));
        rowSelectionAtom.set(Object.fromEntries(error.failedIds.map(id => [tableRowKey(id), true as const])));
        operationError = i18n.t('common.batchDeletePartialFail', { failed: error.failedIds.length, total: request.ids.length });
      } else operationError = i18n.t('common.operationFailed');
      confirmOpen = false;
    } finally {
      if (activeDelete === token) { activeDelete = undefined; confirmPending = false; deleteRequest = null; }
    }
  }

  function openDetail(id: string | number): void {
    if (!canRead || !canShow) return;
    detailOpenedInHistory = true;
    writeURLState({ detailId: formatContractRouteId(binding.resource, id) }, adminContext, 'push');
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
    if (!canRead || !canExport || !pageRecords.ok || query.isError || query.isFetching || !pageRecords.data.length) return;
    try {
      const exportFields = table_getAllLeafColumns(tbl).flatMap(column => {
        const field = visibleFields.find(field => field.key === column.id);
        return field && isColumnVisible(field.key) ? [field] : [];
      });
      if (!exportFields.length) return;
      const rows = tableExportRows(pageRecords.data, exportFields);
      downloadData(rows, resourceName, 'csv');
    } catch { operationError = i18n.t('common.operationFailed'); }
  }

  function goToPage(page: number) {
    if (!Number.isSafeInteger(page) || page < 1 || page > Math.max(1, totalPages)) return;
    markSavedViewDirty();
    pagination = { ...pagination, current: page };
  }
  function refreshList() {
    if (canRead && !query.isFetching) void listResult.refetch();
  }
</script>

<div class="svadmin-u-6ed543e2fbbb">
  {#if operationError}<p role="alert">{operationError}</p>{/if}
  {#if detailState.invalid}<p role="alert">{i18n.t('common.operationFailed')}</p>{/if}  {#if showHeader}
    <!-- Header -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4">
      <h1 class="svadmin-u-42536e69e639 svadmin-u-998e0b29fe9e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{title ?? resource.label}</h1>
      <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        {#if canExport}
          <Button variant="outline" size="sm" onclick={exportCSV}>
            <Download class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" /> {i18n.t("common.export")}
          </Button>
        {/if}
        {#if headerActions}
          {@render headerActions()}
        {/if}
        {#if canCreate}
          <Button onclick={() => navigation.create(resourceName)}>
            <Plus class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" /> {i18n.t("common.create")}
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Selection Banner (Enterprise Batch Actions) -->
  {#if selectedCount > 0}
    <div
      class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-ca6bcd4b6f3f svadmin-u-a6afccfc915b svadmin-u-375dc44df6e9 svadmin-u-e0d9cc7f0647 svadmin-u-03b4dd7f172b svadmin-u-5f22e64f2282 svadmin-u-fc7473ca09eb svadmin-u-d4108abe6359 svadmin-u-40137e897961 fade-in svadmin-u-625a4c3fbeb2 svadmin-u-259ce51fc8f3 svadmin-u-020ba687fa12 svadmin-u-9f76a62f4f44 svadmin-u-3b9871a0bf93"
      aria-label={i18n.t("common.selectedCount", { count: selectedCount })}
      data-svadmin-batch-toolbar
    >
      <div class="svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-fc7473ca09eb">
        <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-3032cae0badb">{i18n.t("common.selectedCount", { count: selectedCount })}</span>
        {#if deleteManyMutation.isPending}
          <span class="svadmin-u-bfa603190748" role="status">{i18n.t("common.processing")}</span>
        {/if}
      </div>
      <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        {#if batchActions}
          {@render batchActions({ selectedIds })}
        {/if}
        {#if canBatchDelete}
          <Button
            variant="destructive"
            size="sm"
            class="svadmin-u-ed8a5df7b2fb svadmin-u-359090c2d529 svadmin-u-e82ae8be04aa"
            disabled={deleteManyMutation.isPending}
            onclick={confirmBatchDelete}
          >
            <Trash2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" data-icon="inline-start" aria-hidden="true" /> {i18n.t("common.batchDelete", { count: selectedCount })}
          </Button>
        {/if}
        <Button
          variant="ghost"
          size="sm"
          class="svadmin-u-ed8a5df7b2fb svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e"
          disabled={deleteManyMutation.isPending}
          onclick={clearSelection}
        >
          {i18n.t("common.clearSelection")}
        </Button>
      </div>
    </div>
  {/if}

  <!-- Search, Filter & Table Utility Toolbar -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4">
    <!-- Left: Search and Advanced Filters -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-36e579c0b41c svadmin-u-c614099df7f7">
      {#if searchableFields.length > 0}
        <div class="svadmin-u-d89972fe17d6 svadmin-u-2472e9b81a97 svadmin-u-36e579c0b41c svadmin-u-c80f3ab59fae">
          <Search class="svadmin-u-da4dbfbc4fdc svadmin-u-22e59b722111 svadmin-u-d694ba66e322 svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-36b381be4df3 svadmin-u-bfa603190748" aria-hidden="true" />
          <Input
            type="text"
            value={searchText}
            oninput={scheduleSearch}
            placeholder={i18n.t("common.search")}
            class="svadmin-u-9e83b2412bc9 svadmin-u-e7a768f922d2 svadmin-u-fc7473ca09eb"
          />
        </div>
      {/if}

      {#if filterableFields.length > 0}
        <Popover.Root>
          <Popover.Trigger>
            {#snippet child({ props })}
              <Button variant="outline" size="sm" class="svadmin-u-e7a768f922d2 svadmin-u-0e17f2bd9074" {...props}>
                <FilterIcon class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" aria-hidden="true" />
                {i18n.t("common.filter")}
                {#if activeFilterCount > 0}
                  <Badge variant="secondary" class="svadmin-u-f58b02572ab2 svadmin-u-cd0d9c512cdc svadmin-u-f8516763aedd svadmin-u-d8e0e382c67b svadmin-u-3032cae0badb">{activeFilterCount}</Badge>
                {/if}
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="svadmin-u-7ab81aede9d8">
            <div class="svadmin-u-6ed543e2fbbb">
              <h4 class="svadmin-u-2689f3958069 svadmin-u-fc7473ca09eb">{i18n.t("common.filter")}</h4>
              {#each filterableFields as field, _i (_i)}
                <div class="svadmin-u-da7c36cd8867">
                  <label class="svadmin-u-359090c2d529 svadmin-u-bfa603190748" for="filter-{field.key}">{field.label}</label>
                  {#if field.type === "select" && field.options}
                    <Select.Root
                      id="filter-{field.key}"
                      class="svadmin-u-e7a768f922d2 svadmin-u-fc7473ca09eb"
                      value={filterValues[field.key] ?? ""}
                      onchange={(e: Event) => setFilterFromEvent(field.key, e)}
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
                      oninput={(e: Event) => setFilterFromEvent(field.key, e)}
                      placeholder={field.label}
                      class="svadmin-u-e7a768f922d2 svadmin-u-fc7473ca09eb"
                    />
                  {/if}
                </div>
              {/each}
              <div class="svadmin-u-60fbb7713999 svadmin-u-77a2a20e90d4 svadmin-u-f46b61a9b310">
                <Button size="sm" class="svadmin-u-36e579c0b41c" onclick={() => { pagination = { ...pagination, current: 1 }; }}>
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
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-012fbd121f37">
      {#if !showHeader && canExport}
        <TooltipButton tooltip={i18n.t("common.export")} variant="outline" size="sm" class="svadmin-u-e7a768f922d2 svadmin-u-0b91436debbd" onclick={exportCSV}>
          <Download class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" aria-hidden="true" />
        </TooltipButton>
      {/if}

      {#if showDensitySwitcher}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props }: { props: Record<string, unknown> })}              <TooltipButton tooltip={i18n.t("common.density")} variant="outline" size="sm" class="svadmin-u-e7a768f922d2 svadmin-u-0b91436debbd" {...props}>
                <Rows class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" aria-hidden="true" />
              </TooltipButton>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="svadmin-u-df403bbae8fc">
            <DropdownMenu.Item onclick={() => { densityOverride = "comfortable"; }} class={currentDensity === "comfortable" ? "svadmin-u-e83a7042bc91 svadmin-u-20aaf08a7ed1" : ""}>
              {i18n.t("common.densityComfortable")}
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => { densityOverride = "compact"; }} class={currentDensity === "compact" ? "svadmin-u-e83a7042bc91 svadmin-u-20aaf08a7ed1" : ""}>
              {i18n.t("common.densityCompact")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}

      <!-- Column Visibility Picker -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props }: { props: Record<string, unknown> })}            <TooltipButton tooltip={i18n.t("common.columns")} variant="outline" size="sm" class="svadmin-u-e7a768f922d2 svadmin-u-0b91436debbd" {...props}>
              <SlidersHorizontal class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
            </TooltipButton>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="svadmin-u-74b2435a1d40">
          {#each table_getAllLeafColumns(tbl).filter((column) => !column.id.startsWith("_")) as column, _i (_i)}
            <DropdownMenu.CheckboxItem
              checked={tableColumnVisibility.current[column.id] ?? true}
              onCheckedChange={(v: boolean) => setColumnVisibility(column.id, v)}
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
            <Button variant="outline" size="sm" class="svadmin-u-e7a768f922d2 svadmin-u-0b91436debbd" {...props} aria-label={i18n.t("common.savedViews")}>
              <Bookmark class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" /> {activeSavedViewName ?? i18n.t("common.savedViews")}
            </Button>
          {/snippet}
        </Popover.Trigger>
        <Popover.Content align="end" class="svadmin-u-7ab81aede9d8">
          <div class="svadmin-u-6ed543e2fbbb">
            <div>
              <h4 class="svadmin-u-2689f3958069 svadmin-u-fc7473ca09eb">{i18n.t("common.savedViews")}</h4>
              <p class="svadmin-u-b6b02c0ebef6 svadmin-u-359090c2d529 svadmin-u-bfa603190748">{i18n.t("common.savedViewsHint")}</p>
            </div>
            <div class="svadmin-u-da7c36cd8867">
              <label class="svadmin-u-359090c2d529 svadmin-u-bfa603190748" for="saved-list-view">{i18n.t("common.currentView")}</label>
              <Select.Root
                id="saved-list-view"
                class="svadmin-u-e7a768f922d2 svadmin-u-6da6a3c3f741"
                value={activeSavedViewId ?? ""}
                onchange={(event: Event) => {
                  if (!(event.currentTarget instanceof HTMLSelectElement)) return;
                  const id = event.currentTarget.value;
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
            <div class="svadmin-u-60fbb7713999 svadmin-u-77a2a20e90d4">
              <Input
                aria-label={i18n.t("common.viewName")}
                placeholder={i18n.t("common.viewName")}
                maxlength={60}
                bind:value={savedViewName}
                class="svadmin-u-e7a768f922d2"
              />
              <Button size="sm" class="svadmin-u-012fbd121f37" disabled={!savedViewName.trim()} onclick={saveCurrentView}>
                <Check class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" /> {i18n.t("common.saveView")}
              </Button>
            </div>
            {#if savedViews.length > 0}
              <div class="svadmin-u-da7c36cd8867 svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-f46b61a9b310">
                {#each savedViews as view (view.id)}
                  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-fc7473ca09eb">
                    <span class="svadmin-u-7e0b7cdf1a94 svadmin-u-f283ea9bea0e">{view.name}</span>
                    <button
                      type="button"
                      class="svadmin-u-52083e7da442 svadmin-u-cc46d0fa277d svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-bfa603190748 svadmin-u-8e551981c8d7 svadmin-u-ea7b2e9e070e svadmin-u-f10f771f87e9 svadmin-u-793c80e97ffb svadmin-u-9c1295a6914a"
                      aria-label="{i18n.t("common.delete")} {view.name}"
                      title="{i18n.t("common.delete")} {view.name}"
                      onclick={() => deleteSavedView(view.id)}
                    >
                      <Trash2 class="svadmin-u-783b0d9d1e2c" />
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
          class="svadmin-u-e7a768f922d2 svadmin-u-0b91436debbd"
          onclick={refreshList}        >
          <RefreshCw class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 {query.isFetching ? "svadmin-u-afbdd13a380e" : ""}" />
        </TooltipButton>
      {/if}

      {#if !showHeader && canCreate}
        <Button onclick={() => navigation.create(resourceName)}>
          <Plus class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" /> {i18n.t("common.create")}
        </Button>
      {/if}
    </div>
  </div>

  <!-- Active Filter Tags -->
  {#if showFilterTags && ((appliedSearchText || searchText).trim() || activeFilterItems.length > 0)}
    <div
      class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-087ea857932e svadmin-u-8b8196092091 svadmin-u-18049387f0af svadmin-u-03b4dd7f172b"
      aria-label={i18n.t('common.filterTags')}
      data-svadmin-active-filters
    >
      <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{i18n.t('common.filterTags')}:</span>
      {#if (appliedSearchText || searchText).trim()}
        <Badge variant="secondary" class="svadmin-u-44ee8ba0a421 svadmin-u-eda955402ba6 svadmin-u-8ecebc9f80e6 svadmin-u-359090c2d529">
          <span>{i18n.t('common.search')}: "{(appliedSearchText || searchText).trim()}"</span>
          <button
            type="button"
            class="svadmin-u-ea7b2e9e070e svadmin-u-34516836730d svadmin-u-52083e7da442 svadmin-u-f7b5fa971871 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-36d4469299aa"
            aria-label="{i18n.t('common.clear')}: {i18n.t('common.search')}"
            title="{i18n.t('common.clear')}: {i18n.t('common.search')}"
            onclick={() => { searchText = ""; appliedSearchText = ""; pagination = { ...pagination, current: 1 }; }}
          >
            <X class="svadmin-u-ef2d6f74d3d0" />
          </button>
        </Badge>
      {/if}
      {#each activeFilterItems as item (`${item.label}-${item.index}`)}
        <Badge variant="outline" class="svadmin-u-c0980a65a70d svadmin-u-44ee8ba0a421 svadmin-u-eda955402ba6 svadmin-u-8ecebc9f80e6">
          <span class="svadmin-u-f283ea9bea0e">{item.label}</span>
          <button
            type="button"
            class="svadmin-u-52083e7da442 svadmin-u-add63bc6753d svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-36d4469299aa svadmin-u-bfa603190748 svadmin-u-8e551981c8d7 svadmin-u-ea7b2e9e070e svadmin-u-f10f771f87e9 svadmin-u-793c80e97ffb svadmin-u-9c1295a6914a svadmin-u-34516836730d"
            aria-label="{i18n.t('common.clear')}: {item.label}"
            title="{i18n.t('common.clear')}: {item.label}"
            onclick={() => removeActiveFilter(item.index)}
          >
            <X class="svadmin-u-ef2d6f74d3d0" />
          </button>
        </Badge>
      {/each}
      <Button variant="ghost" size="sm" class="svadmin-u-f6fe902450dc svadmin-u-d5eab218aa34 svadmin-u-359090c2d529 svadmin-u-bfa603190748 svadmin-u-ea7b2e9e070e" onclick={clearFilters}>
        {i18n.t('common.clearAllFilters')}
      </Button>
    </div>
  {/if}

  <!-- Table (TanStack-powered) -->
  <div class="svadmin-u-2cd02d11d1af svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-438b2237b8d6" role="region" aria-label="{resource.label} {i18n.t('common.list')}" data-table-density={currentDensity}>
    {#if query.isLoading || listPermission.isLoading}      <div class="svadmin-u-8e63407b5ceb svadmin-u-6ed543e2fbbb">
        <div class="svadmin-u-60fbb7713999 svadmin-u-0c3bc98565dd svadmin-u-a77ed4d908c0">
          {#each visibleFields.slice(0, 4) as _, _i (_i)}
            <Skeleton class="svadmin-u-11e59c6d5f6b svadmin-u-36e579c0b41c" />
          {/each}
        </div>
        {#each Array(5) as _, _i (_i)}
          <div class="svadmin-u-60fbb7713999 svadmin-u-0c3bc98565dd">
            {#each visibleFields.slice(0, 4) as __, _i (_i)}
              <Skeleton class="svadmin-u-ed8a5df7b2fb svadmin-u-36e579c0b41c" />
            {/each}
          </div>
        {/each}
      </div>
    {:else if !canRead}
      <p role="alert">{i18n.t('common.operationFailed')}</p>
    {:else if query.error || !pageRecords.ok}
      <DataState
        state="error"
        description={i18n.t('common.operationFailed')}
        retry={refreshList}
      />
    {:else}
      <div in:fade={{ duration: 150 }}>
        <!-- Desktop Table (hidden on mobile) -->
        <div class="svadmin-u-99d72c7fc3e2 svadmin-u-9d60be3a6d80">
        <Table.Root density={currentDensity}>
          <Table.Header>
            {#each tableView.headerGroups as headerGroup, _i (_i)}
              {@const visibleHeaders = headerGroup.headers.filter((header: Header<TableFeatures, TableRecord, unknown>) => isColumnVisible(header.column.id))}
              <DraggableHeader
                columns={visibleHeaders.map((header) => ({ id: header.column.id, header }))}
                onReorder={setColumnOrder}
              >
                {#snippet header(col, _index, dragProps)}
                  {@const header = col.header}
                  <Table.Head
                    {...dragProps}
                    class={cn('svadmin-u-65fdbade2025 svadmin-u-18049387f0af svadmin-u-b247a17a0d75 svadmin-u-2689f3958069 svadmin-u-d9256981a032 svadmin-u-bfa603190748 svadmin-u-f6e31b39b8e4', dragProps.class)}
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
                      <span class="svadmin-u-308fc069e46e svadmin-u-0214b4b355d1">{i18n.t('common.actions')}</span>
                    {:else if column_getCanSort(header.column)}
                      <Button
                        variant="ghost"
                        size="sm"
                        class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-ea7b2e9e070e svadmin-u-8ffe7a29179a svadmin-u-b8f0a08ece1e svadmin-u-660d2effb880 svadmin-u-d5eab218aa34 uppercase svadmin-u-8baf13a3e9d7 svadmin-u-7357df2b2e0c svadmin-u-e83a7042bc91"
                        onclick={() => toggleColumnSort(header.column)}
                      >
                        {visibleFields.find(f => f.key === header.id)?.label ?? header.id}
                        <span class="svadmin-u-359090c2d529 svadmin-u-0b8c506a0596">
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
              {@const record = copyTableRecord(row.original)}
              {@const id = rowIdValue(row)}
              {@const visibleCells = row_getVisibleCells(row).filter((cell) => isColumnVisible(cell.column.id))}
              <ContextMenu.Root>
                <ContextMenu.Trigger>
                  {#snippet child({ props })}
                    <Table.Row {...props} class="svadmin-u-0fe7d7d814d0 svadmin-u-7890552ecd63 svadmin-u-65fdbade2025 svadmin-u-945ecb9a9005 {rowIsSelected(row.id) ? 'svadmin-u-989c466fdbe7' : 'svadmin-u-c4b5eaba40e3'}">
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
                            <TooltipButton tooltip={rowIsExpanded(row.id) ? i18n.t('common.collapse') : i18n.t('common.expand')} variant="ghost" size="icon" class="svadmin-u-d0a52b312f7d svadmin-u-cbbf90f9a828" onclick={() => toggleRowExpanded(row.id)}>
                              {#if rowIsExpanded(row.id)}
                                <ChevronUp class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
                              {:else}
                                <ChevronDown class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
                              {/if}
                            </TooltipButton>
                          {:else if cell.column.id === '_actions'}
                            <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77c08e015d14 svadmin-u-44ee8ba0a421">
                              {#if rowActions}
                                {@render rowActions({ record, id })}
                              {:else}
                                {#if canShow}
                                  <CanAccess resource={resourceName} action="show" params={{ id }}>
                                    <TooltipButton tooltip={i18n.t('common.detail')} variant="ghost" size="icon-sm" onclick={() => openDetail(id)}>
                                      <Eye class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
                                    </TooltipButton>
                                  </CanAccess>
                                {/if}
                                {#if canEdit}
                                  <CanAccess resource={resourceName} action="edit" params={{ id }}>
                                    <TooltipButton tooltip={i18n.t('common.edit')} variant="ghost" size="icon-sm" onclick={() => navigation.edit(resourceName, id)}>
                                      <Pencil class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
                                    </TooltipButton>
                                  </CanAccess>
                                {/if}
                                {#if canDelete}
                                  <CanAccess resource={resourceName} action="delete" params={{ id }}>
                                    <TooltipButton tooltip={i18n.t('common.delete')} variant="ghost" size="icon-sm" onclick={() => confirmDelete(id)} class="svadmin-u-51e95020d6f2">
                                      <Trash2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
                                    </TooltipButton>
                                  </CanAccess>
                                {/if}
                              {/if}
                            </div>
                          {:else}
                            {@const field = visibleFields.find(f => f.key === cell.column.id)}
                            {@const customColumn = field ? customColumns?.[field.key] : undefined}
                            {#if customColumn}
                              {@render customColumn({ value: clonePlainValue(cell_getValue(cell)), record: copyTableRecord(record) })}
                            {:else if defaultCellRenderer && field}
                              {@render defaultCellRenderer({ field, value: clonePlainValue(cell_getValue(cell)), record: copyTableRecord(record) })}
                            {:else if canEdit && field && field.showInEdit !== false && writableFields.has(field.key) && field.key !== primaryKey && field.key !== 'id' && ['text', 'number', 'email', 'url'].includes(field.type)}                              <CanAccess resource={resourceName} action="edit" params={{ id }}>
                                <InlineEdit
                                  {resourceName}
                                  recordId={id}
                                  {field}
                                  value={cell_getValue(cell)}
                                />
                                {#snippet fallback()}
                                  <FieldDisplay type={field.type} value={cell_getValue(cell)} options={field.options} />
                                {/snippet}
                              </CanAccess>
                            {:else if field?.key === 'id'}
                              <span class="svadmin-u-0214b4b355d1 svadmin-u-f283ea9bea0e svadmin-u-0e65706bcccd svadmin-u-359090c2d529" title={String(cell_getValue(cell) ?? '—')}>{cell_getValue(cell) ?? '—'}</span>
                            {:else if field}
                              <FieldDisplay type={field.type} value={cell_getValue(cell)} options={field.options} resourceName={field.resource} />                            {/if}
                          {/if}
                        </Table.Cell>
                      {/each}
                    </Table.Row>
                  {/snippet}
                </ContextMenu.Trigger>
                <ContextMenu.Content class="svadmin-u-74b2435a1d40">
                  {#if canEdit}
                    <CanAccess resource={resourceName} action="edit" params={{ id }}>
                      <ContextMenu.Item onclick={() => navigation.edit(resourceName, id)} class="svadmin-u-77a2a20e90d4">
                        <Pencil class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" /> {i18n.t('common.edit')}
                      </ContextMenu.Item>
                    </CanAccess>
                  {/if}
                  {#if canShow}
                    <CanAccess resource={resourceName} action="show" params={{ id }}>
                      <ContextMenu.Item onclick={() => openDetail(id)} class="svadmin-u-77a2a20e90d4">
                        <Eye class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" /> {i18n.t('common.detail')}
                      </ContextMenu.Item>
                    </CanAccess>
                  {/if}
                  <ContextMenu.Item onclick={() => navigator.clipboard?.writeText(String(id))} class="svadmin-u-77a2a20e90d4">
                    <Copy class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" /> {i18n.t('common.copyId')}
                  </ContextMenu.Item>
                  {#if canDelete}
                    <CanAccess resource={resourceName} action="delete" params={{ id }}>
                      <ContextMenu.Separator />
                      <ContextMenu.Item onclick={() => confirmDelete(id)} class="svadmin-u-77a2a20e90d4 svadmin-u-811148b13d1e">
                        <Trash2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" /> {i18n.t('common.delete')}
                      </ContextMenu.Item>
                    </CanAccess>
                  {/if}
                </ContextMenu.Content>
              </ContextMenu.Root>
              {#if expandedRowRender && rowIsExpanded(row.id)}
                <Table.Row class="svadmin-u-8a25a995eb8e svadmin-u-65fdbade2025 svadmin-u-945ecb9a9005 svadmin-u-0fe7d7d814d0">
                  <Table.Cell colspan={visibleCells.length}>
                    {@render expandedRowRender({ record })}
                  </Table.Cell>
                </Table.Row>
              {/if}
            {:else}
              <Table.Row>
                <Table.Cell colspan={columns.length} class="svadmin-u-3c8ea328c09e svadmin-u-ca6bf63030aa">
                  {#if emptyState}
                    {@render emptyState()}
                  {:else}
                    <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-a1f611f027dd">
                      <svg class="svadmin-u-acaee62117b1 svadmin-u-baceed3462fd svadmin-u-106b502aac96 svadmin-u-da019856f2cc" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p class="svadmin-u-fc7473ca09eb svadmin-u-2689f3958069 svadmin-u-bfa603190748 svadmin-u-65281709dacf">{i18n.t('common.noData')}</p>
                      <p class="svadmin-u-359090c2d529 svadmin-u-7be4d67a6256 svadmin-u-da019856f2cc">{i18n.t('common.noDataHint')}</p>
                      {#if canCreate}
                        <Button variant="outline" size="sm" class="svadmin-u-77a2a20e90d4" onclick={() => navigation.create(resourceName)}>
                          <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
                          {i18n.t('common.create')}
                        </Button>
                      {/if}
                    </div>
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
          {#if summary}
            <Table.Footer class="svadmin-u-2859c861d7de svadmin-u-2689f3958069">
              {@render summary({ data: pageRecords.data.map(copyTableRecord), total: query.data?.total ?? 0, visibleColumnsCount: columns.filter((c) => c.id != null && isColumnVisible(c.id)).length })}            </Table.Footer>
          {/if}
        </Table.Root>
        </div>

        <!-- Mobile Card View (visible only on small screens) -->
        <div class="svadmin-u-e477a6af4cb6 svadmin-u-6ed543e2fbbb svadmin-u-7660b450905a">
          {#each tableView.rows as row, _i (_i)}
            {@const record = copyTableRecord(row.original)}
            {@const id = rowIdValue(row)}
            <div
              class="svadmin-u-f5c8cc114f47 svadmin-u-633ef3c47872 svadmin-u-3daca9af0861 svadmin-u-a3158643e114 svadmin-u-cd0ad9a56558 svadmin-u-c07e54fd1439 svadmin-u-0fe7d7d814d0 {rowIsSelected(row.id) ? 'svadmin-u-16b1efa5875e svadmin-u-f42e9fee68a1 svadmin-u-989c466fdbe7' : ''}"
            >
              <!-- Card header: ID + select + actions -->
              <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1bb883263ed2">
                <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
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
                  <span class="svadmin-u-359090c2d529 svadmin-u-0e65706bcccd svadmin-u-bfa603190748">#{id}</span>
                </div>
                <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421">
                  {#if rowActions}
                    {@render rowActions({ record, id })}
                  {:else}
                    {#if canEdit}
                      <CanAccess resource={resourceName} action="edit" params={{ id }}>
                        <TooltipButton tooltip={i18n.t('common.edit')} variant="ghost" size="icon-sm" onclick={() => navigation.edit(resourceName, id)}>
                          <Pencil class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
                        </TooltipButton>
                      </CanAccess>
                    {/if}
                    {#if canShow}
                      <CanAccess resource={resourceName} action="show" params={{ id }}>
                        <TooltipButton tooltip={i18n.t('common.detail')} variant="ghost" size="icon-sm" onclick={() => openDetail(id)}>
                          <Eye class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
                        </TooltipButton>
                      </CanAccess>
                    {/if}
                    {#if canDelete}
                      <CanAccess resource={resourceName} action="delete" params={{ id }}>
                        <TooltipButton tooltip={i18n.t('common.delete')} variant="ghost" size="icon-sm" onclick={() => confirmDelete(id)} class="svadmin-u-51e95020d6f2">
                          <Trash2 class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
                        </TooltipButton>
                      </CanAccess>
                    {/if}
                  {/if}
                </div>
              </div>
              <!-- Card fields -->
              <div class="svadmin-u-6f7e013d6499">
                {#each visibleFields.filter((field) => isColumnVisible(field.key)).slice(0, 6) as field (field.key)}
                  {@const value = record[field.key]}
                  {@const customColumn = customColumns?.[field.key]}
                  <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-8ef2268efbbc svadmin-u-0c3bc98565dd">
                    <span class="svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-bfa603190748 svadmin-u-012fbd121f37">{field.label}</span>
                    <span class="svadmin-u-fc7473ca09eb svadmin-u-308fc069e46e svadmin-u-f283ea9bea0e svadmin-u-897d497e57b6">
                      {#if customColumn}
                        {@render customColumn({ value: clonePlainValue(value), record: copyTableRecord(record) })}
                      {:else if defaultCellRenderer && field}
                        {@render defaultCellRenderer({ field, value: clonePlainValue(value), record: copyTableRecord(record) })}
                      {:else if field.key === 'id'}
                        {id}                      {:else}
                        <FieldDisplay type={field.type} {value} options={field.options} resourceName={field.resource} />
                      {/if}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="svadmin-u-ca6bf63030aa svadmin-u-1100bef66e60 svadmin-u-bfa603190748">
              {#if emptyState}
                {@render emptyState()}
              {:else}
                <DataState state="empty" class="svadmin-u-119b2aa0b8f6 svadmin-u-7f19cdf4c5bb svadmin-u-d5eab218aa34 svadmin-u-cb11fec3bb46" />
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Pagination (shadcn) -->
  {#if totalPages > 0}
  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-020ba687fa12 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c svadmin-u-d8e0e382c67b svadmin-u-03b4dd7f172b svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">
    <div class="svadmin-u-60fbb7713999 svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c svadmin-u-c6b7e58a30d8">
      <span class="svadmin-u-012fbd121f37 svadmin-u-e82ae8be04aa svadmin-u-3032cae0badb">{i18n.t('common.total', { total: query.data?.total ?? 0 })}</span>
      <Select.Root
        aria-label={i18n.t('common.perPage')}
        class="svadmin-u-ed8a5df7b2fb svadmin-u-d043cad8e3fa svadmin-u-012fbd121f37 svadmin-u-3032cae0badb"
        value={String(pagination.pageSize ?? 10)}
        onchange={(e: Event) => {
          if (!(e.currentTarget instanceof HTMLSelectElement)) return;
          const size = Number(e.currentTarget.value);
          if (Number.isSafeInteger(size) && size > 0) {
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
                class="svadmin-u-3032cae0badb"
                isActive={page === currentPage}
                onclick={() => { if (typeof page === 'number') goToPage(page); }}
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
  confirming={confirmPending || deletePermission.isLoading}
  onconfirm={confirmAction}
  oncancel={() => { if (!confirmPending) { confirmOpen = false; deleteRequest = null; } }}
/>

{#if detailRecordId != null}
  <RecordDetailDrawer
    resourceName={resourceName}
    open={detailOpen}
    recordId={detailRecordId}
    onClose={closeDetail}
  />
{/if}
