<script lang="ts">
  import { Type } from '@sinclair/typebox';
  import { SurfaceEditPreview, defaultSurfaceCatalog } from '@svadmin/surface/svelte';
  import type { SurfaceRevision, SurfaceDataProvider, SurfaceSpec } from '@svadmin/surface';
  import type { BaseRecord, GetListResult, GetOneResult } from '@svadmin/core';
  import Draft from './Draft.svelte';
  const density = new URLSearchParams(location.search).get('density') === 'compact' ? 'compact' : 'comfortable';
  const catalog = { version: 'evidence/v1', widgets: [...defaultSurfaceCatalog.widgets,
    { type: 'draft', dataKind: 'none' as const, propsSchema: Type.Object({ label: Type.String() }, { additionalProperties: false }), component: Draft },
  ] };
  const policy = { resources: { orders: { readFields: ['id', 'customer', 'status', 'total'], maxPageSize: 20 } } };
  const initialSpec: SurfaceSpec = {
    schemaVersion: 'surface/v1', catalogVersion: catalog.version, surfaceId: 'orders-demo', title: 'Order overview',
    layout: { type: 'grid', columns: 12, gap: 'md' },
    dataSources: [{ id: 'orders-data', type: 'resource-list', resource: 'orders', pageSize: 10 }],
    widgets: [
      { id: 'metric', type: 'metric', props: { label: 'Orders', format: 'number' }, binding: { sourceId: 'orders-data', pointer: '/total' }, placement: { columnSpan: 3 } },
      { id: 'note', type: 'draft', props: { label: 'Reviewer note' }, placement: { columnSpan: 9 } },
      { id: 'table', type: 'resource-table', props: { title: 'Orders', columns: [
        { field: 'customer', label: 'Customer' }, { field: 'status', label: 'Status' }, { field: 'total', label: 'Total', format: 'number' },
      ] }, binding: { sourceId: 'orders-data', pointer: '/items' } },
    ],
  };
  let queries = $state(0);
  let applications = $state(0);
  let revision = $state.raw<SurfaceRevision>({ revision: 0, spec: initialSpec });
  let streaming = $state(false);
  let proposal = $state.raw<unknown>({ schemaVersion: 'surface-edit/v1', catalogVersion: catalog.version,
    surfaceId: initialSpec.surfaceId, baseRevision: 0, operations: [{ op: 'set-title', value: 'Orders — revised' }] });
  const dataProvider: SurfaceDataProvider = {
    async getList<T extends BaseRecord = BaseRecord>(): Promise<GetListResult<T>> {
      queries += 1;
      return { data: [
        { id: 1, customer: 'Northwind', status: 'Pending', total: 1200 },
        { id: 2, customer: 'Acme', status: 'Approved', total: 850 },
        { id: 3, customer: 'Contoso', status: 'Pending', total: 460 },
      ] as unknown as T[], total: 3 };
    },
    async getOne<T extends BaseRecord = BaseRecord>(): Promise<GetOneResult<T>> { return { data: { id: 1 } as unknown as T }; },
  };
  function onApply(next: SurfaceRevision) { applications += 1; revision = next; proposal = undefined; }
</script>
<main>
  <header><p>SVADMIN / SURFACE</p><h1>Review an AI-proposed change</h1><p>Read-only fixture · no model calls or business writes</p></header>
  <SurfaceEditPreview {revision} {proposal} {streaming} {policy} {catalog} {dataProvider} {density} {onApply} locale="en" />
  <aside>
    <span>Data queries: <output data-testid="query-count">{queries}</output></span>
    <span>Accepted edits: <output data-testid="apply-count">{applications}</output></span>
    <button type="button" onclick={() => { streaming = true; proposal = '{'; }}>Receive stream</button>
    <button type="button" onclick={() => { streaming = false; proposal = '{'; }}>Invalid proposal</button>
  </aside>
</main>
<style>
  :global(body) { margin: 0; color: var(--foreground); background: var(--background); font-family: system-ui, sans-serif; }
  main { max-width: 1120px; margin: 40px auto; padding: 0 24px; }
  header { margin-bottom: 24px; }
  h1 { font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.25; margin: 8px 0; }
  header p { color: var(--muted-foreground); font-size: 0.875rem; margin: 0; }
  aside { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 24px; font-size: 0.875rem; color: var(--muted-foreground); }
  aside button { padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--card); color: var(--foreground); }
  @media (max-width: 480px) { main { padding: 0 12px; margin: 24px auto; } }
</style>
