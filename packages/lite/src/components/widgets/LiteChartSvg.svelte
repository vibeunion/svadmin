<script lang="ts">
  import {
    areaPath,
    donutSlices,
    funnelRects,
    gaugeArc,
    heatCells,
    hasData,
    labels,
    pieSlices,
    polyline,
    radarPolygon,
    roseSlices,
    scatterPoints,
    series,
    waterfallBars,
    type Basket,
  } from './chart-geometry';

  interface Props {
    kind: string;
    rows?: Array<Array<string | number>>;
    title?: string;
    /** Value axis hint used by pie and donut legends. */
    summary?: string;
  }

  let { kind, rows = [], title, summary }: Props = $props();

  const basket: Basket = { width: 320, height: 160, padding: 12 };
  const palette = ['#165DFF', '#FF7D00', '#00B42A', '#F53F3F', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899', '#0EA5E9', '#A855F7'];
  const values = $derived(series(rows));
  const names = $derived(labels(rows));
  const label = $derived(`${title ?? kind} chart`);
  const gauge = $derived(gaugeArc(values[0] ?? 0, 100, basket));
</script>

{#if hasData(rows)}
  <figure class="lite-chart-svg">
    <svg viewBox={`0 0 ${basket.width} ${basket.height}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      <title>{label}{summary ? ` — ${summary}` : ''}</title>
      {#if kind === 'area'}
        <path d={areaPath(values, basket)} fill="#165DFF" fill-opacity="0.18" stroke="#165DFF" stroke-width="2" />
      {:else if kind === 'scatter'}
        <polyline points={polyline(values, basket)} fill="none" stroke="#C9CDD4" stroke-width="1" stroke-dasharray="3 3" />
        {#each scatterPoints(values, basket) as point, index (index)}
          <circle cx={point.x} cy={point.y} r="3.5" fill={palette[index % palette.length]} />
        {/each}
      {:else if kind === 'radar'}
        {@const radar = radarPolygon(values, basket)}
        {#each radar.axes as axis, index (index)}
          <polyline points={axis} fill="none" stroke="#E5E6EB" stroke-width="1" />
        {/each}
        <polygon points={radar.polygon} fill="#165DFF" fill-opacity="0.2" stroke="#165DFF" stroke-width="2" />
      {:else if kind === 'gauge'}
        <path d={gauge.track} fill="none" stroke="#E5E6EB" stroke-width="12" stroke-linecap="round" />
        <path d={gauge.value} fill="none" stroke="#165DFF" stroke-width="12" stroke-linecap="round" />
        <text x={basket.width / 2} y={basket.height - 24} text-anchor="middle" font-size="18" fill="#1D2129">{gauge.percent}%</text>
      {:else if kind === 'funnel'}
        {#each funnelRects(values, basket) as rect, index (index)}
          <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill={palette[index % palette.length]} fill-opacity="0.85" />
        {/each}
      {:else if kind === 'heatmap'}
        {#each heatCells(values, basket) as cell, index (index)}
          <rect x={cell.x} y={cell.y} width={cell.width} height={cell.height} rx="2" fill="#165DFF" fill-opacity={cell.opacity} />
        {/each}
      {:else if kind === 'waterfall'}
        {#each waterfallBars(values, basket) as bar, index (index)}
          <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={bar.positive ? '#00B42A' : '#F53F3F'} fill-opacity="0.85" />
        {/each}
      {:else if kind === 'rose'}
        {#each roseSlices(values, basket) as slice, index (index)}
          <path d={slice.path} fill={palette[index % palette.length]} fill-opacity="0.85" />
        {/each}
      {:else if kind === 'donut'}
        {#each donutSlices(values, basket) as slice, index (index)}
          <path d={slice.path} fill={palette[index % palette.length]} fill-opacity="0.9" />
        {/each}
      {:else}
        {#each pieSlices(values, basket) as slice, index (index)}
          <path d={slice.path} fill={palette[index % palette.length]} fill-opacity="0.9" />
        {/each}
      {/if}
    </svg>
    <figcaption class="lite-chart-svg__legend">
      {#each names as name, index (index)}
        <span class="lite-chart-svg__legend-item">
          <span class="lite-chart-svg__swatch" style={`background:${palette[index % palette.length]}`} aria-hidden="true"></span>
          {name}
        </span>
      {/each}
    </figcaption>
  </figure>
{/if}

<style>
  .lite-chart-svg { display: block; margin: 0; padding: 12px 16px; border-bottom: 1px solid #E5E6EB; }
  .lite-chart-svg svg { display: block; width: 100%; height: auto; max-height: 220px; }
  .lite-chart-svg__legend { display: flex; flex-wrap: wrap; padding-top: 8px; }
  .lite-chart-svg__legend-item { display: inline-flex; align-items: center; margin: 0 12px 4px 0; color: #4E5969; font-size: 12px; }
  .lite-chart-svg__swatch { width: 8px; height: 8px; margin-right: 6px; border-radius: 2px; }
</style>