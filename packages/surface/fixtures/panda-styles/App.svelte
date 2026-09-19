<script lang="ts">
  import MetricWidget from '../../src/components/MetricWidget.svelte';
  import ResourceTableWidget from '../../src/components/ResourceTableWidget.svelte';
  import Button from '@svadmin/ui/components/ui/button/button.svelte';
  import Input from '@svadmin/ui/components/ui/input/input.svelte';
  import { surfaceDesignContract } from '@svadmin/ui/design-contract';
  import type { JsonObject, SurfaceWidgetDataState } from '../../src/types.js';

  let { variants = true }: { variants?: boolean } = $props();
  const ready: SurfaceWidgetDataState = { status: 'ready', sourceId: 'products', value: 1234 };
  const rows: SurfaceWidgetDataState = { status: 'ready', sourceId: 'products', value: [
    { name: 'Mechanical keyboard', stock: 142 }, { name: 'USB-C docking station', stock: 37 },
  ] };
  const states: SurfaceWidgetDataState[] = [
    { status: 'loading', sourceId: 'products' },
    { status: 'empty', sourceId: 'products' },
    { status: 'error', sourceId: 'products', error: { code: 'provider_failed', sourceId: 'products', message: 'Unable to load inventory' } },
  ];
  const columns = [{ field: 'name', label: 'Product' }, { field: 'stock', label: 'Stock', format: 'number' }];
  function metricProps(tone: string): JsonObject {
    return { label: `${tone} metric`, format: 'number', ...(variants ? { tone, density: tone === 'neutral' ? 'comfortable' : 'compact' } : {}) };
  }
  function tableProps(density: string): JsonObject {
    return { title: `${density} inventory`, columns, ...(variants ? { density } : {}) };
  }
</script>

<main>
  <header><p class="eyebrow">SVADMIN / COMPONENT COMPATIBILITY</p><h1>Tokens, recipes and existing UI</h1><p>Real Svelte components · read-only fixture · no host CSS compiler</p></header>
  <section aria-label="Existing controls" class="controls">
    <Button>Primary action</Button><Button variant="outline">Outline action</Button><Button disabled>Disabled action</Button>
    <Input aria-label="Name" placeholder="Customer name" />
    <Input aria-label="Invalid name" aria-invalid="true" placeholder="Invalid input" />
    <Input type="file" aria-label="Attachment" />
  </section>
  <section aria-label="Metric variants" class="metrics">
    {#each surfaceDesignContract.metric.tone as tone (tone)}
      <MetricWidget widgetId={`metric-${tone}`} props={metricProps(tone)} data={ready} />
    {/each}
  </section>
  <section aria-label="Metric states" class="states">
    {#each states as data (data.status)}
      <MetricWidget widgetId={`state-${data.status}`} props={{ label: `${data.status} metric`, format: 'number', ...(variants ? { tone: 'info', density: 'compact' } : {}) }} {data} />
    {/each}
  </section>
  <section aria-label="Table density" class="tables">
    {#each surfaceDesignContract.table.density as density (density)}
      <ResourceTableWidget widgetId={`table-${density}`} props={tableProps(density)} data={rows} />
    {/each}
  </section>
  <section aria-label="Table states" class="states">
    {#each states as data (data.status)}
      <ResourceTableWidget widgetId={`table-state-${data.status}`} props={{ title: `${data.status} inventory`, columns, ...(variants ? { density: 'compact' } : {}) }} {data} />
    {/each}
  </section>
  <section class="svadmin-theme dark nested" data-theme="green" aria-label="Nested theme">
    <MetricWidget widgetId="nested-theme" props={{ label: 'Nested dark theme', format: 'number', ...(variants ? { tone: 'success', density: 'compact' } : {}) }} data={ready} />
  </section>
  <details class="svadmin-collapsible"><summary>Advanced details</summary><p>Expanded content remains visible without utility compilation.</p></details>
</main>

<style>
  :global(body) { margin: 0; background: var(--background); color: var(--foreground); font-family: ui-sans-serif, system-ui, sans-serif; }
  main { padding: 1.5rem; display: grid; gap: 1rem; max-width: 120rem; margin: auto; }
  header { display: grid; gap: 0.25rem; }
  h1 { font-size: 1.5rem; font-weight: 650; }
  header p { color: var(--muted-foreground); font-size: 0.875rem; }
  .eyebrow { font-size: 0.7rem; letter-spacing: 0.1em; }
  .controls { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
  .controls :global(input), .controls :global(.svadmin-file-input) { width: 12rem; max-width: 100%; }
  .metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1rem; }
  .states { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
  .tables { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
  .nested { padding: 0.75rem; border-radius: 0.75rem; background: var(--background); }
  details { padding: 0.75rem; border: 1px solid var(--border); border-radius: 0.5rem; }
  @media (max-width: 48rem) {
    main { padding: 1rem; }
    .metrics, .states, .tables { grid-template-columns: minmax(0, 1fr); }
  }
</style>
