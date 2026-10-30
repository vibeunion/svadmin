<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { BoxPlotGroup, BoxPlotStats } from './boxplot.js';

  interface Props {
    data: BoxPlotGroup[];
    height?: number;
    width?: number;
    showOutliers?: boolean;
    format?: (value: number) => string;
    class?: string;
  }

  let {
    data,
    height = 280,
    width: initialWidth = 480,
    showOutliers = true,
    format = (value: number) => value.toLocaleString(),
    class: className = '',
  }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let width = $state(untrack(() => initialWidth));
  const margins = { top: 16, right: 16, bottom: 32, left: 44 };
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
  const plotWidth = $derived(Math.max(40, width - margins.left - margins.right));
  const plotHeight = $derived(Math.max(40, height - margins.top - margins.bottom));

  function quantile(sorted: number[], q: number): number {
    if (sorted.length === 0) return 0;
    const position = (sorted.length - 1) * q;
    const base = Math.floor(position);
    const rest = position - base;
    const next = sorted[base + 1];
    return next === undefined ? sorted[base] ?? 0 : (sorted[base] ?? 0) + rest * (next - (sorted[base] ?? 0));
  }

  const stats = $derived.by<BoxPlotStats[]>(() => data.map((group, index) => {
    const sorted = [...group.values].sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const low = q1 - iqr * 1.5;
    const high = q3 + iqr * 1.5;
    const inside = sorted.filter((value) => value >= low && value <= high);
    return {
      label: group.label,
      q1,
      median: quantile(sorted, 0.5),
      q3,
      min: inside[0] ?? sorted[0] ?? 0,
      max: inside[inside.length - 1] ?? sorted[sorted.length - 1] ?? 0,
      outliers: sorted.filter((value) => value < low || value > high),
      color: group.color ?? colors[index % colors.length],
    };
  }));

  const domain = $derived.by(() => {
    const values = stats.flatMap((item) => [item.min, item.max, ...(showOutliers ? item.outliers : [])]);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const padding = (max - min) * 0.08 || 1;
    return { min: min - padding, max: max + padding };
  });

  const band = $derived(plotWidth / Math.max(stats.length, 1));
  const boxWidth = $derived(Math.min(48, band * 0.55));

  function y(value: number): number {
    return margins.top + plotHeight - ((value - domain.min) / (domain.max - domain.min || 1)) * plotHeight;
  }

  function x(index: number): number {
    return margins.left + band * index + band / 2;
  }

  onMount(() => {
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) width = entry.contentRect.width;
    });
    observer.observe(host);
    return () => observer.disconnect();
  });
</script>

<div bind:this={host} class={className} style={`width:100%;height:${height}px`}>
  {#if stats.length === 0}
    <p class="svadmin-chart-empty">No data</p>
  {:else}
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Box plot">
      {#each [0, 1, 2, 3, 4] as step (step)}
        {@const value = domain.min + (domain.max - domain.min) * (step / 4)}
        <line x1={margins.left} y1={y(value)} x2={width - margins.right} y2={y(value)} stroke="var(--border)" stroke-width="1" />
        <text x={margins.left - 6} y={y(value)} text-anchor="end" dominant-baseline="middle" fill="var(--muted-foreground)" font-size="9">
          {format(value)}
        </text>
      {/each}
      {#each stats as item, index (item.label)}
        {@const center = x(index)}
        {@const color = item.color ?? colors[index % colors.length]}
        <g>
          <title>{item.label}: min {format(item.min)}, Q1 {format(item.q1)}, median {format(item.median)}, Q3 {format(item.q3)}, max {format(item.max)}</title>
          <line x1={center} y1={y(item.min)} x2={center} y2={y(item.q1)} stroke={color} stroke-width="1.5" />
          <line x1={center} y1={y(item.q3)} x2={center} y2={y(item.max)} stroke={color} stroke-width="1.5" />
          <line x1={center - boxWidth * 0.25} y1={y(item.min)} x2={center + boxWidth * 0.25} y2={y(item.min)} stroke={color} stroke-width="1.5" />
          <line x1={center - boxWidth * 0.25} y1={y(item.max)} x2={center + boxWidth * 0.25} y2={y(item.max)} stroke={color} stroke-width="1.5" />
          <rect
            x={center - boxWidth / 2}
            y={y(item.q3)}
            width={boxWidth}
            height={Math.max(1, y(item.q1) - y(item.q3))}
            rx="2"
            fill={color}
            fill-opacity="0.22"
            stroke={color}
            stroke-width="1.5"
          />
          <line x1={center - boxWidth / 2} y1={y(item.median)} x2={center + boxWidth / 2} y2={y(item.median)} stroke={color} stroke-width="2.5" />
          {#if showOutliers}
            {#each item.outliers as outlier (outlier)}
              <circle cx={center + (outlier % 3 - 1) * 4} cy={y(outlier)} r="2.5" fill={color} fill-opacity="0.7" />
            {/each}
          {/if}
          <text x={center} y={height - 10} text-anchor="middle" fill="var(--muted-foreground)" font-size="10">{item.label}</text>
        </g>
      {/each}
    </svg>
  {/if}
</div>

<style>
  .svadmin-chart-empty { margin: 0; padding: 3rem 1rem; color: var(--muted-foreground); font-size: 0.875rem; text-align: center; }
</style>
