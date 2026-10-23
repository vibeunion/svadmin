<script lang="ts">
  import { Type } from 'typebox';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { defineResource, provideAdminContext, type DataProvider } from '@svadmin/core';
  import AutoTable from '../../../packages/ui/src/components/AutoTable.svelte';
  import type {
    ListPreferenceScope,
    SavedListView,
    SavedListViewMutation,
    SavedListViewProvider,
  } from '../../../packages/ui/src/components/saved-list-views.js';

  const params = new URLSearchParams(window.location.search);
  const failure = params.get('fail');
  let listFailures = failure === 'list-once' ? 1 : 0;
  let saveFailures = failure === 'save-once' ? 1 : 0;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });
  const contract = defineResource('saved-view-records', {
    record: Type.Object({ id: Type.String(), email: Type.String(), team: Type.String() }),
  });
  const resources = [{
    name: 'saved-view-records',
    label: 'Saved view records',
    contract,
    fields: [
      { key: 'id', label: 'ID', type: 'text' as const },
      { key: 'email', label: 'Email', type: 'text' as const, searchable: true, filterable: true },
      { key: 'team', label: 'Team', type: 'text' as const, searchable: true, filterable: true },
    ],
  }];

  const seedState = {
    search: '',
    filters: [],
    sorters: [],
    pagination: { current: 1, pageSize: 10 },
    columnVisibility: {},
    columnOrder: [],
  };
  let remoteViews: SavedListView[] = params.get('seed') === 'remote' ? [
    {
      id: 'team-view', name: 'Team saved', source: 'team', readOnly: false, version: 2,
      state: { ...seedState, search: 'team-seed' },
    },
    {
      id: 'system-view', name: 'System saved', source: 'system', readOnly: true, version: 5,
      state: { ...seedState, search: 'system-seed' },
    },
  ] : [];

  const listCalls = $state<unknown[]>([]);
  const saveCalls = $state<unknown[]>([]);
  const writeCalls = $state<unknown[]>([]);
  const queryCalls = $state<unknown[]>([]);

  function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  const savedViewProvider: SavedListViewProvider = {
    list: async (scope: ListPreferenceScope) => {
      listCalls.push(clone(scope));
      if (listFailures > 0) {
        listFailures -= 1;
        throw new Error('PRIVATE_SAVED_VIEW_LIST_DIAGNOSTIC');
      }
      return clone(remoteViews);
    },
    save: async (scope: ListPreferenceScope, mutation: SavedListViewMutation) => {
      saveCalls.push(clone({ scope, mutation }));
      if (saveFailures > 0) {
        saveFailures -= 1;
        throw new Error('PRIVATE_SAVED_VIEW_SAVE_DIAGNOSTIC');
      }
      const existing = remoteViews.find(view => view.id === mutation.id);
      const version = (existing?.version ?? 0) + 1;
      const view: SavedListView = {
        id: mutation.id,
        name: mutation.name,
        state: clone(mutation.state),
        source: mutation.source,
        readOnly: false,
        version,
      };
      remoteViews = [view, ...remoteViews.filter(candidate => candidate.id !== view.id)];
      return { ok: true, version, view: clone(view) };
    },
    remove: async (_scope: ListPreferenceScope, input: { id: string; expectedVersion: number }) => {
      writeCalls.push(clone({ type: 'remove', input }));
      remoteViews = remoteViews.filter(view => view.id !== input.id);
      return { ok: true, id: input.id, version: input.expectedVersion + 1 };
    },
    setDefault: async (_scope: ListPreferenceScope, input: {
      id: string; source: 'team' | 'system'; expectedVersion: number; default: boolean;
    }) => {
      writeCalls.push(clone({ type: 'setDefault', input }));
      const existing = remoteViews.find(view => view.id === input.id);
      if (!existing) return undefined;
      const view: SavedListView = { ...existing, default: input.default, version: input.expectedVersion + 1 };
      remoteViews = remoteViews.map(candidate => candidate.id === view.id ? view : candidate);
      return { ok: true, version: view.version, view: clone(view) };
    },
    updateAccess: async (_scope: ListPreferenceScope, input: {
      id: string; source: 'team' | 'system'; expectedVersion: number;
    }) => {
      writeCalls.push(clone({ type: 'updateAccess', input }));
      const existing = remoteViews.find(view => view.id === input.id);
      if (!existing) return undefined;
      const view: SavedListView = { ...existing, version: input.expectedVersion + 1 };
      remoteViews = remoteViews.map(candidate => candidate.id === view.id ? view : candidate);
      return { ok: true, version: view.version, view: clone(view) };
    },
  };

  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture/saved-list-views',
    getList: async (input) => {
      queryCalls.push(clone({
        filters: input.filters ?? [],
        sorters: input.sorters ?? [],
        pagination: input.pagination,
      }));
      const data = [
        { id: 'record-1', email: 'alpha@example.com', team: 'platform' },
        { id: 'record-2', email: 'beta@example.com', team: 'operations' },
      ];
      return { data, total: data.length };
    },
    getOne: async ({ id }) => ({ data: { id, email: 'alpha@example.com', team: 'platform' } }),
    create: async () => ({ data: { id: 'record-1', email: 'alpha@example.com', team: 'platform' } }),
    update: async () => ({ data: { id: 'record-1', email: 'alpha@example.com', team: 'platform' } }),
    deleteOne: async ({ id }) => ({ data: { id, email: 'alpha@example.com', team: 'platform' } }),
  };

  provideAdminContext({ dataProvider, resources });
</script>

<QueryClientProvider client={queryClient}>
  <main data-testid="saved-list-views-fixture">
    <AutoTable resourceName="saved-view-records" syncWithLocation={false} savedViewProvider={savedViewProvider} />
    <output hidden data-testid="saved-list-views-list-calls">{JSON.stringify(listCalls)}</output>
    <output hidden data-testid="saved-list-views-save-calls">{JSON.stringify(saveCalls)}</output>
    <output hidden data-testid="saved-list-views-write-calls">{JSON.stringify(writeCalls)}</output>
    <output hidden data-testid="saved-list-views-query-calls">{JSON.stringify(queryCalls)}</output>
  </main>
</QueryClientProvider>

<style>
  main { min-width: 0; padding: 24px; }
  @media (max-width: 800px) { main { padding: 12px; } }
</style>
