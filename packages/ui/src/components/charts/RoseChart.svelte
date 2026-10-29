<script lang="ts">
  interface Slice {
    label: string;
    value: number;
    color?: string;
  }

  interface Props {
    data: Slice[];
    size?: number;
    innerRadius?: number;
    showLegend?: boolean;
    class?: string;
  }

  let { data, size = 220, innerRadius = 24, showLegend = true, class: className = '' }: Props = $props();

  const palette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
  const center = $derived(size / 2);
  const outer = $derived(size / 2 - 8);
  const max = $derived(Math.max(...data.map((item) => item.value), 1));
  const angle = $derived(360 / Math.max(data.length, 1));

  function polar(radius: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) };
  }

  function wedge(index: number, value: number) {
    const start = index * angle;
    const end = start + angle - 0.6;
    const r = innerRadius + (outer - innerRadius) * Math.sqrt(value / (max || 1));
    const p1 = polar(innerRadius, start);
    const p2 = polar(r, start);
    const p3 = polar(r, end);
    const p4 = polar(innerRadius, end);
    const large = end - start > 180 ? 1 : 0;
    return [
      `M ${p1.x} ${p1.y}`,
      `L ${p2.x} ${p2.y}`,
      `A ${r} ${r} 0 ${large} 1 ${p3.x} ${p3.y}`,
      `L ${p4.x} ${p4.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${large} 0 ${p1.x} ${p1.y}`,
      'Z',
    ].join(' ');
  }
</script>

<div class="inline-flex flex-col items-center gap-3 {className}">
  {#if data.length === 0}
    <p class="py-8 text-sm text-muted-foreground">No data</p>
  {:else}
    <svg viewBox="0 0 {size} {size}" width={size} height={size} role="img" aria-label="Rose chart">
      {#each data as item, index (item.label)}
        <path
          d={wedge(index, item.value)}
          fill={item.color ?? palette[index % palette.length]}
          fill-opacity="0.85"
          stroke="var(--background)"
          stroke-width="1.5"
          class="transition-opacity hover:opacity-80"
        >
          <title>{item.label}: {item.value}</title>
        </path>
      {/each}
    </svg>
    {#if showLegend}
      <div class="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {#each data as item, index (item.label)}
          <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span class="h-2.5 w-2.5 rounded-full" style="background-color: {item.color ?? palette[index % palette.length]};"></span>
            {item.label}
          </span>
        {/each}
      </div>
    {/if}
  {/if}
</div>