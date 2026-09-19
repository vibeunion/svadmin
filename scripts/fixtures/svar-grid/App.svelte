<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Grid, Willow } from '@svar-ui/svelte-grid';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { Type } from '@sinclair/typebox';
  import { defineResource, provideAdminContext, type DataProvider, type AccessControlProvider } from '@svadmin/core';
  import SvarDataGrid from '../../../packages/ui/src/components/SvarDataGrid.svelte';
  import SvarResourceTable from '../../../packages/ui/src/components/SvarResourceTable.svelte';
  import type { SvarColumn } from '../../../packages/ui/src/components/svar-grid-contract.js';

  let mode = $state('local');
  let viewState = $state('ready');
  let dark = $state(false);
  let tenant = $state('alpha');
  let scope = $state(0);
  let granted = true;
  const checkAccess = async () => ({ can: granted, reason: granted ? '' : 'Read access denied by fixture' });
  let access = $state.raw<AccessControlProvider>({ can: checkAccess });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } });
  onDestroy(() => client.clear());
  const provider: DataProvider = {
    getApiUrl: () => '/api',
    async getList(params) {
      const response = await fetch(`/api/rows?query=${encodeURIComponent(JSON.stringify(params))}`);
      if (!response.ok) throw new Error('Fixture request failed');
      return response.json();
    },
    async getOne() { throw new Error('Read-list fixture only'); },
    async create() { throw new Error('Writes must never be called'); },
    async update() { throw new Error('Writes must never be called'); },
    async deleteOne() { throw new Error('Writes must never be called'); },
  };
  const contract = defineResource('products', {
    record: Type.Object({ id: Type.Number(), name: Type.String(), stock: Type.Number() }),
  });
  provideAdminContext({
    dataProvider: provider,
    resources: [{ name: 'products', label: 'Products', contract, fields: [
      { key: 'id', label: 'ID', type: 'number', sortable: true },
      { key: 'name', label: 'Name', type: 'text', sortable: true, filterable: true },
      { key: 'stock', label: 'Stock', type: 'number', sortable: true },
    ] }],
    get accessControlProvider() { return access; },
    get tenant() { return { tenantId: tenant }; },
  });
  const columns: SvarColumn[] = [
    { key: 'name', label: 'Name', sortable: true, filterable: true, width: 200 },
    { key: 'stock', label: 'Stock', sortable: true, width: 180 },
    { key: 'note', label: 'Note', width: 280 },
  ];
  const rows = Array.from({ length: 20000 }, (_, index) => ({
    id: index, name: `Product ${String(index).padStart(5, '0')}`, stock: 20000 - index,
    note: index === 0 ? '<img src=x onerror=alert(1)>' : `Row ${index}`,
  }));
  const treeRows = [{ id: 'root', name: 'Parent', stock: 5, children: [{ id: 'child', name: 'Child', stock: 2 }] }];
  const items = $derived(viewState === 'empty' ? [] : mode === 'tree' ? treeRows : rows);

  function toggleAccess() {
    granted = !granted;
    access = { can: checkAccess };
  }
</script>

<main class:dark>
  <h1>SVAR integration verification</h1>
  <nav aria-label="Fixture controls">
    <button onclick={() => { mode = 'local'; viewState = 'ready'; }}>Local</button>
    <button onclick={() => { mode = 'tree'; viewState = 'ready'; }}>Tree</button>
    <button onclick={() => { mode = 'resource'; viewState = 'ready'; }}>Resource</button>
    <button onclick={() => { dark = !dark; }}>Theme</button>
    <button onclick={() => { tenant = tenant === 'alpha' ? 'beta' : 'alpha'; }}>Tenant</button>
    <button onclick={toggleAccess}>Access</button>
    <button onclick={() => { scope += 1; }}>Scope</button>
    <button onclick={() => { granted = false; scope += 1; }}>Scope deny</button>
    <button onclick={() => { viewState = 'loading'; }}>Loading</button>
    <button onclick={() => { viewState = 'empty'; }}>Empty</button>
    <button onclick={() => { viewState = 'error'; }}>Error</button>
    <button onclick={() => { viewState = 'disabled'; }}>Disabled</button>
    <button onclick={() => { viewState = 'ready'; }}>Restore</button>
  </nav>
  <output data-testid="scope">{tenant}:{scope}</output>
  {#if mode === 'resource'}
    <QueryClientProvider client={client}>
      <SvarResourceTable {Grid} Theme={Willow} resourceName="products" pageSize={25} freezeLeft={1} dataScopeKey={scope} />
    </QueryClientProvider>
  {:else}
    <SvarDataGrid
      {Grid} Theme={Willow} {items} {columns} height={420} freezeLeft={1}
      loading={viewState === 'loading'} disabled={viewState === 'disabled'}
      {...viewState === 'error' ? { error: 'Fixture data error' } : {}}
      {...mode === 'tree' ? { childrenKey: 'children' } : {}}
      scopeKey={`${mode}:${tenant}:${scope}`}
    />
  {/if}
</main>

<style>
  :global(body) { margin: 0; font-family: system-ui; }
  main {
    --background: #ffffff; --foreground: #172033; --card: #ffffff; --muted: #eef1f6;
    --muted-foreground: #516075; --accent: #e5edfa; --accent-foreground: #172033;
    --primary: #275bc1; --primary-foreground: #ffffff; --border: #c4cddc;
    --destructive: #b32336; --ring: #275bc1; --radius: 6px;
    color: var(--foreground); background: var(--background); padding: 24px; min-height: 100vh; box-sizing: border-box;
  }
  main.dark { --background: #121821; --foreground: #ecf1fa; --card: #1b2431; --muted: #253144; --muted-foreground: #a9b9ce; --border: #485971; --accent: #344561; --accent-foreground: #ecf1fa; --primary: #80abff; }
  nav { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  button { font: inherit; padding: 6px 10px; background: var(--card); color: var(--foreground); border: 1px solid var(--border); border-radius: 6px; }
  h1 { font-size: 20px; }
</style>
