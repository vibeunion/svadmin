<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte';
  import { Grid, Willow } from '@svar-ui/svelte-grid';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { Type } from '@sinclair/typebox';
  import { defineResource, provideAdminContext, createHashRouterProvider, createI18nScope, provideI18nScope,
    type AccessControlProvider, type DataProvider, type Sort } from '@svadmin/core';
  import SvarAutoTable from '../../../packages/ui/src/components/SvarAutoTable.svelte';

  provideI18nScope(createI18nScope({ locale: 'en' }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } });
  onDestroy(() => client.clear());
  let tenant = $state('alpha');
  let denied = $state(false);
  let denyEdit = $state(false);
  let fallback = $state(false);
  let defaultActions = $state(false);
  let dark = $state(false);
  let output = $state('');
  let externalPagination = $state<{ current: number; pageSize: number }>();
  let externalSorters = $state<Sort[]>();
  const access: AccessControlProvider = $derived.by(() => {
    const listAllowed = !denied, editingAllowed = !denyEdit;
    return { async can(params) { return { can: params.action === 'list' ? listAllowed : params.action === 'edit' ? editingAllowed : true }; } };
  });
  async function payload(response: Response) {
    if (!response.ok) throw new Error('Compatibility fixture request failed');
    return response.json();
  }
  const provider: DataProvider = {
    getApiUrl: () => '/api/compat',
    getList: async params => payload(await fetch(`/api/compat?query=${encodeURIComponent(JSON.stringify(params))}`)),
    getOne: async params => payload(await fetch(`/api/compat/${encodeURIComponent(String(params.id))}`)),
    create: async () => { throw new Error('Create is disabled in this fixture'); },
    update: async params => payload(await fetch(`/api/compat/${encodeURIComponent(String(params.id))}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) })),
    deleteOne: async params => payload(await fetch(`/api/compat/${encodeURIComponent(String(params.id))}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) })),
  };
  const contract = defineResource('inventory', {
    record: Type.Object({ id: Type.Number(), name: Type.String(), stock: Type.Number() }),
    update: Type.Object({ stock: Type.Optional(Type.Number({ minimum: 0 })) }), delete: Type.Object({}),
  });
  provideAdminContext({ dataProvider: provider, get accessControlProvider() { return access; }, routerProvider: createHashRouterProvider(),
    get tenant() { return { tenantId: tenant }; },
    resources: [{ name: 'inventory', label: 'Compatible inventory', contract, canCreate: false, pageSize: 10, fields: [
      { key: 'id', label: 'ID', type: 'number', width: '80', showInEdit: false },
      { key: 'name', label: 'Name', type: 'text', width: '240', searchable: true, filterable: true, sortable: true, showInEdit: false },
      { key: 'stock', label: 'Stock', type: 'number', width: '160', sortable: true },
    ] }],
  });
  type ColumnSnippet = Snippet<[{ value: unknown; record: Record<string, unknown> }]>;
</script>

{#snippet nameCell({ value }: { value: unknown; record: Record<string, unknown> })}<strong data-compat-name>SKU:{String(value)}</strong>{/snippet}
{#snippet hostRows({ id }: { record: Record<string, unknown>; id: string | number })}<button type="button" aria-label={`Host row ${id}`} onclick={() => { output = `row:${id}`; }}>Open {id}</button>{/snippet}
{#snippet fallbackCell({ field, value }: { field: { key: string }; value: unknown; record: Record<string, unknown> })}<span data-compat-fallback={field.key}>Fallback:{String(value)}</span>{/snippet}

<main class:dark>
  <nav aria-label="Compatibility fixture controls">
    <button type="button" onclick={() => { fallback = !fallback; }}>Fallback cells</button>
    <button type="button" onclick={() => { defaultActions = !defaultActions; }}>Default actions</button>
    <button type="button" onclick={() => { denyEdit = !denyEdit; }}>Deny edits</button>
    <button type="button" onclick={() => { denied = !denied; }}>Deny list</button>
    <button type="button" onclick={() => { tenant = tenant === 'alpha' ? 'beta' : 'alpha'; }}>Tenant</button>
    <button type="button" onclick={() => { externalPagination = { current: 2, pageSize: 10 }; externalSorters = [{ field: 'stock', order: 'desc' }]; }}>Controlled state</button>
    <button type="button" onclick={() => { dark = !dark; }}>Theme</button>
  </nav>
  <output data-testid="compat-output">{output}</output>
  <output data-testid="compat-tenant">{tenant}</output>
  <QueryClientProvider client={client}>
    <SvarAutoTable {Grid} Theme={Willow} resourceName="inventory" freezeRight={1}
      columns={{ name: nameCell satisfies ColumnSnippet }}
      {...fallback ? { defaultCellRenderer: fallbackCell } : {}}
      {...defaultActions ? {} : { rowActions: hostRows }}
      {...externalPagination ? { pagination: externalPagination } : {}}
      {...externalSorters ? { sorters: externalSorters } : {}}>
      {#snippet headerActions()}<button type="button" onclick={() => { output = 'header'; }}>Host header</button>{/snippet}
      {#snippet batchActions({ selectedIds })}<button type="button" onclick={() => { output = `batch:${selectedIds.join(',')}`; }}>Host batch</button>{/snippet}
      {#snippet expandedRowRender({ record })}<p data-compat-expanded>Expanded {String(record['id'])}</p>{/snippet}
      {#snippet emptyState()}<p data-compat-empty>Host empty state</p>{/snippet}
      {#snippet summary({ data, total, visibleColumnsCount })}<tr><td colspan={visibleColumnsCount}><output data-testid="compat-summary">{data.length}:{total}:{visibleColumnsCount}</output></td></tr>{/snippet}
    </SvarAutoTable>
  </QueryClientProvider>
</main>

<style>
  :global(body) { margin: 0; font-family: system-ui; }
  main { --background: #fff; --foreground: #172033; --card: #fff; --muted: #eef1f6; --muted-foreground: #516075; --accent: #e5edfa; --accent-foreground: #172033; --primary: #275bc1; --primary-foreground: #fff; --border: #c4cddc; --destructive: #b32336; --ring: #275bc1; --radius: 6px; min-height: 100vh; padding: 24px; box-sizing: border-box; color: var(--foreground); background: var(--background); }
  main.dark { --background: #121821; --foreground: #ecf1fa; --card: #1b2431; --muted: #253144; --muted-foreground: #a9b9ce; --border: #485971; --accent: #344561; --accent-foreground: #ecf1fa; --primary: #80abff; }
  nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  nav button { font: inherit; padding: 6px 10px; color: var(--foreground); background: var(--card); border: 1px solid var(--border); border-radius: 6px; }
  output { display: block; }
</style>
