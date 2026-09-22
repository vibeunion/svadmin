<script lang="ts">
  import { cn } from '../../utils.js';

  interface AreaPoint {
    label: string;
    value: number;
    color?: string;
  }

  interface Props {
    data: AreaPoint[];
    height?: number;
    /** Stroke width of the value line. */
    strokeWidth?: number;
    /** Fills the area under the line. Defaults to `true`. */
    fill?: boolean;
    class?: string;
  }

  let {
    data,
    height = 200,
    strokeWidth = 2,
    fill = true,
    class: className = '',
  }: Props = $props();

  const width = 480;
  const padding = { top: 16, right: 16, bottom: 28, left: 36 };

  const maxValue = $derived(Math.max(...data.map((point) => point.value), 1));
  const innerWidth = $derived(width - padding.left - padding.right);
  const innerHeight = $derived(height - padding.top - padding.bottom);

  const coords = $derived.by(() =>
    data.map((point, index) => {
      const x = padding.left + (data.length <= 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
      const y = padding.top + innerHeight - (point.value / maxValue) * innerHeight;
      return { ...point, x, y };
    }),
  );

  const linePath = $derived(coords.map((point) => `${point.x},${point.y}`).join(' '));
  const areaPath = $derived(
    coords.length
      ? `M ${coords[0]?.x ?? 0} ${padding.top + innerHeight} L ${linePath.replace(/ /gu, ' L ')} L ${coords.at(-1)?.x ?? 0} ${padding.top + innerHeight} Z`
      : '',
  );
  const gridLines = $derived([0, 0.25, 0.5, 0.75, 1]);
</script>

<div class={cn('svadmin-area-chart', className)} data-slot="area-chart">
  <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Area chart" preserveAspectRatio="none">
    {#each gridLines as ratio (ratio)}
      {@const y = padding.top + innerHeight * ratio}
      <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border, currentColor)" stroke-width="1" opacity="0.6" />
      <text x={padding.left - 6} y={y + 3} text-anchor="end" fill="var(--muted-foreground, currentColor)" font-size="10">{Math.round(maxValue * (1 - ratio))}</text>
    {/each}

    {#if fill && areaPath}
      <path d={areaPath} fill="var(--primary, currentColor)" opacity="0.16" />
    {/if}

    {#if linePath}
      <polyline points={linePath} fill="none" stroke="var(--primary, currentColor)" stroke-width={strokeWidth} stroke-linejoin="round" stroke-linecap="round" />
    {/if}

    {#each coords as point, index (index)}
      <circle cx={point.x} cy={point.y} r="3" fill={point.color ?? 'var(--primary, currentColor)'} />
      <text x={point.x} y={height - 8} text-anchor="middle" fill="var(--muted-foreground, currentColor)" font-size="10">{point.label}</text>
    {/each}
  </svg>
</div>

<style>
  .svadmin-area-chart { width: 100%; color: var(--foreground, currentColor); }
  .svadmin-area-chart svg { display: block; width: 100%; height: auto; }
</style>