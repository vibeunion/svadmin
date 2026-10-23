<script lang="ts">
  import { Type } from 'typebox';
  import { QueryClient } from '@tanstack/svelte-query';
  import {
    defineResource,
    type AccessControlProvider,
    type DataProvider,
    type Filter,
    type GetListParams,
    type ResourceDefinition,
    type RouterProvider,
  } from '@svadmin/core';
  import AdminApp from '../../../packages/ui/src/components/AdminApp.svelte';

  type Row = { id: number; title: string; team: string };

  const params = new URLSearchParams(window.location.search);
  const failure = params.get('fail');
  let updateFailures = failure === 'update-once' ? 1 : 0;

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
  const resources: ResourceDefinition[] = [{
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
    getApiUrl: () => '/fixture/resource-workspace-edit-route',
    getList: async (input) => {
      const filters = input.filters ?? [];
      const rows = sortedRecords(filteredRecords(filters), input.sorters ?? []);
      const current = input.pagination?.current ?? 1;
      const pageSize = input.pagination?.pageSize ?? 10;
      const start = (current - 1) * pageSize;
      const page = rows.slice(start, start + pageSize);
      listCalls.push(clone({
        filters,
        sorters: input.sorters ?? [],
        pagination: clone(input.pagination),
        ids: page.map(record => record.id),
        total: rows.length,
      }));
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
    can: async () => ({ can: true }),
  };

  let pathname = $state('/browser-records');
  let routeParams = $state<Record<string, string>>({});
  const routeHistory: Array<{ pathname: string; params: Record<string, string> }> = [];

  function splitTarget(target: string): { pathname: string; params: Record<string, string> } {
    const [path, queryString] = target.split('?');
    return {
      pathname: path || pathname,
      params: queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {},
    };
  }

  const router: RouterProvider = {
    parse: () => ({ resource: 'browser-records', params: routeParams, pathname }),
    go: (options) => {
      const next = options.to
        ? splitTarget(options.to)
        : { pathname, params: { ...routeParams } };
      if (options.query) {
        next.params = {
          ...next.params,
          ...Object.fromEntries(Object.entries(options.query).map(([key, value]) => [key, String(value)])),
        };
      }
      if ((options.type ?? 'push') === 'push') {
        routeHistory.push({ pathname, params: { ...routeParams } });
      }
      pathname = next.pathname;
      routeParams = next.params;
    },
    back: () => {
      const previous = routeHistory.pop();
      if (!previous) return;
      pathname = previous.pathname;
      routeParams = previous.params;
    },
    formatLink: path => path,
  };
</script>

<main data-testid="resource-workspace-edit-route-fixture">
  <AdminApp
    dataProvider={dataProvider}
    {resources}
    {accessControlProvider}
    routerProvider={router}
    {queryClient}
    tenant={{ tenantId: 'tenant-a' }}
    locale="en"
    title="Resource workspace fixture"
  />
  <output hidden data-testid="resource-workspace-edit-route">{JSON.stringify({ pathname, params: routeParams })}</output>
  <output hidden data-testid="resource-workspace-list-calls">{JSON.stringify(listCalls)}</output>
  <output hidden data-testid="resource-workspace-detail-calls">{JSON.stringify(detailCalls)}</output>
  <output hidden data-testid="resource-workspace-update-calls">{JSON.stringify(updateCalls)}</output>
  <output hidden data-testid="resource-workspace-write-calls">{JSON.stringify(writeCalls)}</output>
</main>

<style>
  main { min-width: 0; }
</style>