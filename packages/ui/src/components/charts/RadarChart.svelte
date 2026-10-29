<script lang="ts">
  interface Indicator {
    name: string;
    max?: number;
  }

  interface Series {
    name: string;
    values: number[];
    color?: string;
  }

  interface Props {
    indicators: Indicator[];
    series: Series[];
    size?: number;
    levels?: number;
    showLegend?: boolean;
    class?: string;
  }

  let { indicators, series, size = 260, levels = 4, showLegend = true, class: className = '' }: Props = $props();

  const palette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
  const center = $derived(size / 2);
  const radius = $derived(size / 2 - 34);
  const count = $derived(indicators.length);

  function point(index: number, ratio: number) {
    const angle = (-90 + (360 / Math.max(count, 1)) * index) * (Math.PI / 180);
    return {
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio,
    };
  }

  function polygon(ratio: number) {
    return indicators.map((_, i) => {
      const p = point(i, ratio);
      return `${p.x},${p.y}`;
    }).join(' ');
  }

  function seriesPolygon(values: number[]) {
    return indicators.map((indicator, i) => {
      const max = indicator.max ?? Math.max(...values, 1);
      const ratio = Math.max(0, Math.min(1, (values[i] ?? 0) / (max || 1)));
      const p = point(i, ratio);
      return `${p.x},${p.y}`;
    }).join(' ');
  }

  const description = $derived(
    series.map((item) => `${item.name}: ${item.values.join(', ')}`).join('; '),
  );
</script>

<div class="inline-flex flex-col items-center gap-3 {className}">
  {#if count === 0 || series.length === 0}
    <p class="py-8 text-sm text-muted-foreground">No data</p>
  {:else}
    <svg viewBox="0 0 {size} {size}" width={size} height={size} role="img" aria-label={description}>
      {#each Array.from({ length: levels }, (_, i) => (i + 1) / levels) as ratio (ratio)}
        <polygon
          points={polygon(ratio)}
          fill="none"
          stroke="var(--border)"
          stroke-width="1"
        />
      {/each}

      {#each indicators as indicator, i (indicator.name)}
        {@const end = point(i, 1)}
        <line x1={center} y1={center} x2={end.x} y2={end.y} stroke="var(--border)" stroke-width="1" />
        {@const label = point(i, 1.16)}
        <text
          x={label.x}
          y={label.y}
          text-anchor={label.x < center - 4 ? 'end' : label.x > center + 4 ? 'start' : 'middle'}
          dominant-baseline="middle"
          fill="var(--muted-foreground)"
          font-size="11"
        >
          {indicator.name}
        </text>
      {/each}

      {#each series as item, index (item.name)}
        {@const color = item.color ?? palette[index % palette.length]}
        <polygon
          points={seriesPolygon(item.values)}
          fill={color}
          fill-opacity="0.16"
          stroke={color}
          stroke-width="2"
          stroke-linejoin="round"
        />
        {#each item.values as value, i (i)}
          {@const indicator = indicators[i]}
          {#if indicator}
            {@const max = indicator.max ?? Math.max(...item.values, 1)}
            {@const p = point(i, Math.max(0, Math.min(1, value / (max || 1))))}
            <circle cx={p.x} cy={p.y} r="2.5" fill={color}>
              <title>{indicator.name}: {value}</title>
            </circle>
          {/if}
        {/each}
      {/each}
    </svg>

    {#if showLegend}
      <div class="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {#each series as item, index (item.name)}
          <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              class="h-2.5 w-2.5 rounded-full"
              style="background-color: {item.color ?? palette[index % palette.length]};"
            ></span>
            {item.name}
          </span>
        {/each}
      </div>
    {/if}
  {/if}
</div>