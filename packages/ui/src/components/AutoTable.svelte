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
  import { useQueryClient } from '@tanstack/svelte-query';
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

  import { captureAdminContext, captureAuthSession, useGetIdentity, getContractFormFields, useNavigation, useParsed, useResourceContract, useList, useDeleteMany, downloadData, type ExportFormat, type TaskProvider, parseQueryKey } from '@svadmin/core';
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
  import {
    captureSavedListViewState, cloneListStateSnapshot, createListState, type ListStateSnapshot,
  } from './list-state.svelte.js';
  import { createListSelection } from './list-selection.svelte.js';
  import { createListColumnPreferences } from './list-column-preferences.svelte.js';
  import { createListDeletion } from './list-deletion.svelte.js';
  import {
    canMigrateLegacyListPreferences,
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
    Plus, Pencil, Trash2,
    Search, Download, ChevronDown, ChevronUp, SlidersHorizontal, Filter as FilterIcon,
    Eye, Copy, RefreshCw, Rows, X
  } from '@lucide/svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import BatchActionBar from './BatchActionBar.svelte';
  import RecordDetailDrawer from './RecordDetailDrawer.svelte';
  import DetailWorkspaceSections from './DetailWorkspaceSections.svelte';
  import type { DetailWorkspaceSectionsConfig } from './detail-workspace.js';
  import QuickEditDrawer from './QuickEditDrawer.svelte';
  import RecordRowActions from './RecordRowActions.svelte';
  import CanAccess from './CanAccess.svelte';
  import TooltipButton from './TooltipButton.svelte';
  import SavedViewsMenu from './SavedViewsMenu.svelte';
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
    /** @deprecated Retained for compatibility; comfortable is the shared default. */
    density?: 'compact' | 'comfortable';
    showHeader?: boolean;
    title?: string;
    showFilterTags?: boolean;
    /** @deprecated Retained for compatibility; use the shared appearance baseline. */
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
    /** 受控展开行 ID；提供后内部展开状态只读。 */
    expandedRowKeys?: (string | number)[];
    /** 非受控模式下的初始展开行 ID。 */
    defaultExpandedRowKeys?: (string | number)[];
    /** 展开状态变化回调，参数为记录 ID。 */
    onExpandedRowsChange?: (keys: (string | number)[]) => void;
    /** Externally controlled pagination */
    pagination?: { current: number; pageSize: number };
    /** Externally controlled sorters */
    sorters?: Sort[];
    /** 初次挂载时恢复的查询快照；优先级低于受控分页/排序和已启用的 URL 状态。 */
    initialListState?: ListStateSnapshot | undefined;
    /** 查询快照变化回调；搜索在 debounce 应用后才触发。 */
    onListStateChange?: ((state: ListStateSnapshot) => void) | undefined;
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
    /** Optional record-scoped detail workspace sections. Audit uses the existing AuditLogProvider. */
    detailWorkspace?: DetailWorkspaceSectionsConfig;
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
    expandedRowKeys,
    defaultExpandedRowKeys,
    onExpandedRowsChange,
    batchActions,
    summary,
    pagination: externalPagination,
    sorters: externalSorters,
    initialListState,
    onListStateChange,
    deleteVariables,
    savedViewProvider,
    applyRemoteDefaultView = false,
    exportTaskName,
    exportTaskProvider,
    exportTaskIdempotencyKey,
    exportFormat = 'csv',
    exportMaxItemCount,
    detailWorkspace,
  }: Props = $props();

  let densityOverride = $state<'compact' | 'comfortable' | undefined>(undefined);
  const currentDensity = $derived(densityOverride ?? density);
  const adminContext = captureAdminContext();
  const queryClient = useQueryClient();
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
  const initialListStateSnapshot = untrack(() => initialListState
    ? cloneListStateSnapshot(initialListState)
    : undefined);
  const initialPreferenceScope: ListPreferenceScope = untrack(() => listPreferenceScope);
  const initialPreferenceSessionKey = untrack(() => preferenceSession.cacheKey);
  let initialListStateRetired = !initialListStateSnapshot;
  let initialIdentityHydrationPending = !!initialListStateSnapshot
    && initialPreferenceScope.identityKey?.startsWith('unresolved:') === true;

  function sameScopeExceptIdentity(left: ListPreferenceScope, right: ListPreferenceScope): boolean {
    return left.resourceName === right.resourceName
      && left.providerName === right.providerName
      && left.tenantIdentity === right.tenantIdentity;
  }

  function initialListStateApplies(scope: ListPreferenceScope): boolean {
    return !!initialListStateSnapshot && !initialListStateRetired
      && sameScopeExceptIdentity(scope, initialPreferenceScope);
  }

  const savedViewModel = createSavedListViews({
    scope: () => listPreferenceScope,
    columns: () => savedViewColumnIds,
    provider: () => savedViewProvider,
    isScopeLoaded: preferenceScopeIsLoaded,
    readPreference: readScopedPreference,
    hasExplicitURLState,
    initialStateOverridesSavedView: !!initialListStateSnapshot,
    canApplyRemoteDefault: () => applyRemoteDefaultView && !externalPagination && !externalSorters
      && !initialListStateApplies(listPreferenceScope),
    captureState: () => {
      listState.flushSearch();
      return getCurrentSavedViewState();
    },
    applyState: applySavedViewState,
  });
  const { markSavedViewDirty, applySavedView } = savedViewModel;
  const initialViewState = savedViewModel.initialSavedView?.state;
  // 活动视图可能在本作用域首次挂载前就已恢复；初始密度需与初始查询/列偏好一起水合。
  if (initialViewState?.density) densityOverride = initialViewState.density;

  // The table can stay mounted while the surrounding tenant/provider changes.
  // Keep persistence effects paused until the new scope has been loaded.
  let loadedPreferenceScopeId = $state(untrack(() => listPreferenceScopeId(listPreferenceScope)));
  const queryScopeReady = $derived(loadedPreferenceScopeId === listPreferenceScopeId(listPreferenceScope));

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
    initialListState: initialListStateSnapshot,
    initialViewState,
    syncWithLocation: () => syncWithLocation,
    writeURLState: (state) => writeURLState(state, adminContext),
    onDirty: markSavedViewDirty,
    onStateChange: (state) => onListStateChange?.(state),
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
    errorNotification: false,
    // 作用域恢复完成前不发送查询，避免把旧作用域快照作为新作用域的首帧请求。
    get queryOptions() { return { enabled: canRead && queryScopeReady }; },
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
  const expandedAtom = createAtom<ExpandedState>(
    Object.fromEntries((untrack(() => defaultExpandedRowKeys) ?? []).map((id) => [tableRowKey(id), true])),
  );
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

  /** 受控时以外部 ID 为准；空数组同样表示受控且全部收起。 */
  const controlledExpandedKeys = $derived(
    expandedRowKeys ? new Set(expandedRowKeys.map((id) => tableRowKey(id))) : undefined,
  );

  function rowIsExpanded(rowId: string): boolean {
    if (controlledExpandedKeys) return controlledExpandedKeys.has(rowId);
    const expanded = tableExpanded.current;
    return expanded === true || expanded[rowId] === true;
  }

  function expandedRecordIds(): (string | number)[] {
    if (expandedRowKeys !== undefined) return [...expandedRowKeys];
    const current = tableExpanded.current;
    const rows = table_getRowModel(tbl).flatRows;
    if (current === true) return rows.map((row) => row.original.id);
    return rows.filter((row) => current[row.id]).map((row) => row.original.id);
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
    return captureSavedListViewState(
      listState.captureState(), columnPreferences.captureState(), initPageSize, densityOverride,
    );
  }

  function applySavedViewState(state: SavedListViewState): void {
    listState.applyState(state);
    sortingAtom.set(listState.sorters.map((sorter) => ({ id: sorter.field, desc: sorter.order === 'desc' })));
    columnPreferences.applyState(state);
    densityOverride = state.density;
    selectionModel.reset();
  }

  function resetToDefaultListState(): void {
    densityOverride = undefined;
    listState.resetToDefaults();
    if (!externalSorters) {
      sortingAtom.set(listState.sorters.map((sorter) => ({ id: sorter.field, desc: sorter.order === 'desc' })));
    }
  }

  $effect(() => {
    const scope = listPreferenceScope;
    const scopeId = listPreferenceScopeId(scope);
    if (scopeId === loadedPreferenceScopeId) return;

    if (initialListStateSnapshot) {
      const identityHydration = initialIdentityHydrationPending
        && sameScopeExceptIdentity(scope, initialPreferenceScope)
        && preferenceSession.cacheKey === initialPreferenceSessionKey
        && scope.identityKey !== undefined
        && !scope.identityKey.startsWith('unresolved:');
      if (identityHydration) {
        initialIdentityHydrationPending = false;
      } else {
        initialListStateRetired = true;
        initialIdentityHydrationPending = false;
      }
    }

    const activeSavedView = savedViewModel.restoreScope(scope);
    const restoredColumns = columnPreferences.readScope(scope);

    if (!hasExplicitURLState && initialListStateApplies(scope)) {
      // 挂载快照已由 createListState 应用；首次身份 hydrate 只保留用户编辑，不重放快照。
      // 初始快照优先于旧活动视图时取消活动标记，但不删除保存视图或写入其他作用域。
      savedViewModel.clearActiveSavedView();
      columnPreferences.applyState(restoredColumns);
      selectionModel.reset();
    } else if (!hasExplicitURLState && activeSavedView) {
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
    const row = table_getRowModel(tbl).flatRows.find((candidate) => candidate.id === rowId);
    const recordId = row?.original.id;
    if (recordId === undefined) return;
    const nextIds = rowIsExpanded(rowId)
      ? expandedRecordIds().filter((id) => tableRowKey(id) !== rowId)
      : [...expandedRecordIds(), recordId];
    if (expandedRowKeys === undefined) {
      expandedAtom.set(Object.fromEntries(nextIds.map((id) => [tableRowKey(id), true])));
    }
    onExpandedRowsChange?.(nextIds);
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
  let detailOpenedId = $state<string | number | undefined>();
  let detailRouteChangedInHistory = $state(false);
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
      detailOpenedId = undefined;
      detailRouteChangedInHistory = false;
      localDetailId = undefined;
      quickEditId = undefined;
      const queryScopeChanged = previousTableScope.contract !== scope.contract
        || previousTableScope.resourceName !== scope.resourceName
        || previousTableScope.provider !== scope.provider
        || previousTableScope.meta !== scope.meta
        || previousTableScope.tenant !== scope.tenant
        || previousTableScope.auth !== scope.auth
        || previousTableScope.router !== scope.router
        || previousTableScope.permissionProvider !== scope.permissionProvider;
      if (queryScopeChanged) {
        listState.cancelSearch();
        if (previousTableScope.resourceName !== scope.resourceName) resetToDefaultListState();
      }
    }
    previousTableScope = scope;
  });
  function openDetail(id: string | number): void {
    if (!canRead || !canShow) return;
    if (!syncWithLocation) { localDetailId = id; return; }
    detailOpenedInHistory = true;
    detailOpenedId = id;
    detailRouteChangedInHistory = false;
    writeURLState({ detailId: formatContractRouteId(binding.resource, id) }, adminContext, 'push');
  }
  $effect.pre(() => {
    if (!detailOpenedInHistory || detailOpenedId == null || detailRecordId == null) return;
    if (String(detailRecordId) !== String(detailOpenedId)) detailRouteChangedInHistory = true;
  });
  function closeDetail(): void {
    if (!syncWithLocation) { localDetailId = undefined; return; }
    if (detailOpenedInHistory && adminContext.routerProvider) {
      const routeChanged = detailRouteChangedInHistory;
      detailOpenedInHistory = false;
      detailOpenedId = undefined;
      detailRouteChangedInHistory = false;
      // The drawer can move to another record without unmounting (next/previous).
      // Once that happened, the top history entry may be a detail route even if
      // the current record is the originally opened one (A -> B -> A), so a single
      // back() could reopen another record instead of closing.
      if (routeChanged) {
        writeURLState({ detailId: undefined }, adminContext);
        return;
      }
      adminContext.routerProvider.back();
      return;
    }
    detailOpenedInHistory = false;
    detailOpenedId = undefined;
    detailRouteChangedInHistory = false;
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
  function refreshPermission() {
    const resource = resourceName;
    void queryClient.invalidateQueries({
      predicate: query => {
        const parsed = parseQueryKey(query.queryKey);
        return parsed?.kind === 'access' && parsed.resource === resource;
      },
    }).catch(() => {});
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
                              <span class="block truncate font-mono text-xs" title={String(cell_getValue(cell) ?? '—')}>{cell_getValue(cell) ?? '—'}</span>
                            {:else if field}
                              <FieldDisplay type={field.type} value={cell_getValue(cell)} options={field.options} resourceName={field.resource} />
                            {/if}
                          {/if}
            </div>
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
  <DataState
    state={hasCriteria ? 'filtered-empty' : 'empty'}
    description={i18n.t(hasCriteria
      ? 'empty.description'
      : canCreate ? 'common.noDataHint' : 'common.noData')}
  >
    {#snippet action()}
      {#if hasCriteria}
        <Button variant="outline" size="sm" onclick={clearFilters}>
          <X class="h-4 w-4" />
          {i18n.t('common.clearAllFilters')}
        </Button>
      {:else if canCreate}
        <Button variant="outline" size="sm" onclick={() => navigation.create(resourceName)}>
          <Plus class="h-4 w-4" />
          {i18n.t('common.create')}
        </Button>
      {/if}
    {/snippet}
  </DataState>
{/snippet}

<div class="space-y-3" data-svadmin-rendering-resource={activeRendering?.resource.name} data-svadmin-rendering-kind={activeRendering ? 'table' : undefined}>
  {#if operationError}<p role="alert">{operationError}</p>{/if}
  {#if detailState.invalid}<p role="alert">{i18n.t('common.operationFailed')}</p>{/if}
  {#if showHeader}
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-lg sm:text-xl font-semibold text-foreground">{title ?? resource.label}</h1>
      <div class="flex flex-wrap items-center gap-2">
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
              <Download class="h-4 w-4" data-icon="inline-start" /> {i18n.t("common.export")}
            </Button>
          {/if}
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

  {#if selectedCount > 0 || allMatchingSelected || (deleteRequest?.batch && deleteManyMutation.isPending)}
    <div data-svadmin-batch-toolbar>
      <BatchActionBar
        {selectedCount}
        selectedLabel={selectionLabel}
        ariaLabel={selectionLabel}
        forceVisible={allMatchingSelected}
        pending={deleteManyMutation.isPending}
        onclear={clearSelection}
      >
        {#if batchActions && selectionReady && selectedCount > 0}
          {@render batchActions({ selectedIds: [...selectedIds], selection: batchSelectionSnapshot() })}
        {/if}
        {#if !allMatchingSelected && canSelectAllMatching && selectedCount < matchingTotal}
          <Button variant="outline" size="sm" disabled={confirmPending || confirmOpen} onclick={selectAllMatching}>
            <Rows class="h-3.5 w-3.5" data-icon="inline-start" aria-hidden="true" />
            {i18n.t('common.selectAllMatching', { count: matchingTotal })}
          </Button>
        {/if}
        {#if canBatchDelete}
          <Button
            variant="destructive"
            size="sm"
            class="h-8 text-xs whitespace-nowrap"
            disabled={deleteManyMutation.isPending}
            onclick={confirmBatchDelete}
          >
            <Trash2 class="h-3.5 w-3.5" data-icon="inline-start" aria-hidden="true" /> {i18n.t("common.batchDelete", { count: selectedCount })}
          </Button>
        {/if}
      </BatchActionBar>
    </div>
  {/if}

  <!-- Search, Filter & Table Utility Toolbar -->
  <div class="flex flex-wrap items-center justify-between gap-2">
    <!-- Left: Search and Advanced Filters -->
    <div class="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
      {#if searchableFields.length > 0}
        <div class="relative max-w-sm flex-1 sm:min-w-[220px]">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
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
                <FilterIcon class="h-4 w-4" data-icon="inline-start" aria-hidden="true" />
                {i18n.t("common.filter")}
                {#if activeFilterCount > 0}
                  <Badge variant="secondary" class="ml-1 h-5 min-w-5 px-1 tabular-nums">{activeFilterCount}</Badge>
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
                      class="h-9 text-sm"
                    />
                  {/if}
                </div>
              {/each}
              <div class="flex gap-2 pt-2">
                <Button size="sm" class="flex-1" onclick={() => { listState.pagination = { ...pagination, current: 1 }; }}>
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
          <TooltipButton tooltip={i18n.t("common.export")} variant="outline" size="sm" class="h-9 px-2.5" onclick={exportCSV}>
            <Download class="h-4 w-4" aria-hidden="true" />
          </TooltipButton>
        {/if}
      {/if}

      {#if showDensitySwitcher}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <TooltipButton tooltip={i18n.t("common.density")} variant="outline" size="sm" class="h-9 px-2.5" {...props}>
                <Rows class="h-4 w-4" aria-hidden="true" />
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
          {#snippet child({ props }: { props: Record<string, unknown> })}
            <TooltipButton tooltip={i18n.t("common.columns")} variant="outline" size="sm" class="h-9 px-2.5" {...props}>
              <SlidersHorizontal class="h-4 w-4" />
            </TooltipButton>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="w-48">
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

      <SavedViewsMenu savedViews={savedViewModel} disabled={!preferenceIdentityReady} />

      {#if showRefresh}
        <TooltipButton
          tooltip={i18n.t("common.refresh")}
          variant="outline"
          size="sm"
          class="h-9 px-2.5"
          onclick={refreshList}
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
            onclick={listState.clearSearch}
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
                      class="flex items-center gap-1 hover:text-foreground -ml-2 h-auto py-1 px-2 uppercase tracking-wide text-[0.7rem] font-semibold"
                      onclick={() => toggleColumnSort(header.column)}
                    >
                      {visibleFields.find(field => field.key === header.id)?.label ?? header.id}
                      <span class="text-xs opacity-50">
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
    {:else if listPermission.isError}
      <p role="alert">{i18n.t('common.permissionUnavailable')}</p>
      <Button type="button" variant="outline" onclick={refreshPermission}>
        {i18n.t('common.retry')}
      </Button>
    {:else if !canRead}
      <p role="alert">{i18n.t('common.permissionDenied')}</p>
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
        <div class="hidden md:block">
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
                    class={cn('border-b border-border bg-muted/25 font-medium tracking-normal text-muted-foreground hover:bg-muted/40', dragProps.class)}
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
              {@const record = copyTableRecord(row.original)}
              {@const id = rowIdValue(row)}
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
                              <span class="block truncate font-mono text-xs" title={String(cell_getValue(cell) ?? '—')}>{cell_getValue(cell) ?? '—'}</span>
                            {:else if field}
                              <FieldDisplay type={field.type} value={cell_getValue(cell)} options={field.options} resourceName={field.resource} />
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
                    {@render defaultEmptyState()}
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
          {#if summary}
            <Table.Footer class="bg-muted/30 font-medium">
              {@render summary({ data: pageRecords.data.map(copyTableRecord), total: query.data?.total ?? 0, visibleColumnsCount: columns.filter((c) => c.id != null && isColumnVisible(c.id)).length })}
            </Table.Footer>
          {/if}
        </Table.Root>
        </div>

        <!-- Mobile Card View (visible only on small screens) -->
        <div class="md:hidden space-y-3 p-2">
          {#each tableView.rows as row, _i (_i)}
            {@const record = copyTableRecord(row.original)}
            {@const id = rowIdValue(row)}
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
                  <span class="text-xs font-mono text-muted-foreground">#{id}</span>
                </div>
                <div class="flex items-center gap-1">
                  {#if rowActions}
                    {@render rowActions({ record, id })}
                  {:else}
                    {@render defaultRowActions(id)}
                  {/if}
                </div>
              </div>
              <!-- Card fields -->
              <div class="space-y-2">
                {#each visibleFields.filter((field) => isColumnVisible(field.key)).slice(0, 6) as field (field.key)}
                  {@const value = record[field.key]}
                  {@const customColumn = customColumns?.[field.key]}
                  <div class="flex items-start justify-between gap-4">
                    <span class="text-xs font-medium text-muted-foreground shrink-0">{field.label}</span>
                    <span class="text-sm text-right truncate max-w-[60%]">
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
            <div class="text-center py-10 text-muted-foreground">
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
  <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-2 text-sm text-muted-foreground">
    <div class="flex shrink-0 items-center gap-3 leading-8">
      <span class="shrink-0 whitespace-nowrap tabular-nums">{i18n.t('common.total', { total: query.data?.total ?? 0 })}</span>
      <Select.Root
        aria-label={i18n.t('common.perPage')}
        class="h-8 w-[78px] shrink-0 tabular-nums"
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
                class="tabular-nums"
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

{#snippet workspaceSections()}
  {#if detailRecordId != null && detailWorkspace}
    <DetailWorkspaceSections
      {resourceName}
      recordId={detailRecordId}
      sections={detailWorkspace}
    />
  {/if}
{/snippet}

{#if detailRecordId != null}
  <RecordDetailDrawer
    rendering={activeRendering}
    resourceName={resourceName}
    open={detailOpen}
    recordId={detailRecordId}
    onClose={closeDetail}
    {...definedOptions({ extraSections: detailWorkspace ? workspaceSections : undefined })}
  />
{/if}

{#if quickEditId != null && canRead && canEdit}
  {#key quickEditId}
    <QuickEditDrawer rendering={activeRendering} {resourceName} recordId={quickEditId} onClose={() => quickEditId = undefined} />
  {/key}
{/if}
