<script lang="ts">
  import { bindResourceRendering, type ResourceRendering } from '../rendering/index.js';
  import type { AutoTableGridState } from './auto-table-grid.js';
  import { definedOptions } from '@svadmin/core/options';

  import { untrack } from 'svelte';
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
    type ExpandedState,
  } from '@tanstack/svelte-table';
  import type { Column, Header, Row, TableFeatures } from '@tanstack/table-core';
  import { createAtom, useSelector } from '@tanstack/svelte-store';
  import {
    column_getCanSort,
    column_getSize,
    column_getIsSorted,
    column_toggleSorting,
    header_getSize,
    table_getHeaderGroups,
    table_getRowModel,
    table_getAllLeafColumns,
    table_getIsAllRowsSelected,
    table_resetRowSelection,
    table_toggleAllRowsSelected,
    row_toggleSelected,
    row_getVisibleCells,
    cell_getValue,
  } from '@tanstack/table-core/static-functions';

  import { captureAdminContext, captureAuthSession, useGetIdentity, getContractFormFields, useNavigation, useParsed, useResourceContract, useList, useDeleteMany, downloadData, type ExportFormat, type TaskProvider } from '@svadmin/core';
  import { snapshotPlainData, parseContractRouteId, formatContractRouteId } from '@svadmin/core/schema';
  import {
    checkedTableRows,
    copyTableRecord,
    tableExportRows,
    tableRowKey,
    type BatchSelection,
    type TableRecord,
  } from './table-contract';
  import type {
    BaseRecord,
    FieldDefinition,
    Sort,
  } from '@svadmin/core';
  import { useCan } from '@svadmin/core';
  import { readURLState, writeURLState } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { createSavedListViews } from './saved-list-views.svelte.js';
  import { createListState } from './list-state.svelte.js';
  import { createListSelection } from './list-selection.svelte.js';
  import { createListColumnPreferences } from './list-column-preferences.svelte.js';
  import { createListDeletion } from './list-deletion.svelte.js';
  import {
    canMigrateLegacyListPreferences,
    decodeSavedListViewAccess,
    listPreferenceScopeId,
    type ListPreferenceScope,
    type SavedListViewState,
    type SavedListViewProvider,
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
    Plus, Pencil, Trash2, Star,
    Search, Download, ChevronDown, ChevronUp, SlidersHorizontal, Filter as FilterIcon,
    Eye, Copy, RefreshCw, Rows, X, Bookmark, Check
  } from '@lucide/svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import RecordDetailDrawer from './RecordDetailDrawer.svelte';
  import QuickEditDrawer from './QuickEditDrawer.svelte';
  import RecordRowActions from './RecordRowActions.svelte';
  import CanAccess from './CanAccess.svelte';
  import TooltipButton from './TooltipButton.svelte';
  import InlineEdit from './InlineEdit.svelte';
  import ExportButton from './buttons/ExportButton.svelte';
  import FieldDisplay from './FieldDisplay.svelte';
  import DraggableHeader from './DraggableHeader.svelte';
  import DataState from './content/DataState.svelte';
  import type { Snippet } from 'svelte';

  const i18n = useTranslation();

  // ─── Props with Snippet composability ─────────────────────────
  interface Props {
    resourceName: string;
    /** 嵌入仪表盘的多个表格应关闭 URL 同步，避免互相覆盖筛选与分页。 */
    syncWithLocation?: boolean;
    rendering?: ResourceRendering | undefined;
    /** 可选主体渲染器：不替换资源、权限、工具栏和持久化逻辑。 */
    gridBody?: Snippet<[AutoTableGridState]>;
    selectable?: boolean;
    /** 仅在业务回调支持按查询执行服务端命令时启用。 */
    allowSelectAllMatching?: boolean;
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
    /** 批量操作必须按 selection.scope 区分明确 ID 与全部查询结果。 */
    batchActions?: Snippet<[{ selectedIds: (string | number)[]; selection: BatchSelection }]>;
    /** Summary row rendered at table footer */
    summary?: Snippet<[{ data: BaseRecord[]; total: number; visibleColumnsCount: number }]>;
    deleteVariables?: unknown;
    /** 团队/系统视图；写入需要 Provider 能力和显式可写标记。 */
    savedViewProvider?: SavedListViewProvider;
    /** 显式允许唯一的远程默认视图在无 URL/个人活动视图时初始化页面。 */
    applyRemoteDefaultView?: boolean;
    /** 提供任务名后按当前筛选/排序提交全量导出；未提供时仍导出当前已加载页。 */
    exportTaskName?: string;
    exportTaskProvider?: TaskProvider;
    exportTaskIdempotencyKey?: string;
    exportFormat?: ExportFormat;
    exportMaxItemCount?: number;
  }

  let {
    resourceName,
    syncWithLocation = true,
    rendering,
    gridBody,
    selectable = true,
    allowSelectAllMatching = false,
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
    savedViewProvider,
    applyRemoteDefaultView = false,
    exportTaskName,
    exportTaskProvider,
    exportTaskIdempotencyKey,
    exportFormat = 'csv',
    exportMaxItemCount,
  }: Props = $props();

  let densityOverride = $state<'compact' | 'comfortable' | undefined>(undefined);
  const currentDensity = $derived(densityOverride ?? density);
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const navigation = useNavigation();

  const binding = useResourceContract(() => resourceName);
  const activeRendering = $derived(bindResourceRendering(rendering, binding.resource));
  const resource = $derived(adminContext.getResource(resourceName));
  const primaryKey = $derived(resource.primaryKey ?? 'id');
  const listPermission = useCan(() => ({ resource: resourceName, action: 'list' }));
  const canRead = $derived(listPermission.allowed);
  const preferenceIdentity = useGetIdentity();
  const preferenceSession = $derived(captureAuthSession(adminContext.authProvider));
  const preferenceIdentityReady = $derived(!adminContext.authProvider || (
    preferenceSession.available && !preferenceIdentity.isLoading && !preferenceIdentity.error
    && typeof preferenceIdentity.data?.id === 'string' && !!preferenceIdentity.data.id.trim()
  ));
  const listPreferenceScope = $derived.by(() => {
    return definedOptions({
      resourceName,
      providerName: binding.dataProviderName,
      tenantIdentity: adminContext.queryKeyMatcher(resourceName).tenant,
      identityKey: adminContext.authProvider
        ? preferenceIdentityReady ? `id:${preferenceIdentity.data?.id}` : `unresolved:${preferenceSession.cacheKey}`
        : undefined,
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
    if (!preferenceIdentityReady) return null;
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
  const urlState: ReturnType<typeof readURLState> = untrack(() => syncWithLocation ? readURLState(adminContext) : {});

  const savedViewColumnIds = $derived(new Set([
    ...resource.fields.map((field) => field.key),
    '_select', '_expand', '_actions',
  ]));
  const hasExplicitURLState = untrack(() => (
    urlState.page !== undefined
    || urlState.pageSize !== undefined
    || urlState.sortField !== undefined
    || urlState.search !== undefined
    || urlState.filters !== undefined
  ));
  const savedViewModel = createSavedListViews({
    scope: () => listPreferenceScope,
    columns: () => savedViewColumnIds,
    provider: () => savedViewProvider,
    isScopeLoaded: preferenceScopeIsLoaded,
    readPreference: readScopedPreference,
    hasExplicitURLState,
    canApplyRemoteDefault: () => applyRemoteDefaultView && !externalPagination && !externalSorters,
    captureState: () => {
      listState.flushSearch();
      return getCurrentSavedViewState();
    },
    applyState: applySavedViewState,
  });
  const {
    markSavedViewDirty, applySavedView, saveCurrentView, deleteSavedView,
    setRemoteDefault, saveRemoteAccess, loadAccessSubjects,
    accessDrafts, accessSubjects, accessSubjectsLoading, accessSubjectsFailed, accessSubjectQueries,
  } = savedViewModel;
  const initialViewState = savedViewModel.initialSavedView?.state;

  // The table can stay mounted while the surrounding tenant/provider changes.
  // Keep persistence effects paused until the new scope has been loaded.
  let loadedPreferenceScopeId = $state(untrack(() => listPreferenceScopeId(listPreferenceScope)));

  // Snapshot resource values for initial state (untrack to avoid reactive tracking)
  const storedPageSize = parseInt(readLocalPreference('svadmin-default-page-size') ?? '', 10);
  const initPageSize = $derived(resource.pageSize ?? (Number.isSafeInteger(storedPageSize) && storedPageSize > 0 ? storedPageSize : 10));
  const listState = createListState({
    fields: () => resource.fields,
    defaultPageSize: () => initPageSize,
    defaultSort: () => resource.defaultSort,
    externalPagination: () => externalPagination,
    externalSorters: () => externalSorters,
    initialURLState: urlState,
    initialViewState,
    syncWithLocation: () => syncWithLocation,
    writeURLState: (state) => writeURLState(state, adminContext),
    onDirty: markSavedViewDirty,
  });
  const pagination = $derived(listState.pagination);
  const sorters = $derived(listState.sorters);
  const searchText = $derived(listState.searchText);
  const appliedSearchText = $derived(listState.appliedSearchText);
  const searchableFields = $derived(listState.searchableFields);
  const filterableFields = $derived(listState.filterableFields);
  const filterValues = $derived(listState.filterValues);
  const activeFilterCount = $derived(listState.activeFilterCount);
  const activeFilterItems = $derived(listState.activeFilterItems);
  const activeFilters = $derived(listState.activeFilters);
  const queryPagination = $derived(listState.queryPagination);
  const querySorters = $derived(listState.querySorters);
  const queryFilters = $derived(listState.queryFilters);
  const { clearFilters, setFilterValue, removeActiveFilter } = listState;

  function scheduleSearch(event: Event) {
    if (!(event.currentTarget instanceof HTMLInputElement)) return;
    listState.scheduleSearch(event.currentTarget.value);
  }

  function setFilterFromEvent(field: string, event: Event): void {
    if (event.currentTarget instanceof HTMLInputElement || event.currentTarget instanceof HTMLSelectElement) {
      setFilterValue(field, event.currentTarget.value);
    }
  }

  function clonePlainValue(value: unknown): unknown {
    return value === undefined ? undefined : snapshotPlainData(value);
  }

  // ─── Data fetching ────────────────────────────────────────────
  const listResult = useList({
    get resource() { void activeRendering; return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
    get queryOptions() { return { enabled: canRead }; },
    get pagination() { return queryPagination; },
    get sorters() { return querySorters; },
    get filters() { return queryFilters; },
  });
  const query = listResult;
  const pageRecords = {
    get ok(): boolean {
      if (!canRead) return true;
      try {
        checkedTableRows(activeRendering ? activeRendering.records(query.data?.data ?? []) : query.data?.data ?? []);
        return true;
      } catch {
        return false;
      }
    },
    get data(): TableRecord[] {
      if (!canRead) return [];
      try {
        return checkedTableRows(activeRendering ? activeRendering.records(query.data?.data ?? []) : query.data?.data ?? []);
      } catch {
        return [];
      }
    },
  };
  const deletionModel = createListDeletion({
    canRequestSingle: () => canRead && pageRecords.ok && !query.isError && canDelete,
    canRequestBatch: () => canRead && pageRecords.ok && !query.isError && canBatchDelete,
    canConfirm: () => pageRecords.ok && !query.isError && deleteAllowed,
    permission: () => deletePermission,
    selection: () => selectionModel,
    clearSelection: () => {
      selectionModel.clearExplicit();
      table_resetRowSelection(tbl, true);
    },
    captureScope: () => {
      const scope = tableScope;
      return () => tableScope.contract === scope.contract
        && tableScope.resourceName === scope.resourceName
        && tableScope.provider === scope.provider
        && tableScope.meta === scope.meta
        && tableScope.tenant === scope.tenant
        && tableScope.auth === scope.auth
        && tableScope.router === scope.router
        && tableScope.permissionProvider === scope.permissionProvider;
    },
    mutate: (ids) => deleteManyMutation.mutateAsync({
      ids,
      ...definedOptions({ variables: deleteVariables, dataProviderName: binding.dataProviderName }),
    }),
    reportError: (message) => { operationError = message; },
    messages: {
      single: () => i18n.t('common.deleteConfirm'),
      batch: (count) => i18n.t('common.batchDeleteConfirm', { count }),
      failure: () => i18n.t('common.operationFailed'),
      partial: (failed, total) => i18n.t('common.batchDeletePartialFail', { failed, total }),
    },
  });
  const deleteRequest = $derived(deletionModel.request);
  const confirmOpen = $derived(deletionModel.open);
  const confirmPending = $derived(deletionModel.pending);
  const confirmMessage = $derived(deletionModel.message);
  const {
    requestDelete: confirmDelete, requestBatchDelete: confirmBatchDelete, confirm: confirmAction,
  } = deletionModel;
  const deletePermission = useCan(() => definedOptions({
    resource: resourceName, action: 'delete',
    id: deleteRequest?.batch === false ? deleteRequest.ids[0] : undefined,
    params: deleteRequest?.batch ? { ids: deleteRequest.ids } : undefined,
    queryOptions: { enabled: deleteRequest !== null },
  }));
  const deleteAllowed = $derived(canRead && resource.canDelete !== false && deleteRequest !== null && deletePermission.allowed);
  const deleteManyResult = useDeleteMany({
    get resource() { void activeRendering; return binding.resource; },
    get enabled() { return deleteAllowed; },
  });
  const deleteManyMutation = deleteManyResult.mutation;

  // ─── Permissions ──────────────────────────────────────────────
  const acEnabled = $derived(!!adminContext.accessControlProvider);
  const deleteResourcePermission = useCan(() => ({
    resource: resourceName, action: 'delete', queryOptions: { enabled: acEnabled },
  }));
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
  const canExport = $derived(!acEnabled || canExportPerm.allowed);

  // ─── TanStack Table state ────────────────────────────────────
  const initialSorting = untrack<SortingState>(() =>
    sorters.map(s => ({ id: s.field, desc: s.order === 'desc' }))
  );
  const sortingAtom = createAtom(initialSorting);
  const columnPreferences = createListColumnPreferences({
    scope: () => listPreferenceScope,
    columns: () => savedViewColumnIds,
    fields: () => resource.fields,
    isScopeLoaded: preferenceScopeIsLoaded,
    readPreference: readScopedPreference,
    initialViewState,
    onDirty: markSavedViewDirty,
  });
  const {
    visibility: tableColumnVisibility, order: tableColumnOrder,
    setVisibility: setColumnVisibility, setOrder: setColumnOrder,
  } = columnPreferences;
  const selectionModel = createListSelection({
    filters: () => queryFilters,
    sorters: () => querySorters,
    total: () => query.data?.total ?? 0,
    selectable: () => selectable,
    allowAllMatching: () => allowSelectAllMatching && !!batchActions,
    onCriteriaChange: deletionModel.cancelBatchOnCriteriaChange,
  });
  const rowSelection = $derived(selectionModel.rowSelection);
  const allMatchingSelected = $derived(selectionModel.allMatchingSelected);
  const selectedIds = $derived(selectionModel.selectedIds);
  const selectedCount = $derived(selectionModel.selectedCount);
  const { rowIsSelected } = selectionModel;
  const expandedAtom = createAtom<ExpandedState>({});
  const features = tableFeatures({
    columnOrderingFeature,
    columnSizingFeature,
    columnVisibilityFeature,
    rowExpandingFeature,
    rowSelectionFeature,
    rowSortingFeature,
  });

  const tableSorting = useSelector(sortingAtom);
  const tableExpanded = useSelector(expandedAtom);

  function preferenceScopeIsLoaded(): boolean {
    return preferenceIdentityReady && loadedPreferenceScopeId === listPreferenceScopeId(listPreferenceScope);
  }

  function rowIsExpanded(rowId: string): boolean {
    const expanded = tableExpanded.current;
    return expanded === true || expanded[rowId] === true;
  }

  function rowIdValue(row: Row<TableFeatures, TableRecord>): string | number {
    return row.original.id;
  }

  function toggleRowSelection(row: Row<TableFeatures, TableRecord>): void {
    if (confirmPending || !canRead) return;
    if (allMatchingSelected) {
      selectionModel.toggleExcluded(row.id, rowIdValue(row));
      return;
    }
    const wasSelected = rowIsSelected(row.id);
    selectionModel.trackRow(row.id, rowIdValue(row), !wasSelected);
    row_toggleSelected(row);
  }

  $effect(() => {
    const nextSorters: Sort[] = tableSorting.current.map((sorter) => ({
      field: sorter.id,
      order: sorter.desc ? 'desc' as const : 'asc' as const,
    }));

    if (JSON.stringify(nextSorters) !== JSON.stringify(sorters)) {
      listState.sorters = nextSorters;
    }
  });

  function getCurrentSavedViewState(): SavedListViewState {
    return {
      ...listState.captureState(),
      ...columnPreferences.captureState(),
    };
  }

  function applySavedViewState(state: SavedListViewState): void {
    listState.applyState(state);
    sortingAtom.set(state.sorters.map((sorter) => ({ id: sorter.field, desc: sorter.order === 'desc' })));
    columnPreferences.applyState(state);
    selectionModel.reset();
  }

  function resetToDefaultListState(): void {
    listState.resetToDefaults();
    if (!externalSorters) {
      sortingAtom.set(listState.sorters.map((sorter) => ({ id: sorter.field, desc: sorter.order === 'desc' })));
    }
  }

  $effect(() => {
    const scope = listPreferenceScope;
    const scopeId = listPreferenceScopeId(scope);
    if (scopeId === loadedPreferenceScopeId) return;

    const activeSavedView = savedViewModel.restoreScope(scope);
    const restoredColumns = columnPreferences.readScope(scope);

    if (!hasExplicitURLState && activeSavedView) {
      applySavedView(activeSavedView);
    } else {
      if (!hasExplicitURLState) resetToDefaultListState();
      columnPreferences.applyState(restoredColumns);
      selectionModel.reset();
    }

    loadedPreferenceScopeId = scopeId;
  });

  function toggleColumnSort(column: Column<TableFeatures, TableRecord, unknown>): void {
    markSavedViewDirty();
    column_toggleSorting(column);
  }

  // Sync external sorters ? local sorting state (controlled mode only)
  $effect(() => {
    if (!externalSorters) return;
    if (JSON.stringify(externalSorters) !== JSON.stringify(sorters)) {
      listState.sorters = externalSorters;
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
        get rowSelection() { return rowSelection; },
      },
      onSortingChange: (updater) => {
        sortingAtom.set(typeof updater === 'function' ? updater(tableSorting.current) : updater);
      },
      onRowSelectionChange: (updater) => {
        selectionModel.rowSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
      },
      atoms: {
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
    if (allMatchingSelected) {
      clearSelection();
      return;
    }
    const willSelect = !table_getIsAllRowsSelected(tbl);
    for (const row of tableView.rows) {
      selectionModel.trackRow(row.id, rowIdValue(row), willSelect);
    }
    table_toggleAllRowsSelected(tbl);
  }

  const matchingTotal = $derived(query.data?.total ?? 0);
  const selectionLabel = $derived(i18n.t(
    allMatchingSelected ? 'common.allMatchingSelected' : 'common.selectedCount',
    { count: selectedCount },
  ));
  const selectionReady = $derived(
    canRead && selectable && pageRecords.ok && !query.isError && !query.isFetching
  );
  const canSelectAllMatching = $derived(
    allowSelectAllMatching && !!batchActions && selectionReady
    && Number.isSafeInteger(matchingTotal) && matchingTotal > 0
  );
  function batchSelectionSnapshot(): BatchSelection {
    return selectionModel.snapshot(tableView.rows.map(row => ({ key: row.id, id: rowIdValue(row) })));
  }
  const batchDeletePerm = useCan(() => ({
    resource: resourceName,
    action: 'delete',
    params: { ids: selectedIds },
    queryOptions: { enabled: acEnabled && canDelete && selectedIds.length > 0 },
  }));
  const canBatchDelete = $derived(
    !allMatchingSelected && canDelete && (!acEnabled || batchDeletePerm.isLoading || batchDeletePerm.allowed)
  );

  function clearSelection(): void {
    if (!deleteManyMutation.isPending) {
      selectionModel.reset();
      table_resetRowSelection(tbl, true);
    }
  }

  function selectAllMatching(): void {
    if (!canSelectAllMatching || confirmPending || confirmOpen) return;
    selectionModel.selectAllMatching();
  }

  function isColumnVisible(columnId: string): boolean {
    return tableColumnVisibility.current[columnId] !== false;
  }

  const tableView = $derived.by(() => {
    void tableSorting.current;
    void tableColumnVisibility.current;
    void orderedColumns;
    void rowSelection;
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
  let operationError = $state<string | null>(null);
  let detailOpenedInHistory = $state(false);
  let quickEditId = $state<string | number | undefined>();
  const tableScope = $derived({
    contract: binding.resource, resourceName, provider: adminContext.providers?.[binding.dataProviderName],
    meta: JSON.stringify(binding.meta), tenant: adminContext.tenantCacheKey?.__svadminTenant,
    auth: adminContext.authProvider, router: adminContext.routerProvider,
    permissionProvider: adminContext.accessControlProvider, canRead, canDelete,
    variables: deleteVariables,
  });
  let previousTableScope: typeof tableScope | undefined;
  function tableScopesEqual(left: typeof tableScope, right: typeof tableScope): boolean {
    return left.contract === right.contract
      && left.resourceName === right.resourceName
      && left.provider === right.provider
      && left.meta === right.meta
      && left.tenant === right.tenant
      && left.auth === right.auth
      && left.router === right.router
      && left.permissionProvider === right.permissionProvider
      && left.canRead === right.canRead
      && left.canDelete === right.canDelete
      && left.variables === right.variables;
  }
  let localDetailId = $state<string | number>();
  const detailState = $derived.by(() => {
    if (!syncWithLocation) return { id: canRead ? localDetailId : undefined, invalid: false };
    const route = parsed.params['detail'];
    if (route === undefined || !canRead) return { id: undefined, invalid: false };
    try { return { id: parseContractRouteId(binding.resource, route), invalid: false }; }
    catch { return { id: undefined, invalid: true }; }
  });
  const detailRecordId = $derived(detailState.id);
  const detailOpen = $derived(detailRecordId != null);
  $effect.pre(() => {
    const scope = tableScope;
    if (previousTableScope && !tableScopesEqual(previousTableScope, scope)) {
      deletionModel.reset();
      selectionModel.reset();
      expandedAtom.set({});
      detailOpenedInHistory = false;
      localDetailId = undefined;
      quickEditId = undefined;
      listState.cancelSearch();
      if (previousTableScope.resourceName !== scope.resourceName) resetToDefaultListState();
    }
    previousTableScope = scope;
  });
  function openDetail(id: string | number): void {
    if (!canRead || !canShow) return;
    if (!syncWithLocation) { localDetailId = id; return; }
    detailOpenedInHistory = true;
    writeURLState({ detailId: formatContractRouteId(binding.resource, id) }, adminContext, 'push');
  }
  function closeDetail(): void {
    if (!syncWithLocation) { localDetailId = undefined; return; }
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
    listState.pagination = { ...pagination, current: page };
  }
  function refreshList() {
    if (canRead && !query.isFetching) void listResult.refetch();
  }
  const gridRowIndex = $derived(new Map(tableView.rows.map(row => [rowIdValue(row), row])));
  const gridColumns = $derived.by(() => {
    void tableColumnOrder.current; void tableColumnVisibility.current;
    return table_getAllLeafColumns(tbl).filter(column => isColumnVisible(column.id)).map(column => ({
      key: column.id,
      label: column.id === '_actions' ? i18n.t('common.actions') : column.id === '_select' ? i18n.t('common.selectAll') : column.id === '_expand' ? i18n.t('common.expand') : visibleFields.find(field => field.key === column.id)?.label ?? column.id,
      width: Math.max(40, Math.min(4096, column_getSize(column))),
      sortable: column_getCanSort(column),
    }));
  });
  function changeGridSort(next: readonly Sort[]): void {
    if (!canRead || query.isFetching || deleteManyMutation.isPending) return;
    markSavedViewDirty();
    const accepted = next.filter(sort => gridColumns.some(column => column.key === sort.field && column.sortable));
    listState.sorters = accepted.map(sort => ({ ...sort }));
    sortingAtom.set(accepted.map(sort => ({ id: sort.field, desc: sort.order === 'desc' })));
    listState.pagination = { ...pagination, current: 1 };
  }
</script>

{#snippet renderGridCell({ id, field }: { id: string | number; field: string })}
  {@const row = gridRowIndex.get(id)}
  {#if row}
    {@const record = copyTableRecord(row.original)}
    {@const cell = row_getVisibleCells(row).find(item => item.column.id === field)}
    {#if cell}
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          {#snippet child({ props })}
            <div {...props}>
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
                                {@render defaultRowActions(id)}
                              {/if}
                            </div>
                          {:else}
                            {@const field = visibleFields.find(f => f.key === cell.column.id)}
                            {@const customColumn = field ? customColumns?.[field.key] : undefined}
                            {#if customColumn}
                              {@render customColumn({ value: clonePlainValue(cell_getValue(cell)), record: copyTableRecord(record) })}
                            {:else if defaultCellRenderer && field}
                              {@render defaultCellRenderer({ field, value: clonePlainValue(cell_getValue(cell)), record: copyTableRecord(record) })}
                            {:else if canEdit && field && field.showInEdit !== false && writableFields.has(field.key) && field.key !== primaryKey && field.key !== 'id' && ['text', 'number', 'email', 'url'].includes(field.type)}
                              <CanAccess resource={resourceName} action="edit" params={{ id }}>
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
                              <FieldDisplay type={field.type} value={cell_getValue(cell)} options={field.options} resourceName={field.resource} />
                            {/if}
                          {/if}
            </div>
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
    {/if}
  {/if}
{/snippet}

{#snippet renderGridControls()}
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
                      {:else if !acEnabled || deleteResourcePermission.isLoading || deleteResourcePermission.allowed}
                          <Checkbox
                            aria-label={i18n.t('common.selectAll')}
                            checked={table_getIsAllRowsSelected(tbl)}
                            onCheckedChange={toggleAllRowsSelection}
                          />
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
  </Table.Root>
{/snippet}

{#snippet renderGridAfter()}
  <Table.Root density={currentDensity}>
    <Table.Body>
      {#each tableView.rows as row (row.id)}
        {#if expandedRowRender && rowIsExpanded(row.id)}
          <Table.Row><Table.Cell colspan={Math.max(1, gridColumns.length)}>
            {@render expandedRowRender({ record: copyTableRecord(row.original) })}
          </Table.Cell></Table.Row>
        {/if}
      {/each}
    </Table.Body>
    {#if summary}<Table.Footer>
      {@render summary({ data: pageRecords.data.map(copyTableRecord), total: query.data?.total ?? 0, visibleColumnsCount: gridColumns.length })}
    </Table.Footer>{/if}
  </Table.Root>
{/snippet}

{#snippet defaultRowActions(id: string | number)}
  <RecordRowActions
    {resourceName} {id} {canShow} {canEdit} {canDelete}
    onShow={() => openDetail(id)}
    onEdit={() => navigation.edit(resourceName, id)}
    onQuickEdit={() => quickEditId = id}
    onDelete={() => confirmDelete(id)}
  />
{/snippet}

{#snippet defaultEmptyState()}
  {@const hasCriteria = !!(searchText.trim() || appliedSearchText.trim() || activeFilterCount > 0)}
  <DataState state="empty" description={i18n.t(hasCriteria ? 'empty.description' : 'common.noDataHint')}>
    {#snippet action()}
      {#if hasCriteria}
        <Button variant="outline" size="sm" onclick={clearFilters}>
          <X class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
          {i18n.t('common.clearAllFilters')}
        </Button>
      {:else if canCreate}
        <Button variant="outline" size="sm" onclick={() => navigation.create(resourceName)}>
          <Plus class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" />
          {i18n.t('common.create')}
        </Button>
      {/if}
    {/snippet}
  </DataState>
{/snippet}

<div class="svadmin-u-6ed543e2fbbb" data-svadmin-rendering-resource={activeRendering?.resource.name} data-svadmin-rendering-kind={activeRendering ? 'table' : undefined}>
  {#if operationError}<p role="alert">{operationError}</p>{/if}
  {#if detailState.invalid}<p role="alert">{i18n.t('common.operationFailed')}</p>{/if}
  {#if showHeader}
    <!-- Header -->
    <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4">
      <h1 class="svadmin-u-42536e69e639 svadmin-u-998e0b29fe9e svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{title ?? resource.label}</h1>
      <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        {#if canExport}
          {#if exportTaskName}
            <ExportButton
              resource={resourceName}
              taskName={exportTaskName}
              {...definedOptions({ taskProvider: exportTaskProvider, taskIdempotencyKey: exportTaskIdempotencyKey, maxItemCount: exportMaxItemCount })}
              format={exportFormat}
              filters={activeFilters}
              sorters={sorters}
              accessControl={{ enabled: acEnabled, hideIfUnauthorized: true }}
            />
          {:else}
            <Button variant="outline" size="sm" onclick={exportCSV}>
              <Download class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" /> {i18n.t("common.export")}
            </Button>
          {/if}
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
  {#if selectedCount > 0 || allMatchingSelected}
<div
      class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-ca6bcd4b6f3f svadmin-u-a6afccfc915b svadmin-u-375dc44df6e9 svadmin-u-e0d9cc7f0647 svadmin-u-03b4dd7f172b svadmin-u-5f22e64f2282 svadmin-u-fc7473ca09eb svadmin-u-d4108abe6359 svadmin-u-40137e897961 fade-in svadmin-u-625a4c3fbeb2 svadmin-u-259ce51fc8f3 svadmin-u-020ba687fa12 svadmin-u-9f76a62f4f44 svadmin-u-3b9871a0bf93"
      aria-label={selectionLabel}
      data-svadmin-batch-toolbar
    >
      <div class="svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-fc7473ca09eb">
        <span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359 svadmin-u-3032cae0badb">{selectionLabel}</span>
        {#if deleteManyMutation.isPending}
          <span class="svadmin-u-bfa603190748" role="status">{i18n.t("common.processing")}</span>
        {/if}
      </div>
      <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
        {#if batchActions && selectionReady && selectedCount > 0}
          {@render batchActions({ selectedIds: [...selectedIds], selection: batchSelectionSnapshot() })}
        {/if}
        {#if !allMatchingSelected && canSelectAllMatching && selectedCount < matchingTotal}
          <Button variant="outline" size="sm" disabled={confirmPending || confirmOpen} onclick={selectAllMatching}>
            <Rows class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" data-icon="inline-start" aria-hidden="true" />
            {i18n.t('common.selectAllMatching', { count: matchingTotal })}
          </Button>
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
                <Button size="sm" class="svadmin-u-36e579c0b41c" onclick={() => { listState.pagination = { ...pagination, current: 1 }; }}>
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
        {#if exportTaskName}
          <ExportButton
            resource={resourceName}
            taskName={exportTaskName}
            {...definedOptions({ taskProvider: exportTaskProvider, taskIdempotencyKey: exportTaskIdempotencyKey, maxItemCount: exportMaxItemCount })}
            format={exportFormat}
            filters={activeFilters}
            sorters={sorters}
            hideText
            accessControl={{ enabled: acEnabled, hideIfUnauthorized: true }}
          />
        {:else}
          <TooltipButton tooltip={i18n.t("common.export")} variant="outline" size="sm" class="svadmin-u-e7a768f922d2 svadmin-u-0b91436debbd" onclick={exportCSV}>
            <Download class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" aria-hidden="true" />
          </TooltipButton>
        {/if}
      {/if}

      {#if showDensitySwitcher}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <TooltipButton tooltip={i18n.t("common.density")} variant="outline" size="sm" class="svadmin-u-e7a768f922d2 svadmin-u-0b91436debbd" {...props}>
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
          {#snippet child({ props }: { props: Record<string, unknown> })}
            <TooltipButton tooltip={i18n.t("common.columns")} variant="outline" size="sm" class="svadmin-u-e7a768f922d2 svadmin-u-0b91436debbd" {...props}>
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
      <Popover.Root bind:open={savedViewModel.savedViewsOpen}>
        <Popover.Trigger>
          {#snippet child({ props })}
            <Button variant="outline" size="sm" class="svadmin-u-e7a768f922d2 svadmin-u-0b91436debbd" {...props} disabled={!preferenceIdentityReady} aria-label={i18n.t("common.savedViews")}>
              <Bookmark class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" /> {savedViewModel.activeSavedViewName ?? i18n.t("common.savedViews")}
            </Button>
          {/snippet}
        </Popover.Trigger>
        <Popover.Content align="end" class="svadmin-u-7ab81aede9d8">
          <div class="svadmin-u-6ed543e2fbbb">
            <div>
              <h4 class="svadmin-u-2689f3958069 svadmin-u-fc7473ca09eb">{i18n.t("common.savedViews")}</h4>
              <p class="svadmin-u-b6b02c0ebef6 svadmin-u-359090c2d529 svadmin-u-bfa603190748">{i18n.t("common.savedViewsHint")}</p>
            </div>
            {#if savedViewModel.remoteViewsLoading}
              <p role="status">{i18n.t('common.loading')}</p>
            {:else if savedViewModel.remoteViewsFailed}
              <p role="alert">{i18n.t('common.operationFailed')}</p>
              <Button type="button" variant="outline" size="sm" onclick={() => savedViewModel.reload()}>
                {i18n.t('common.retry')}
              </Button>
            {/if}
            {#if savedViewModel.savedViewMutationPending}
              <p role="status">{i18n.t('common.loading')}</p>
            {:else if savedViewModel.savedViewMutationError}
              <p role="alert">{i18n.t(savedViewModel.savedViewMutationError === 'conflict' ? 'common.viewConflict' : 'common.operationFailed')}</p>
              <Button type="button" variant="outline" size="sm" onclick={() => savedViewModel.reload()}>
                {i18n.t('common.refresh')}
              </Button>
            {/if}
            {#if savedViewProvider?.save}
              <Select.Root aria-label={i18n.t('common.viewSource')} value={savedViewModel.savedViewSource} disabled={savedViewModel.savedViewMutationPending}
                onchange={(event: Event) => {
                  if (!(event.currentTarget instanceof HTMLSelectElement)) return;
                  const value = event.currentTarget.value;
                  if (value === 'local' || value === 'team' || value === 'system') savedViewModel.savedViewSource = value;
                }}>
                <option value="local">{i18n.t('common.personalView')}</option>
                <option value="team">{i18n.t('common.teamView')}</option>
                <option value="system">{i18n.t('common.systemView')}</option>
              </Select.Root>
            {/if}
            <div class="svadmin-u-da7c36cd8867">
              <label class="svadmin-u-359090c2d529 svadmin-u-bfa603190748" for="saved-list-view">{i18n.t("common.currentView")}</label>
              <Select.Root
                id="saved-list-view"
                class="svadmin-u-e7a768f922d2 svadmin-u-6da6a3c3f741"
                value={savedViewModel.activeSavedViewId ?? ""}
                onchange={(event: Event) => {
                  if (!(event.currentTarget instanceof HTMLSelectElement)) return;
                  const id = event.currentTarget.value;
                  const view = savedViewModel.availableSavedViews.find((candidate) => candidate.id === id);
                  if (view) applySavedView(view);
                  else savedViewModel.clearActiveSavedView();
                }}
              >
                <option value="">{i18n.t("common.currentView")}</option>
                {#each savedViewModel.availableSavedViews as view (view.id)}
                  <option value={view.id}>{view.name}</option>
                {/each}
              </Select.Root>
            </div>
            <div class="svadmin-u-60fbb7713999 svadmin-u-77a2a20e90d4">
              <Input
                aria-label={i18n.t("common.viewName")}
                placeholder={i18n.t("common.viewName")}
                maxlength={60}
                bind:value={savedViewModel.savedViewName}
                disabled={savedViewModel.savedViewMutationPending}
                class="svadmin-u-e7a768f922d2"
              />
              <Button size="sm" class="svadmin-u-012fbd121f37" disabled={!savedViewModel.savedViewName.trim() || savedViewModel.savedViewMutationPending || savedViewModel.savedViewMutationError === 'conflict'} onclick={saveCurrentView}>
                <Check class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3" data-icon="inline-start" /> {i18n.t("common.saveView")}
              </Button>
            </div>
            {#if savedViewModel.availableSavedViews.length > 0}
              <div class="svadmin-u-da7c36cd8867 svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-f46b61a9b310">
                {#each savedViewModel.availableSavedViews as view (view.id)}
                  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-fc7473ca09eb">
                    <span class="svadmin-u-7e0b7cdf1a94 svadmin-u-f283ea9bea0e">{view.name}</span>
                    {#if (view.source === 'team' || view.source === 'system') && savedViewProvider?.setDefault}
                      <button
                        type="button"
                        class="svadmin-u-52083e7da442 svadmin-u-012fbd121f37 svadmin-u-bfa603190748"
                        aria-label={`${i18n.t(view.default ? 'common.unsetDefaultView' : 'common.setDefaultView')} ${view.name}`}
                        aria-pressed={view.default === true}
                        title={i18n.t(view.default ? 'common.unsetDefaultView' : 'common.setDefaultView')}
                        disabled={view.readOnly === true || !view.version || savedViewModel.savedViewMutationPending || savedViewModel.savedViewMutationError === 'conflict'}
                        onclick={() => setRemoteDefault(view)}
                      >
                        <Star class={view.default ? "svadmin-u-e83a7042bc91" : ""} fill={view.default ? "currentColor" : "none"} />
                      </button>
                    {/if}
                    {#if (view.source === 'team' || view.source === 'system') && savedViewProvider?.updateAccess}
                      {@const draft = accessDrafts.get(view.id)}
                      {@const accessMode = draft?.mode ?? view.access?.mode ?? ''}
                      <Select.Root
                        aria-label={`${i18n.t('common.viewAccess')} ${view.name}`}
                        value={accessMode}
                        disabled={view.readOnly !== false || !view.version || savedViewModel.savedViewMutationPending || savedViewModel.savedViewMutationError === 'conflict'}
                        onchange={(event: Event) => {
                          if (!(event.currentTarget instanceof HTMLSelectElement)) return;
                          const mode = event.currentTarget.value;
                          if (mode === 'team' || mode === 'organization' || mode === 'restricted') {
                            accessDrafts.set(view.id, {
                              mode,
                              subjectIds: draft?.subjectIds ?? view.access?.subjectIds ?? [],
                            });
                            if (mode === 'restricted') loadAccessSubjects(view);
                          }
                        }}
                      >
                        <option value="" disabled>{i18n.t('common.selectOption')}</option>
                        <option value="team">{i18n.t('common.teamView')}</option>
                        <option value="organization">{i18n.t('common.accessOrganization')}</option>
                        <option value="restricted">{i18n.t('common.accessRestricted')}</option>
                      </Select.Root>
                      {#if accessMode === 'restricted'}
                        {#if savedViewProvider.listAccessSubjects}
                          {@const selected = draft?.subjectIds ?? view.access?.subjectIds ?? []}
                          <div>
                            <Input
                              aria-label={`${i18n.t('common.search')} ${view.name}`}
                              value={accessSubjectQueries.get(view.id) ?? ''}
                              disabled={view.readOnly !== false || savedViewModel.savedViewMutationPending}
                              oninput={(event: Event) => {
                                if (!(event.currentTarget instanceof HTMLInputElement)) return;
                                accessSubjectQueries.set(view.id, event.currentTarget.value);
                                loadAccessSubjects(view, event.currentTarget.value);
                              }}
                            />
                            <Button type="button" size="sm" variant="outline"
                              aria-label={`${i18n.t('common.refresh')} ${view.name}`}
                              disabled={view.readOnly !== false || savedViewModel.savedViewMutationPending}
                              onclick={() => loadAccessSubjects(view, accessSubjectQueries.get(view.id) ?? '')}>
                              <RefreshCw />
                            </Button>
                            {#if accessSubjectsLoading.get(view.id)}
                              <span role="status">{i18n.t('common.loading')}</span>
                            {:else if accessSubjectsFailed.get(view.id)}
                              <span role="alert">{i18n.t('common.operationFailed')}</span>
                            {:else if accessSubjects.has(view.id) && !accessSubjects.get(view.id)?.length}
                              <span role="status">{i18n.t('common.noData')}</span>
                            {/if}
                            {#each selected as id (id)}
                              <label>
                                <input type="checkbox" checked
                                  disabled={view.readOnly !== false || savedViewModel.savedViewMutationPending || savedViewModel.savedViewMutationError === 'conflict'}
                                  onchange={() => accessDrafts.set(view.id, {
                                    mode: 'restricted', subjectIds: selected.filter(candidate => candidate !== id),
                                  })} />
                                {accessSubjects.get(view.id)?.find(subject => subject.id === id)?.label ?? id}
                              </label>
                            {/each}
                            {#each (accessSubjects.get(view.id) ?? []).filter(subject => !selected.includes(subject.id)) as subject (subject.id)}
                              <label>
                                <input type="checkbox"
                                  disabled={view.readOnly !== false || savedViewModel.savedViewMutationPending || savedViewModel.savedViewMutationError === 'conflict' || selected.length >= 200}
                                  onchange={() => accessDrafts.set(view.id, {
                                    mode: 'restricted', subjectIds: [...selected, subject.id],
                                  })} />
                                {subject.label}
                              </label>
                            {/each}
                          </div>
                        {:else}
                        <Input
                          aria-label={`${i18n.t('common.accessSubjects')} ${view.name}`}
                          value={(draft?.subjectIds ?? view.access?.subjectIds ?? []).join(', ')}
                          disabled={view.readOnly !== false || !view.version || savedViewModel.savedViewMutationPending || savedViewModel.savedViewMutationError === 'conflict'}
                          oninput={(event: Event) => {
                            if (event.currentTarget instanceof HTMLInputElement) {
                              accessDrafts.set(view.id, { mode: 'restricted', subjectIds: event.currentTarget.value.split(',').map(id => id.trim()) });
                            }
                          }}
                        />
                        {/if}
                      {/if}
                      <Button type="button" size="sm"
                        aria-label={`${i18n.t('common.saveAccess')} ${view.name}`}
                        disabled={!draft || view.readOnly !== false || !view.version
                          || savedViewModel.savedViewMutationPending || savedViewModel.savedViewMutationError === 'conflict'
                          || (draft.mode === 'restricted' && !decodeSavedListViewAccess(draft))}
                        onclick={() => saveRemoteAccess(view)}>
                        {i18n.t('common.saveAccess')}
                      </Button>
                    {/if}
                    <button
                      type="button"
                      class="svadmin-u-52083e7da442 svadmin-u-cc46d0fa277d svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-bfa603190748 svadmin-u-8e551981c8d7 svadmin-u-ea7b2e9e070e svadmin-u-f10f771f87e9 svadmin-u-793c80e97ffb svadmin-u-9c1295a6914a"
                      aria-label="{i18n.t("common.delete")} {view.name}"
                      title="{i18n.t("common.delete")} {view.name}"
                      disabled={view.readOnly === true || savedViewModel.savedViewMutationPending || savedViewModel.savedViewMutationError === 'conflict'
                        || (!!view.source && !savedViewProvider?.remove)}
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
          onclick={refreshList}
        >
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
            onclick={listState.clearSearch}
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
    {#if listPermission.isLoading || (query.isLoading && !query.isError)}
      <Table.Root density={currentDensity}>
        <Table.Header>
          {#each tableView.headerGroups as headerGroup, _i (_i)}
            {@const visibleHeaders = headerGroup.headers.filter((header: Header<TableFeatures, TableRecord, unknown>) => isColumnVisible(header.column.id))}
            <Table.Row>
              {#each visibleHeaders as header (header.id)}
                <Table.Head>
                  {#if header.id === '_actions'}
                    {i18n.t('common.actions')}
                  {:else if column_getCanSort(header.column)}
                    <Button
                      variant="ghost"
                      size="sm"
                      class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-ea7b2e9e070e svadmin-u-8ffe7a29179a svadmin-u-b8f0a08ece1e svadmin-u-660d2effb880 svadmin-u-d5eab218aa34 uppercase svadmin-u-8baf13a3e9d7 svadmin-u-7357df2b2e0c svadmin-u-e83a7042bc91"
                      onclick={() => toggleColumnSort(header.column)}
                    >
                      {visibleFields.find(field => field.key === header.id)?.label ?? header.id}
                      <span class="svadmin-u-359090c2d529 svadmin-u-0b8c506a0596">
                        {#if column_getIsSorted(header.column) === 'asc'}↑
                        {:else if column_getIsSorted(header.column) === 'desc'}↓
                        {:else}⇅
                        {/if}
                      </span>
                    </Button>
                  {:else}
                    {visibleFields.find(field => field.key === header.id)?.label ?? header.id}
                  {/if}
                </Table.Head>
              {/each}
            </Table.Row>
          {/each}
        </Table.Header>
      </Table.Root>
      <div class="svadmin-u-8e63407b5ceb svadmin-u-6ed543e2fbbb">
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
    {:else if query.error || query.isError || !pageRecords.ok}
      <DataState
        state="error"
        description={i18n.t('common.operationFailed')}
        retry={refreshList}
      />
    {:else if gridBody && pageRecords.data.length > 0}
      {@render gridBody({ records: pageRecords.data.map(copyTableRecord), columns: gridColumns, primaryKey: 'id',
        sorters: querySorters, density: currentDensity, locale: i18n.locale, label: resource.label,
        scopeKey: JSON.stringify([resourceName, queryPagination, querySorters, queryFilters, adminContext.tenantCacheKey?.__svadminTenant]),
        disabled: query.isFetching || deleteManyMutation.isPending,
        onSortChange: changeGridSort, cell: renderGridCell, controls: renderGridControls, after: renderGridAfter })}
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
                          aria-label={i18n.t(allMatchingSelected ? 'common.clearSelection' : 'common.selectAllOnPage')}
                          checked={allMatchingSelected || table_getIsAllRowsSelected(tbl)}
                          onCheckedChange={toggleAllRowsSelection}
                        />
                      {:else if !acEnabled || deleteResourcePermission.isLoading || deleteResourcePermission.allowed}
                          <Checkbox
                            aria-label={i18n.t(allMatchingSelected ? 'common.clearSelection' : 'common.selectAllOnPage')}
                            checked={allMatchingSelected || table_getIsAllRowsSelected(tbl)}
                            onCheckedChange={toggleAllRowsSelection}
                          />
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
                                disabled={confirmPending}
                                onCheckedChange={() => toggleRowSelection(row)}
                              />
                            {:else}
                              <CanAccess resource={resourceName} action="delete" params={{ id }}>
                                <Checkbox
                                  aria-label={i18n.t('common.selectRow', { id })}
                                  checked={rowIsSelected(row.id)}
                                  disabled={confirmPending}
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
                                {@render defaultRowActions(id)}
                              {/if}
                            </div>
                          {:else}
                            {@const field = visibleFields.find(f => f.key === cell.column.id)}
                            {@const customColumn = field ? customColumns?.[field.key] : undefined}
                            {#if customColumn}
                              {@render customColumn({ value: clonePlainValue(cell_getValue(cell)), record: copyTableRecord(record) })}
                            {:else if defaultCellRenderer && field}
                              {@render defaultCellRenderer({ field, value: clonePlainValue(cell_getValue(cell)), record: copyTableRecord(record) })}
                            {:else if canEdit && field && field.showInEdit !== false && writableFields.has(field.key) && field.key !== primaryKey && field.key !== 'id' && ['text', 'number', 'email', 'url'].includes(field.type)}
                              <CanAccess resource={resourceName} action="edit" params={{ id }}>
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
                              <FieldDisplay type={field.type} value={cell_getValue(cell)} options={field.options} resourceName={field.resource} />
                            {/if}
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
                    {@render defaultEmptyState()}
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
          {#if summary}
            <Table.Footer class="svadmin-u-2859c861d7de svadmin-u-2689f3958069">
              {@render summary({ data: pageRecords.data.map(copyTableRecord), total: query.data?.total ?? 0, visibleColumnsCount: columns.filter((c) => c.id != null && isColumnVisible(c.id)).length })}
            </Table.Footer>
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
                        disabled={confirmPending}
                        onCheckedChange={() => toggleRowSelection(row)}
                      />
                    {:else}
                      <CanAccess resource={resourceName} action="delete" params={{ id }}>
                        <Checkbox
                          aria-label={i18n.t('common.selectRow', { id })}
                          checked={rowIsSelected(row.id)}
                          disabled={confirmPending}
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
                    {@render defaultRowActions(id)}
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
                        {id}
                      {:else}
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
                {@render defaultEmptyState()}
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
            listState.pagination = { ...pagination, pageSize: size, current: 1 };
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
  oncancel={deletionModel.cancel}
/>

{#if detailRecordId != null}
  <RecordDetailDrawer
    rendering={activeRendering}
    resourceName={resourceName}
    open={detailOpen}
    recordId={detailRecordId}
    onClose={closeDetail}
  />
{/if}

{#if quickEditId != null && canRead && canEdit}
  {#key quickEditId}
    <QuickEditDrawer rendering={activeRendering} {resourceName} recordId={quickEditId} onClose={() => quickEditId = undefined} />
  {/key}
{/if}
