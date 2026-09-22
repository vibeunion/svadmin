<script lang="ts">
  import { cn } from '../../utils.js';

  interface ScatterPoint {
    x: number;
    y: number;
    label?: string;
    color?: string;
  }

  interface Props {
    data: ScatterPoint[];
    height?: number;
    pointRadius?: number;
    xLabel?: string;
    yLabel?: string;
    class?: string;
  }

  let {
    data,
    height = 220,
    pointRadius = 4,
    xLabel,
    yLabel,
    class: className = '',
  }: Props = $props();

  const width = 480;
  const padding = { top: 16, right: 16, bottom: 32, left: 40 };
  const innerWidth = $derived(width - padding.left - padding.right);
  const innerHeight = $derived(height - padding.top - padding.bottom);

  const bounds = $derived.by(() => {
    const xs = data.map((point) => point.x);
    const ys = data.map((point) => point.y);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 1);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 1);
    return {
      minX,
      maxX: maxX === minX ? minX + 1 : maxX,
      minY,
      maxY: maxY === minY ? minY + 1 : maxY,
    };
  });

  function scaleX(value: number): number {
    return padding.left + ((value - bounds.minX) / (bounds.maxX - bounds.minX)) * innerWidth;
  }

  function scaleY(value: number): number {
    return padding.top + innerHeight - ((value - bounds.minY) / (bounds.maxY - bounds.minY)) * innerHeight;
  }
</script>

<div class={cn('svadmin-scatter-chart', className)} data-slot="scatter-chart">
  <svg
    viewBox={`0 0 ${width} ${height}`}
    role="img"
    aria-label={[yLabel ?? 'Y', xLabel ?? 'X'].join(' by ')}
    preserveAspectRatio="none"
  >
    <line x1={padding.left} y1={padding.top + innerHeight} x2={width - padding.right} y2={padding.top + innerHeight} stroke="var(--border, currentColor)" />
    <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerHeight} stroke="var(--border, currentColor)" />

    {#if xLabel}<text x={width - padding.right} y={height - 6} text-anchor="end" fill="var(--muted-foreground, currentColor)" font-size="10">{xLabel}</text>{/if}
    {#if yLabel}<text x={padding.left - 6} y={padding.top + 8} text-anchor="end" fill="var(--muted-foreground, currentColor)" font-size="10">{yLabel}</text>{/if}

    {#each data as point, index (index)}
      <circle cx={scaleX(point.x)} cy={scaleY(point.y)} r={pointRadius} fill={point.color ?? 'var(--primary, currentColor)'} opacity="0.85">
        <title>{point.label ?? `${point.x}, ${point.y}`}</title>
      </circle>
    {/each}
  </svg>
</div>

<style>
  .svadmin-scatter-chart { width: 100%; color: var(--foreground, currentColor); }
  .svadmin-scatter-chart svg { display: block; width: 100%; height: auto; }
</style>