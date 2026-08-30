<script lang="ts">
  import { Value } from '@sinclair/typebox/value';
  import LineChart from '@svadmin/ui/components/charts/LineChart.svelte';
  import CardContent from '@svadmin/ui/components/ui/card/card-content.svelte';
  import CardHeader from '@svadmin/ui/components/ui/card/card-header.svelte';
  import CardTitle from '@svadmin/ui/components/ui/card/card-title.svelte';
  import Card from '@svadmin/ui/components/ui/card/card.svelte';
  import { lineChartPropsSchema } from '../builtin-schemas.js';
  import type { SurfaceWidgetRendererProps } from '../catalog.js';
  import { asChartPoints, compactChartLabel } from '../widget-data.js';

  let { props, data }: SurfaceWidgetRendererProps = $props();

  const chartProps = $derived(Value.Decode(lineChartPropsSchema, props));
  const points = $derived(data.status === 'ready'
    ? asChartPoints(data.value, chartProps.labelField, chartProps.valueField)
    : null);
  const chartData = $derived(points?.ok
    ? points.value.map((point) => ({ ...point, label: compactChartLabel(point.label, 8) }))
    : []);
</script>

<Card>
  <CardHeader>
    <CardTitle>{chartProps.title}</CardTitle>
  </CardHeader>
  <CardContent>
    {#if data.status === 'loading'}
      <div class="chart-state chart-loading" role="status" aria-label="Loading {chartProps.title}"></div>
    {:else if data.status === 'empty'}
      <p class="chart-state" role="status">No chart data</p>
    {:else if data.status === 'error'}
      <p class="chart-state" role="alert">{data.error.message}</p>
    {:else if data.status === 'ready' && points?.ok}
      <div class="chart-frame" role="img" aria-label={chartProps.title}>
        <LineChart
          data={chartData}
          showDots={chartProps.showDots ?? true}
          fill={chartProps.fill ?? true}
        />
      </div>
    {:else}
      <p class="chart-state" role="alert">{points && !points.ok ? points.message : 'Chart data is unavailable'}</p>
    {/if}
  </CardContent>
</Card>

<style>
  .chart-state {
    display: grid;
    min-height: 12rem;
    margin: 0;
    place-items: center;
    color: var(--muted-foreground);
  }

  .chart-frame :global(svg) {
    min-width: 0 !important;
  }

  .chart-loading {
    border-radius: 0.5rem;
    background: linear-gradient(90deg, var(--muted), var(--card), var(--muted));
    background-size: 200% 100%;
    animation: surface-pulse 1.5s ease-in-out infinite;
  }

  @keyframes surface-pulse {
    to { background-position: -200% 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .chart-loading { animation: none; }
  }
</style>
