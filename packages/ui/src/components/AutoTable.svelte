<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { cn } from '../utils.js';
  import {
    createTable,
    createCoreRowModel,
    type ColumnDef,
    type SortingState,
    type RowSelectionState,
    type ColumnVisibilityState,
    type ExpandedState,
  } from '@tanstack/svelte-table';
  import type { Column, Header, TableFeatures } from '@tanstack/table-core';
  import { createAtom, useSelector } from '@tanstack/svelte-store';
  import {
    column_getCanSort,
    column_getIsSorted,
    column_toggleSorting,
    column_toggleVisibility,
    header_getSize,
    table_getRowModel,
    table_getAllLeafColumns,
    table_getIsAllRowsSelected,
    table_toggleAllRowsSelected,
    row_getIsSelected,
    row_toggleSelected,
    row_getVisibleCells,
    row_toggleExpanded,
    cell_getValue,
  } from '@tanstack/table-core/static-functions';

  import { captureAdminContext, useList, useDelete, useDeleteMany, getResource, notify } from '@svadmin/core';
  import type {
    BaseRecord,
    FieldDefinition,
    Filter,
    LogicalFilter,
    Pagination as PaginationState,
    Sort,
  } from '@svadmin/core';
  import { useCan, getAccessControlProvider } from '@svadmin/core';
  import { readURLState, writeURLState } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

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
  import {
    Plus, Pencil, Trash2,
    Search, Download, ChevronDown, ChevronUp, SlidersHorizontal, Filter as FilterIcon,
    Eye, Copy
  } from '@lucide/svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import TooltipButton from './TooltipButton.svelte';
  import InlineEdit from './InlineEdit.svelte';
  import DraggableHeader from './DraggableHeader.svelte';
  import type { Snippet } from 'svelte';

  const i18n = useTranslation();

  // ─── Props with Snippet composability ─────────────────────────
  interface Props {
    resourceName: string;
    selectable?: boolean;
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
    batchActions?: Snippet<[{ selectedIds: string[] }]>;
    /** Called whenever the selected row ids change. */
    onSelectionChange?: (selectedIds: string[]) => void;
  }

  let {
    resourceName,
    selectable = true,
    headerActions,
    columns: customColumns,
    defaultCellRenderer,
    rowActions,
    emptyState,
    expandedRowRender,
    batchActions,
    onSelectionChange,
    pagination: externalPagination,
    sorters: externalSorters,
  }: Props = $props();
  const adminContext = captureAdminContext();

  const resource = $derived(getResource(resourceName));
  const primaryKey = $derived(resource.primaryKey ?? 'id');

  // ─── URL state + server-side state ────────────────────────────
  const urlState = readURLState(adminContext);

  // Snapshot resource values for initial state (untrack to avoid reactive tracking)
  const storedPageSize = typeof window !== 'undefined' ? parseInt(localStorage.getItem('svadmin-default-page-size') ?? '', 10) : NaN;
  const initPageSize = untrack(() => resource.pageSize ?? (isNaN(storedPageSize) ? 10 : storedPageSize));
  const initDefaultSort = untrack(() => resource.defaultSort);

  let pagination = $state<PaginationState>(untrack(() => externalPagination ?? {
    current: urlState.page ?? 1,
    pageSize: urlState.pageSize ?? initPageSize,
  }));
  let sorters = $state<Sort[]>(untrack(() =>
    externalSorters ??
    (urlState.sortField
      ? [{ field: urlState.sortField, order: urlState.sortOrder ?? 'asc' }]
      : initDefaultSort ? [initDefaultSort] : []))
  );
  let filters = $state<Filter[]>([]);
  let searchText = $state(urlState.search ?? '');
  let appliedSearchText = $state(untrack(() => searchText));
  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleSearch(event: Event) {
    searchText = (event.currentTarget as HTMLInputElement).value;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      appliedSearchText = searchText;
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

  // URL sync
  $effect(() => {
    writeURLState({
      page: pagination.current,
      pageSize: pagination.pageSize,
      sortField: sorters[0]?.field,
      sortOrder: sorters[0]?.order,
      search: appliedSearchText || undefined,
    }, adminContext);
  });

  // ─── Build active filters with search ─────────────────────────
  const searchableFields = $derived(resource.fields.filter(f => f.searchable));
  const filterableFields = $derived(resource.fields.filter(f => f.filterable));
  let filterValues = $state<Record<string, string>>({});
  const activeFilterCount = $derived(Object.values(filterValues).filter(v => v.trim()).length);
  const activeFilters = $derived.by(() => {
    const result: Filter[] = [...filters];
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
    for (const [key, value] of Object.entries(filterValues)) {
      if (value.trim()) {
        result.push({ field: key, operator: 'contains', value: value.trim() });
      }
    }
    return result;
  });

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

  $effect(() => {
    if (Object.values(filterValues).some(v => v.trim())) {
      pagination = { ...pagination, current: 1 };
    }
  });

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
  const deleteManyResult = useDeleteMany({ get resource() { return resourceName; } });
  const deleteManyMutation = deleteManyResult.mutation;

  // ─── Permissions ──────────────────────────────────────────────
  const acEnabled = $derived(!!getAccessControlProvider());
  const canCreatePerm = useCan(() => ({ resource: resourceName, action: 'create', queryOptions: { enabled: acEnabled } }));
  const canEditPerm = useCan(() => ({ resource: resourceName, action: 'edit', queryOptions: { enabled: acEnabled } }));
  const canDeletePerm = useCan(() => ({ resource: resourceName, action: 'delete', queryOptions: { enabled: acEnabled } }));
  const canExportPerm = useCan(() => ({ resource: resourceName, action: 'export', queryOptions: { enabled: acEnabled } }));
  const canCreate = $derived(canCreatePerm.allowed && resource.canCreate !== false);
  const canEdit = $derived(canEditPerm.allowed && resource.canEdit !== false);
  const canDelete = $derived(canDeletePerm.allowed && resource.canDelete !== false);
  const canExport = $derived(canExportPerm.allowed);

  // ─── TanStack Table state ────────────────────────────────────
  const initialSorting = untrack<SortingState>(() =>
    sorters.map(s => ({ id: s.field, desc: s.order === 'desc' }))
  );
  const initialColumnVisibility = (() => {
    // Try to restore from localStorage first
    const storageKey = `svadmin-columns-${resourceName}`;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored);
      } catch { /* ignore */ }
    }
    // Fall back to resource field definitions
    const vis: ColumnVisibilityState = {};
    for (const f of resource.fields) {
      if (f.showInList === false) vis[f.key] = false;
    }
    return vis;
  })();
  const sortingAtom = createAtom(initialSorting);
  const columnVisibilityAtom = createAtom(initialColumnVisibility);
  const rowSelectionAtom = createAtom({} as RowSelectionState);
  const expandedAtom = createAtom({} as ExpandedState);
  const columnOrderAtom = createAtom([] as string[]);

  const tableSorting = useSelector(sortingAtom);
  const tableColumnVisibility = useSelector(columnVisibilityAtom);
  const tableRowSelection = useSelector(rowSelectionAtom);
  const tableExpanded = useSelector(expandedAtom);
  const tableColumnOrder = useSelector(columnOrderAtom);

  function rowIsExpanded(rowId: string): boolean {
    const expanded = tableExpanded.current;
    return expanded === true || expanded[rowId] === true;
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
    const storageKey = `svadmin-columns-${resourceName}`;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(tableColumnVisibility.current));
      } catch { /* ignore quota errors */ }
    }
  });

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
    ...(selectable ? [{
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
  const tbl = createTable(
    {
      get data() { return query.data?.data ?? []; },
      get columns() { return orderedColumns; },
      getCoreRowModel: createCoreRowModel(),
      manualPagination: true,
      manualSorting: true,
      getRowId: (row: BaseRecord) => String(row[primaryKey]),
      atoms: {
        sorting: sortingAtom,
        columnVisibility: columnVisibilityAtom,
        rowSelection: rowSelectionAtom,
        expanded: expandedAtom,
      },
      onSortingChange: sortingAtom.set,
      onColumnVisibilityChange: columnVisibilityAtom.set,
      onRowSelectionChange: rowSelectionAtom.set,
      onExpandedChange: expandedAtom.set,
      get enableRowSelection() { return selectable; },
      get enableExpanding() { return !!expandedRowRender; },
      getRowCanExpand: () => !!expandedRowRender,
    },
    // AutoTable reads focused atoms directly; selecting the full state triggers Svelte proxy equality warnings.
    () => undefined,
  );

  $effect.pre(() => {
    const nextColumns = orderedColumns;
    untrack(() => {
      tbl.setOptions({ ...tbl.options, columns: nextColumns });
    });
  });

  const selectedCount = $derived(Object.keys(tableRowSelection.current).length);
  $effect(() => {
    onSelectionChange?.(Object.keys(tableRowSelection.current));
  });
  const tableView = $derived.by(() => {
    void tableSorting.current;
    void tableColumnVisibility.current;
    void tableRowSelection.current;
    void tableExpanded.current;
    void tableColumnOrder.current;
    return {
      headerGroups: tbl.getHeaderGroups(),
      rows: table_getRowModel(tbl).rows,
    };
  });
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

  function confirmDelete(id: string | number) {
    confirmMessage = i18n.t('common.deleteConfirm');
    confirmAction = async () => {
      await deleteMutation.mutateAsync({ id, resource: resourceName });
      confirmOpen = false;
    };
    confirmOpen = true;
  }

  function confirmBatchDelete() {
    const ids = Object.keys(tableRowSelection.current);
    confirmMessage = i18n.t('common.batchDeleteConfirm', { count: ids.length });
    confirmAction = async () => {
      try {
        await deleteManyMutation.mutateAsync({ ids, resource: resourceName });
        notify({ type: 'success', message: i18n.t('common.batchDeleteSuccess', { count: ids.length }) });
      } catch {
        notify({ type: 'error', message: i18n.t('common.batchDeletePartialFail', { failed: 1, total: ids.length }) });
      }
      rowSelectionAtom.set({});
      confirmOpen = false;
    };
    confirmOpen = true;
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
    pagination = { ...pagination, current: page };
  }
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-2" data-svadmin-list-header>
    <h1 class="text-lg sm:text-xl font-semibold text-foreground">{resource.label}</h1>
    <div class="flex flex-wrap items-center gap-2" data-svadmin-list-actions>
      {#if canExport}
        <Button variant="outline" size="sm" onclick={exportCSV}>
          <Download class="h-4 w-4" data-icon="inline-start" /> {i18n.t('common.export')}
        </Button>
      {/if}
      {#if selectedCount > 0 && canDelete}
        <Button
          variant="destructive"
          size="sm"
          class="h-9 whitespace-nowrap"
          onclick={confirmBatchDelete}
        >
          <Trash2 class="h-4 w-4" data-icon="inline-start" /> {i18n.t('common.batchDelete', { count: selectedCount })}
        </Button>
      {/if}
      
      {#if selectedCount > 0 && batchActions}
        {@render batchActions({ selectedIds: Object.keys(tableRowSelection.current) })}
      {/if}

      <!-- Column Visibility Picker (DropdownMenu) -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button variant="outline" size="sm" {...props}>
              <SlidersHorizontal class="h-4 w-4" data-icon="inline-start" /> {i18n.t('common.columns')}
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="w-48">
          {#each table_getAllLeafColumns(tbl).filter((column: Column<TableFeatures, BaseRecord, unknown>) => !column.id.startsWith('_')) as column, _i (_i)}
            <DropdownMenu.CheckboxItem
              checked={tableColumnVisibility.current[column.id] ?? true}
              onCheckedChange={(v) => column_toggleVisibility(column, !!v)}
            >
              {visibleFields.find(f => f.key === column.id)?.label ?? column.id}
            </DropdownMenu.CheckboxItem>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      {#if headerActions}
        {@render headerActions()}
      {/if}
      {#if canCreate}
        <Button onclick={() => adminContext.navigate(`/${resourceName}/create`)}>
          <Plus class="h-4 w-4" data-icon="inline-start" /> {i18n.t('common.create')}
        </Button>
      {/if}
    </div>
  </div>

  <!-- Search and Advanced Filters -->
  <div class="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card p-3" data-svadmin-table-toolbar>
    {#if searchableFields.length > 0}
      <div class="relative max-w-sm flex-1 sm:min-w-[250px]">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={searchText}
          oninput={scheduleSearch}
          placeholder={i18n.t('common.search')}
          class="pl-10 h-9"
        />
      </div>
    {/if}

    {#if filterableFields.length > 0}
      <Popover.Root>
        <Popover.Trigger>
          {#snippet child({ props })}
            <Button variant="outline" size="sm" class="h-9 px-3" {...props}>
              <FilterIcon class="h-4 w-4" data-icon="inline-start" />
              {i18n.t('common.filter')}
              {#if activeFilterCount > 0}
                <Badge variant="secondary" class="ml-1 h-5 min-w-5 px-1">{activeFilterCount}</Badge>
              {/if}
            </Button>
          {/snippet}
        </Popover.Trigger>
        <Popover.Content class="w-80">
          <div class="space-y-3">
            <h4 class="font-medium text-sm">{i18n.t('common.filter')}</h4>
            {#each filterableFields as field, _i (_i)}
              <div class="space-y-1">
                <label class="text-xs text-muted-foreground" for="filter-{field.key}">{field.label}</label>
                {#if field.type === 'select' && field.options}
                  <select
                    id="filter-{field.key}"
                    class="h-9 text-sm w-full font-normal flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={filterValues[field.key] ?? ''}
                    onchange={(e) => filterValues[field.key] = (e.currentTarget as HTMLSelectElement).value}
                  >
                    <option value="">{i18n.t('common.all')}</option>
                    {#each field.options as opt, _i (_i)}
                      <option value={opt.value}>{opt.label}</option>
                    {/each}
                  </select>
                {:else}
                  <Input
                    id="filter-{field.key}"
                    type="text"
                    value={filterValues[field.key] ?? ''}
                    oninput={(e) => filterValues[field.key] = (e.currentTarget as HTMLInputElement).value}
                    placeholder={field.label}
                    class="h-9 text-sm"
                  />
                {/if}
              </div>
            {/each}
            <div class="flex gap-2 pt-2">
              <Button size="sm" class="flex-1" onclick={() => { pagination = { ...pagination, current: 1 }; }}>
                {i18n.t('common.confirm')}
              </Button>
              <Button variant="outline" size="sm" onclick={() => {
                filterValues = {};
                pagination = { ...pagination, current: 1 };
              }}>
                {i18n.t('common.reset')}
              </Button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
    {/if}
  </div>

  {#if selectedCount > 0}
    <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm" role="status">
      <span class="font-medium text-foreground">{i18n.t('common.selectedCount', { count: selectedCount })}</span>
      <Button variant="ghost" size="sm" class="h-7 px-2" onclick={() => rowSelectionAtom.set({})}>
        {i18n.t('common.clearSelection')}
      </Button>
    </div>
  {/if}

  <!-- Table (TanStack-powered) -->
  <div class="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm" data-svadmin-table-card role="region" aria-label="{resource.label} {i18n.t('common.list')}">
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
      <div class="flex h-64 items-center justify-center text-destructive text-sm">
        {i18n.t('common.loadFailed', { message: (query.error as Error).message })}
      </div>
    {:else}
      <div in:fade={{ duration: 150 }}>
        <!-- Desktop Table (hidden on mobile) -->
        <div class="hidden min-w-0 md:block" data-svadmin-table-scroll>
        <Table.Root class="min-w-[760px]" data-svadmin-datatable>
          <Table.Header data-svadmin-table-head>
            {#each tableView.headerGroups as headerGroup, _i (_i)}
              <DraggableHeader
                columns={headerGroup.headers.map((header: Header<TableFeatures, BaseRecord, unknown>) => ({ id: header.column.id, header }))}
                resourceName={resourceName}
                onReorder={(newOrder) => columnOrderAtom.set(newOrder.map((column) => column.id))}
              >
                {#snippet header(col, _index, dragProps)}
                  {@const header = col.header as typeof headerGroup.headers[0]}
                  <Table.Head
                    {...dragProps}
                    class={cn("bg-transparent hover:bg-muted/10 border-b border-border/20 uppercase tracking-[0.12em] text-[10px] text-muted-foreground/70 font-semibold py-4", dragProps.class)}
                    style={header_getSize(header) != null && header_getSize(header) !== 150 ? `width:${header_getSize(header)}px` : undefined}
                  >
                    {#if header.id === '_select'}
                      <Checkbox
                        checked={table_getIsAllRowsSelected(tbl)}
                        onCheckedChange={() => table_toggleAllRowsSelected(tbl)}
                      />
                    {:else if header.id === '_expand'}
                      <!-- empty -->
                    {:else if header.id === '_actions'}
                      <span class="text-right block">{i18n.t('common.actions')}</span>
                    {:else if column_getCanSort(header.column)}
                      <Button
                        variant="ghost"
                        size="sm"
                        class="flex items-center gap-1 hover:text-foreground -ml-2 h-auto py-1 px-2 uppercase tracking-wide text-[0.7rem] font-semibold"
                        onclick={() => column_toggleSorting(header.column)}
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
            {#each tableView.rows as row, _i (_i)}
              {@const record = row.original}
              {@const id = record[primaryKey] as string | number}
              <ContextMenu.Root>
                <ContextMenu.Trigger>
                  {#snippet child({ props })}
                    <Table.Row {...props} data-svadmin-table-row data-state={row_getIsSelected(row) ? 'selected' : undefined} class="border-b border-border/50 transition-colors duration-150 {row_getIsSelected(row) ? 'bg-primary/8' : 'hover:bg-muted/40'}">
                      {#each row_getVisibleCells(row) as cell, _i (_i)}
                        <Table.Cell>
                          {#if cell.column.id === '_select'}
                            <Checkbox
                              checked={row_getIsSelected(row)}
                              onCheckedChange={() => row_toggleSelected(row)}
                            />
                          {:else if cell.column.id === '_expand'}
                            <TooltipButton tooltip={rowIsExpanded(row.id) ? i18n.t('common.collapse') : i18n.t('common.expand')} variant="ghost" size="icon" class="h-7 w-7" onclick={() => row_toggleExpanded(row)}>
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
                                {#if canEdit}
                                  <TooltipButton tooltip={i18n.t('common.edit')} variant="ghost" size="icon-sm" onclick={() => adminContext.navigate(`/${resourceName}/edit/${id}`)}>
                                    <Pencil class="h-4 w-4" />
                                  </TooltipButton>
                                {/if}
                                {#if canDelete}
                                  <TooltipButton tooltip={i18n.t('common.delete')} variant="ghost" size="icon-sm" onclick={() => confirmDelete(id)} class="hover:text-destructive">
                                    <Trash2 class="h-4 w-4" />
                                  </TooltipButton>
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
                              <InlineEdit
                                {resourceName}
                                recordId={id}
                                {field}
                                value={cell_getValue(cell)}
                                onSave={() => listResult.refetch()}
                              />
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
                    <ContextMenu.Item onclick={() => adminContext.navigate(`/${resourceName}/edit/${id}`)} class="gap-2">
                      <Pencil class="h-4 w-4" /> {i18n.t('common.edit')}
                    </ContextMenu.Item>
                  {/if}
                  <ContextMenu.Item onclick={() => adminContext.navigate(`/${resourceName}/show/${id}`)} class="gap-2">
                    <Eye class="h-4 w-4" /> {i18n.t('common.detail')}
                  </ContextMenu.Item>
                  <ContextMenu.Item onclick={() => navigator.clipboard?.writeText(String(id))} class="gap-2">
                    <Copy class="h-4 w-4" /> {i18n.t('common.copyId')}
                  </ContextMenu.Item>
                  {#if canDelete}
                    <ContextMenu.Separator />
                    <ContextMenu.Item onclick={() => confirmDelete(id)} class="gap-2 text-destructive">
                      <Trash2 class="h-4 w-4" /> {i18n.t('common.delete')}
                    </ContextMenu.Item>
                  {/if}
                </ContextMenu.Content>
              </ContextMenu.Root>
              {#if expandedRowRender && rowIsExpanded(row.id)}
                <Table.Row class="bg-muted/10 border-b border-border/10 transition-all">
                  <Table.Cell colspan={row_getVisibleCells(row).length}>
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
                        <Button variant="outline" size="sm" class="gap-2" onclick={() => adminContext.navigate(`/${resourceName}/create`)}>
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
              class="rounded-lg border border-border/70 bg-card p-4 transition-colors {row_getIsSelected(row) ? 'border-primary/30 bg-primary/5' : ''}"
            >
              <!-- Card header: ID + select + actions -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  {#if selectable}
                    <Checkbox
                      checked={row_getIsSelected(row)}
                      onCheckedChange={() => row_toggleSelected(row)}
                    />
                  {/if}
                  <span class="text-xs font-mono text-muted-foreground">#{id}</span>
                </div>
                <div class="flex items-center gap-1">
                  {#if rowActions}
                    {@render rowActions({ record, id })}
                  {:else}
                    {#if canEdit}
                      <TooltipButton tooltip={i18n.t('common.edit')} variant="ghost" size="icon-sm" onclick={() => adminContext.navigate(`/${resourceName}/edit/${id}`)}>
                        <Pencil class="h-4 w-4" />
                      </TooltipButton>
                    {/if}
                    <TooltipButton tooltip={i18n.t('common.detail')} variant="ghost" size="icon-sm" onclick={() => adminContext.navigate(`/${resourceName}/show/${id}`)}>
                      <Eye class="h-4 w-4" />
                    </TooltipButton>
                    {#if canDelete}
                      <TooltipButton tooltip={i18n.t('common.delete')} variant="ghost" size="icon-sm" onclick={() => confirmDelete(id)} class="hover:text-destructive">
                        <Trash2 class="h-4 w-4" />
                      </TooltipButton>
                    {/if}
                  {/if}
                </div>
              </div>
              <!-- Card fields -->
              <div class="space-y-2">
                {#each visibleFields.slice(0, 6) as field, _i (_i)}
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
                {i18n.t('common.noData')}
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Pagination (shadcn) -->
  {#if totalPages > 0}
  <div class="flex flex-col items-stretch justify-between gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center" data-svadmin-pagination>
    <div class="flex items-center gap-2">
      <span>{i18n.t('common.total', { total: query.data?.total ?? 0 })}</span>
      <span class="hidden text-muted-foreground/70 sm:inline">{i18n.t('common.pageOf', { page: currentPage, total: totalPages })}</span>
      <select
        class="h-8 w-[70px] px-1 py-1 flex items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        value={String(pagination.pageSize ?? 10)}
        onchange={(e) => {
          const size = Number((e.target as HTMLSelectElement).value);
          if (!isNaN(size)) {
            pagination = { ...pagination, pageSize: size, current: 1 };
          }
        }}
      >
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
    </div>
    <div class="max-w-full overflow-x-auto pb-1 sm:pb-0">
    <PaginationUI.Root>
      <PaginationUI.Content>
        <PaginationUI.Item>
          <PaginationUI.Previous
            aria-label={i18n.t('common.prev')}
            onclick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          />
        </PaginationUI.Item>
        {#each pages as page, _i (_i)}
          <PaginationUI.Item>
            {#if page === '...'}
              <PaginationUI.Ellipsis label={i18n.t('common.morePages')} />
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
            aria-label={i18n.t('common.nextPage')}
            onclick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          />
        </PaginationUI.Item>
      </PaginationUI.Content>
    </PaginationUI.Root>
    </div>
  </div>
  {/if}
</div>

<ConfirmDialog
  open={confirmOpen}
  message={confirmMessage}
  confirmText={i18n.t('common.delete')}
  onconfirm={confirmAction}
  oncancel={() => { confirmOpen = false; }}
/>
