<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Grid, Willow } from '@svar-ui/svelte-grid';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { Type } from '@sinclair/typebox';
  import { defineResource, provideAdminContext, type DataProvider, type AccessControlProvider } from '@svadmin/core';
  import SvarDataGrid from '../../../packages/ui/src/components/SvarDataGrid.svelte';
  import SvarResourceTable from '../../../packages/ui/src/components/SvarResourceTable.svelte';
  import type { SvarInteractiveColumn } from '../../../packages/ui/src/components/svar-grid-interactions.js';
  import type { SvarSort, SvarTextFilter } from '../../../packages/ui/src/components/svar-grid-contract.js';
  import { snapshotSvarRecords, type SvarWindowSource, type SvarChildrenLoader } from '../../../packages/ui/src/components/svar-grid-loading.js';

  let mode = $state('operations');
  let dark = $state(false);
  let scope = $state(0);
  let tenant = $state('alpha');
  let denySecond = false;
  let sorters = $state<SvarSort[]>([]);
  let filters = $state<SvarTextFilter[]>([]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } });
  onDestroy(() => client.clear());
  const access: AccessControlProvider = {
    async can(params) {
      return { can: !(denySecond && params.params?.['id'] === 2 && ['edit', 'delete', 'export'].includes(params.action)), reason: 'Fixture record permission denied' };
    },
  };
  async function responseData(response: Response) {
    if (!response.ok) throw new Error('Fixture request failed');
    return response.json();
  }
  const provider: DataProvider = {
    getApiUrl: () => '/api',
    getList: async params => responseData(await fetch(`/api/rows?query=${encodeURIComponent(JSON.stringify(params))}`)),
    getOne: async params => responseData(await fetch(`/api/rows/${encodeURIComponent(String(params.id))}`)),
    create: async () => { throw new Error('Creation is not part of this fixture'); },
    update: async params => responseData(await fetch(`/api/rows/${encodeURIComponent(String(params.id))}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) })),
    deleteOne: async params => responseData(await fetch(`/api/rows/${encodeURIComponent(String(params.id))}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) })),
  };
  const childSchema = Type.Object({ id: Type.Number(), name: Type.String(), stock: Type.Number() });
  const contract = defineResource('products', {
    record: Type.Object({ id: Type.Number(), name: Type.String(), stock: Type.Number(), children: Type.Optional(Type.Array(childSchema)) }),
    update: Type.Object({ name: Type.Optional(Type.String({ minLength: 1 })), stock: Type.Optional(Type.Number({ minimum: 0 })) }),
    delete: Type.Object({}),
  });
  provideAdminContext({ dataProvider: provider, accessControlProvider: access,
    resources: [{ name: 'products', label: 'Products', contract, fields: [
      { key: 'id', label: 'ID', type: 'number', sortable: true },
      { key: 'name', label: 'Name', type: 'text', sortable: true, filterable: true, searchable: true },
      { key: 'stock', label: 'Stock', type: 'number', sortable: true },
    ] }], get tenant() { return { tenantId: tenant }; },
  });
  const columns: SvarInteractiveColumn[] = [
    { key: 'name', label: 'Name', sortable: true, filterable: true, width: 240 },
    { key: 'stock', label: 'Stock', sortable: true, width: 200 },
    { key: 'note', label: 'Note', width: 220 },
  ];
  const flatRows = Array.from({ length: 20000 }, (_, i) => ({ id: i, name: `Row ${String(i).padStart(5, '0')}`, stock: 20000 - i, note: `Pinned ${i}` }));
  const roots = [{ id: 'root', name: 'Lazy root', stock: 1, note: 'Root', hasChildren: true }];
  const loadChildren: SvarChildrenLoader = async ({ id, signal }) => {
    const value = await responseData(await fetch(`/api/children/${encodeURIComponent(String(id))}?scope=${scope}`, { signal }));
    if (!Array.isArray(value)) throw new Error('Invalid fixture children');
    return snapshotSvarRecords(value);
  };
  const loadWindow: SvarWindowSource['load'] = async ({ start, end, signal }) => {
    return responseData(await fetch(`/api/window?start=${start}&end=${end}&scope=${scope}&sort=${encodeURIComponent(JSON.stringify(sorters))}&filters=${encodeURIComponent(JSON.stringify(filters))}`, { signal }));
  };
  const windowSource: SvarWindowSource = { total: 100000, load: loadWindow };
  let infiniteRows = $state.raw<Record<string, unknown>[]>(flatRows.slice(0, 25));
  const hasMore = $derived(infiniteRows.length < 100);
  async function loadMore({ signal }: { signal: AbortSignal }): Promise<void> {
    const offset = infiniteRows.length;
    const value = await responseData(await fetch(`/api/more?offset=${offset}&scope=${scope}`, { signal }));
    if (signal.aborted || !Array.isArray(value)) throw new Error('Aborted or invalid fixture page');
    infiniteRows = snapshotSvarRecords([...infiniteRows, ...value]);
  }
</script>

<main class:dark>
  <h1>SVAR advanced integration</h1>
  <nav aria-label="Advanced fixture controls">
    {#each ['operations', 'tree-operations', 'window', 'infinite', 'lazy', 'pinned'] as target (target)}
      <button type="button" onclick={() => { mode = target; sorters = []; filters = []; }}>{target}</button>
    {/each}
    <button type="button" onclick={() => { dark = !dark; }}>Theme</button>
    <button type="button" onclick={() => { scope++; }}>Scope</button>
    <button type="button" onclick={() => { tenant = tenant === 'alpha' ? 'beta' : 'alpha'; }}>Tenant</button>
    <button type="button" onclick={() => { denySecond = !denySecond; }}>Deny second record</button>
  </nav>
  <output data-testid="advanced-scope">{tenant}:{scope}</output>
  {#if mode === 'operations' || mode === 'tree-operations'}
    <QueryClientProvider client={client}>
      <SvarResourceTable {Grid} Theme={Willow} resourceName="products" pageSize={25} dataScopeKey={scope}
        editable selectable batchUpdate batchDelete exportable savedViews preferenceScopeKey="fixture-viewer" migrateAutoTableViews
        {...mode === 'tree-operations' ? { childrenKey: 'children' } : {}} />
    </QueryClientProvider>
  {:else if mode === 'window'}
    <SvarDataGrid {Grid} Theme={Willow} {columns} {windowSource} queryMode="server" {sorters} {filters}
      onSortChange={next => { sorters = next; }} onFilterChange={next => { filters = next; }}
      scopeKey={`window:${scope}:${JSON.stringify([sorters, filters])}`} height={420} />
  {:else if mode === 'infinite'}
    <SvarDataGrid {Grid} Theme={Willow} items={infiniteRows} columns={columns.map(column => ({ ...column, sortable: false, filterable: false }))}
      queryMode="server" onLoadMore={loadMore} {hasMore} scopeKey={`infinite:${scope}`} height={420} />
    <output data-testid="loaded-count">{infiniteRows.length}</output>
  {:else if mode === 'lazy'}
    <SvarDataGrid {Grid} Theme={Willow} items={roots} {columns} {loadChildren} childrenKey="children" freezeRight={1} scopeKey={`lazy:${scope}`} height={420} />
  {:else}
    <SvarDataGrid {Grid} Theme={Willow} items={flatRows} {columns} freezeRight={1} scopeKey={`pinned:${scope}`} height={420} />
  {/if}
</main>

<style>
  :global(body) { margin: 0; font-family: system-ui; }
  main { --background: #fff; --foreground: #172033; --card: #fff; --muted: #eef1f6; --muted-foreground: #516075; --accent: #e5edfa; --accent-foreground: #172033;
    --primary: #275bc1; --primary-foreground: #fff; --border: #c4cddc; --destructive: #b32336; --ring: #275bc1; --radius: 6px;
    color: var(--foreground); background: var(--background); padding: 24px; min-height: 100vh; box-sizing: border-box; }
  main.dark { --background: #121821; --foreground: #ecf1fa; --card: #1b2431; --muted: #253144; --muted-foreground: #a9b9ce; --border: #485971; --accent: #344561; --accent-foreground: #ecf1fa; --primary: #80abff; }
  nav { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  button { font: inherit; padding: 6px 10px; background: var(--card); color: var(--foreground); border: 1px solid var(--border); border-radius: 6px; }
  h1 { font-size: 20px; }
</style>
