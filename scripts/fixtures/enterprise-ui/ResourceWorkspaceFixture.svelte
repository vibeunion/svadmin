<script lang="ts">
  import { Type } from 'typebox';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import {
    defineResource,
    provideAdminContext,
    type AccessControlProvider,
    type CanParams,
    type DataProvider,
    type Filter,
    type GetListParams,
    type RouterProvider,
  } from '@svadmin/core';
  import ResourceOperationsPage from '../../../packages/ui/src/components/ResourceOperationsPage.svelte';
  import { definedReactiveOptions } from '@svadmin/core/options';

  type Row = { id: number; title: string; team: string };

  const params = new URLSearchParams(window.location.search);
  const failure = params.get('fail');
  const deferred = params.get('deferred');
  const denyShowEdit = params.get('deny') === 'show-edit';
  let listFailures = failure === 'list-once' ? 1 : 0;
  let updateFailures = failure === 'update-once' ? 1 : 0;
  let tenantId = $state('tenant-a');
  let pendingUpdate: { resolve: () => void; reject: () => void } | undefined;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const contract = defineResource('browser-records', {
    record: Type.Object({
      id: Type.Number(),
      title: Type.String(),
      team: Type.String(),
    }),
    update: Type.Object({ title: Type.String() }),
  });
  const resources = [{
    name: 'browser-records',
    label: 'Browser records',
    contract,
    canCreate: false,
    canShow: true,
    canEdit: true,
    canDelete: true,
    fields: [
      { key: 'id', label: 'ID', type: 'number' as const },
      { key: 'title', label: 'Title', type: 'text' as const, searchable: true, filterable: true },
      { key: 'team', label: 'Team', type: 'text' as const, searchable: true, filterable: true },
    ],
  }];

  const teams = ['platform', 'operations', 'finance'];
  const records: Row[] = Array.from({ length: 36 }, (_, index) => {
    const id = index + 1;
    return {
      id,
      title: id <= 12 ? `needle item ${id}` : `general item ${id}`,
      team: teams[index % teams.length] ?? 'platform',
    };
  });

  const listCalls = $state<unknown[]>([]);
  const detailCalls = $state<unknown[]>([]);
  const updateCalls = $state<unknown[]>([]);
  const writeCalls = $state<unknown[]>([]);
  const permissionCalls = $state<unknown[]>([]);

  function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  function textValue(value: unknown): string {
    return String(value ?? '').toLowerCase();
  }

  function matchesFilter(record: Row, filter: Filter): boolean {
    if ('field' in filter) {
      const actual = (record as Record<string, unknown>)[filter.field];
      const expected = filter.value;
      switch (filter.operator) {
        case 'contains': return textValue(actual).includes(textValue(expected));
        case 'ncontains': return !textValue(actual).includes(textValue(expected));
        case 'startswith': return textValue(actual).startsWith(textValue(expected));
        case 'endswith': return textValue(actual).endsWith(textValue(expected));
        case 'eq': return String(actual ?? '') === String(expected ?? '');
        case 'ne': return String(actual ?? '') !== String(expected ?? '');
        case 'in': return Array.isArray(expected) && expected.map(String).includes(String(actual ?? ''));
        case 'nin': return Array.isArray(expected) && !expected.map(String).includes(String(actual ?? ''));
        case 'null': return actual === null || actual === undefined;
        case 'nnull': return actual !== null && actual !== undefined;
        case 'gt': return Number(actual) > Number(expected);
        case 'gte': return Number(actual) >= Number(expected);
        case 'lt': return Number(actual) < Number(expected);
        case 'lte': return Number(actual) <= Number(expected);
        default: return true;
      }
    }
    if (filter.operator === 'and') return filter.value.every(entry => matchesFilter(record, entry));
    return filter.value.some(entry => matchesFilter(record, entry));
  }

  function filteredRecords(filters: Filter[] = []): Row[] {
    return records.filter(record => filters.every(filter => matchesFilter(record, filter)));
  }

  function sortedRecords(rows: Row[], sorters: GetListParams['sorters']): Row[] {
    if (!sorters?.length) return [...rows];
    return [...rows].sort((left, right) => {
      for (const sorter of sorters) {
        const a = String((left as Record<string, unknown>)[sorter.field] ?? '');
        const b = String((right as Record<string, unknown>)[sorter.field] ?? '');
        const result = a.localeCompare(b, undefined, { numeric: true });
        if (result !== 0) return sorter.order === 'desc' ? -result : result;
      }
      return 0;
    });
  }

  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture/resource-workspace',
    getList: async (input) => {
      const filters = input.filters ?? [];
      const sorters = input.sorters ?? [];
      const rows = sortedRecords(filteredRecords(filters), sorters);
      const current = input.pagination?.current ?? 1;
      const pageSize = input.pagination?.pageSize ?? 10;
      const start = (current - 1) * pageSize;
      const page = rows.slice(start, start + pageSize);
      const call = {
        filters: clone(filters),
        sorters: clone(sorters),
        pagination: clone(input.pagination),
        ids: page.map(record => record.id),
        total: rows.length,
        failed: listFailures > 0,
      };
      listCalls.push(call);
      if (listFailures > 0) {
        listFailures -= 1;
        throw new Error('PRIVATE_RESOURCE_LIST_DIAGNOSTIC');
      }
      return { data: clone(page), total: rows.length };
    },
    getOne: async ({ resource, id, meta }) => {
      detailCalls.push(clone({ resource, id, meta }));
      const record = records.find(candidate => candidate.id === Number(id));
      if (!record) throw new Error('PRIVATE_RESOURCE_DETAIL_DIAGNOSTIC');
      return { data: clone(record) };
    },
    create: async ({ resource, variables, meta }) => {
      writeCalls.push(clone({ type: 'create', resource, variables, meta }));
      return { data: { id: 1000, title: 'created', team: 'platform' } };
    },
    update: async ({ resource, id, variables, meta }) => {
      updateCalls.push(clone({ resource, id, variables, meta }));
      if (deferred) {
        return await new Promise((resolve, reject) => {
          const settle = () => {
            pendingUpdate = undefined;
          };
          pendingUpdate = {
            resolve: () => {
              settle();
              const record = records.find(candidate => candidate.id === Number(id));
              if (!record) {
                reject(new Error('PRIVATE_RESOURCE_UPDATE_DIAGNOSTIC'));
                return;
              }
              const normalized = { ...record, title: 'needle normalized title' };
              records[records.indexOf(record)] = normalized;
              resolve({ data: clone(normalized) });
            },
            reject: () => {
              settle();
              reject(new Error('PRIVATE_RESOURCE_UPDATE_DIAGNOSTIC'));
            },
          };
        });
      }
      if (updateFailures > 0) {
        updateFailures -= 1;
        throw new Error('PRIVATE_RESOURCE_UPDATE_DIAGNOSTIC');
      }
      const record = records.find(candidate => candidate.id === Number(id));
      if (!record) throw new Error('PRIVATE_RESOURCE_UPDATE_DIAGNOSTIC');
      const normalized = { ...record, title: 'needle normalized title' };
      records[records.indexOf(record)] = normalized;
      return { data: clone(normalized) };
    },
    deleteOne: async ({ resource, id, meta }) => {
      writeCalls.push(clone({ type: 'deleteOne', resource, id, meta }));
      return { data: { id: String(id) } };
    },
  };

  const accessControlProvider: AccessControlProvider = {
    can: async ({ resource, action, params: canParams }: CanParams) => {
      permissionCalls.push(clone({ resource, action, id: canParams?.id }));
      if (denyShowEdit && (action === 'show' || action === 'edit')) return { can: false };
      return { can: true };
    },
  };

  let pathname = $state('/browser-records');
  let routeParams = $state<Record<string, string>>({});
  const routeHistory: Record<string, string>[] = [];
  const router: RouterProvider = {
    parse: () => ({ resource: 'browser-records', params: routeParams, pathname }),
    go: (options) => {
      if ((options.type ?? 'push') === 'push') routeHistory.push({ ...routeParams });
      pathname = options.to || pathname;
      routeParams = { ...(options.query ?? {}) };
    },
    back: () => { routeParams = routeHistory.pop() ?? {}; },
    formatLink: path => path,
  };

  provideAdminContext(definedReactiveOptions({
    dataProvider,
    resources,
    get tenant() { return { tenantId }; },
    accessControlProvider,
    routerProvider: router,
  }));
</script>

{#snippet batchActions({ selectedIds }: { selectedIds: (string | number)[]; selection: unknown })}
  <button type="button">Process selection {selectedIds.length}</button>
{/snippet}

<QueryClientProvider client={queryClient}>
  <main data-testid="resource-workspace-fixture">
    <ResourceOperationsPage
      resourceName="browser-records"
      eyebrow="Operations"
      title="Resource workspace"
      description="Real ResourceOperationsPage, AutoTable and QuickEditDrawer composition."
      actionLabel="New record"
      tableProps={{ batchActions }}
    />
    <output hidden data-testid="resource-workspace-list-calls">{JSON.stringify(listCalls)}</output>
    <output hidden data-testid="resource-workspace-detail-calls">{JSON.stringify(detailCalls)}</output>
    <output hidden data-testid="resource-workspace-update-calls">{JSON.stringify(updateCalls)}</output>
    <output hidden data-testid="resource-workspace-write-calls">{JSON.stringify(writeCalls)}</output>
    <output hidden data-testid="resource-workspace-permission-calls">{JSON.stringify(permissionCalls)}</output>
    <output hidden data-testid="resource-workspace-tenant">{tenantId}</output>
    {#if deferred}
      <div class="quick-edit-lifecycle-controls" data-testid="quick-edit-lifecycle-controls">
        <button type="button" data-testid="switch-tenant" onclick={() => { tenantId = tenantId === 'tenant-a' ? 'tenant-b' : 'tenant-a'; }}>
          Switch tenant
        </button>
        <button type="button" data-testid="resolve-deferred-update" onclick={() => pendingUpdate?.resolve()}>
          Resolve update
        </button>
        <button type="button" data-testid="reject-deferred-update" onclick={() => pendingUpdate?.reject()}>
          Reject update
        </button>
      </div>
    {/if}
  </main>
</QueryClientProvider>

<style>
  main { min-width: 0; padding: 24px; }
  .quick-edit-lifecycle-controls {
    position: fixed;
    z-index: 100;
    inset-block-end: 0;
    inset-inline-start: 0;
    display: flex;
    max-width: 100vw;
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px;
    background: var(--background);
    border: 1px solid var(--border);
  }
  @media (max-width: 800px) { main { padding: 12px; } }
</style>
