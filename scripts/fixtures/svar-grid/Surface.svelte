<script lang="ts">
  import { Grid, Willow } from '@svar-ui/svelte-grid';
  import { SurfaceRenderer } from '../../../packages/surface/src/svelte.js';
  import { SvarSurfaceProvider, createSvarSurfaceCatalog } from '../../../packages/surface/src/svar.js';
  import type { SurfaceSpec, SurfacePolicy, SurfaceDataProvider } from '../../../packages/surface/src/types.js';
  import { buildSurfaceAgentPrompt, parseSurfaceAgentProposal } from '../../../packages/surface/src/agent.js';
  const catalog = createSvarSurfaceCatalog();
  let mode = $state('valid');
  let title = $state('AI inventory');
  const policy = $derived<SurfacePolicy>({ resources: { products: { readFields: mode === 'deny-id' ? ['name', 'stock'] : ['id', 'name', 'stock'] } } });
  const spec = $derived<SurfaceSpec>({ schemaVersion: 'surface/v1', catalogVersion: catalog.version, surfaceId: 'svar-ai', title,
    layout: { type: 'grid', columns: 12 }, dataSources: [{ id: 'products', type: 'resource-list', resource: 'products' }],
    widgets: [{ id: 'inventory', type: 'data-grid', binding: { sourceId: 'products', pointer: '/items' }, props: {
      title: 'Inventory records', freezeRight: 1,
      columns: [{ field: 'name', label: 'Name' }, { field: mode === 'secret' ? 'secret' : 'stock', label: 'Stock', format: 'number' }],
      ...(mode === 'mutation' ? { editable: true } : {}),
    } }],
  });
  const dataProvider: SurfaceDataProvider = {
    async getList(params) {
      const response = await fetch(`/api/surface?query=${encodeURIComponent(JSON.stringify(params))}`);
      if (!response.ok) throw new Error('Surface fixture failed'); return response.json();
    },
    async getOne() { throw new Error('Unexpected detail read'); },
  };
  const prompt = $derived(buildSurfaceAgentPrompt('Create an inventory grid', catalog, policy));
  const proposal = $derived(parseSurfaceAgentProposal({ schemaVersion: 'surface-agent/v1', action: 'propose', spec }, catalog, policy));
</script>
<main>
  <h1>AI Surface / SVAR</h1>
  <nav aria-label="Surface fixture controls">
    {#each ['valid', 'secret', 'mutation', 'deny-id'] as value (value)}<button type="button" onclick={() => { mode = value; }}>{value}</button>{/each}
    <button type="button" onclick={() => { title = 'Updated AI inventory'; }}>Title</button>
  </nav>
  <output data-testid="proposal-valid">{proposal.ok ? 'valid' : 'rejected'}</output>
  <output data-testid="prompt-grid">{prompt.includes('data-grid') ? 'registered' : 'missing'}</output>
  <SvarSurfaceProvider {Grid} Theme={Willow}>
    <SurfaceRenderer {spec} {catalog} {policy} {dataProvider} />
  </SvarSurfaceProvider>
</main>
<style>
  :global(body) { margin: 0; font-family: system-ui; }
  main { --card: #fff; --muted: #eef1f6; --foreground: #172033; --muted-foreground: #516075; --border: #c4cddc; --destructive: #b32336; --primary: #275bc1; --radius: 6px; padding: 24px; }
  nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  button { font: inherit; border: 1px solid var(--border); padding: 6px 10px; background: var(--card); border-radius: var(--radius); }
</style>
