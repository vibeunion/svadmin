<script lang="ts">
  interface Stage {
    label: string;
    value: number;
    color?: string;
  }

  interface Props {
    data: Stage[];
    width?: number;
    stageHeight?: number;
    gap?: number;
    showValue?: boolean;
    class?: string;
  }

  let {
    data,
    width = 320,
    stageHeight = 52,
    gap = 6,
    showValue = true,
    class: className = '',
  }: Props = $props();

  const palette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
  const max = $derived(Math.max(...data.map((item) => item.value), 1));
  const height = $derived(data.length * stageHeight + Math.max(0, data.length - 1) * gap);
  const total = $derived(data[0]?.value ?? 0);

  function halfWidth(value: number) {
    return Math.max(12, (value / max) * (width / 2 - 12));
  }
</script>

<div class="inline-flex flex-col items-center {className}">
  {#if data.length === 0}
    <p class="py-8 text-sm text-muted-foreground">No data</p>
  {:else}
    <svg viewBox="0 0 {width} {height}" width={width} height={height} role="img" aria-label="Funnel chart">
      {#each data as stage, index (stage.label)}
        {@const top = index * (stageHeight + gap)}
        {@const topHalf = halfWidth(stage.value)}
        {@const next = data[index + 1]}
        {@const nextHalf = halfWidth(next?.value ?? stage.value * 0.7)}
        {@const color = stage.color ?? palette[index % palette.length]}
        <polygon
          points="{width / 2 - topHalf},{top} {width / 2 + topHalf},{top} {width / 2 + nextHalf},{top + stageHeight} {width / 2 - nextHalf},{top + stageHeight}"
          fill={color}
          fill-opacity="0.18"
          stroke={color}
          stroke-width="1.5"
        >
          <title>{stage.label}: {stage.value}</title>
        </polygon>
        <text x={width / 2} y={top + 20} text-anchor="middle" fill="var(--foreground)" font-size="12" font-weight="500">
          {stage.label}
        </text>
        {#if showValue}
          {@const ratio = total > 0 ? ((stage.value / total) * 100).toFixed(1) : '0.0'}
          <text x={width / 2} y={top + 37} text-anchor="middle" fill="var(--muted-foreground)" font-size="11">
            {stage.value.toLocaleString()} · {ratio}%
          </text>
        {/if}
      {/each}
    </svg>
  {/if}
</div>