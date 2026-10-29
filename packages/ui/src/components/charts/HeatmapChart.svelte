<script lang="ts">
  interface Cell {
    x: string;
    y: string;
    value: number;
  }

  interface Props {
    data: Cell[];
    xLabels?: string[];
    yLabels?: string[];
    cellSize?: number;
    gap?: number;
    max?: number;
    format?: (value: number) => string;
    class?: string;
  }

  let {
    data,
    xLabels,
    yLabels,
    cellSize = 36,
    gap = 4,
    max,
    format = (value: number) => value.toLocaleString(),
    class: className = '',
  }: Props = $props();

  const xs = $derived(xLabels ?? [...new Set(data.map((cell) => cell.x))]);
  const ys = $derived(yLabels ?? [...new Set(data.map((cell) => cell.y))]);
  const ceiling = $derived(max ?? Math.max(...data.map((cell) => cell.value), 1));
  const labelSpace = 72;
  const width = $derived(labelSpace + xs.length * (cellSize + gap));
  const height = $derived(ys.length * (cellSize + gap) + 24);

  function cellValue(x: string, y: string) {
    return data.find((cell) => cell.x === x && cell.y === y)?.value;
  }
</script>

<div class="inline-flex flex-col items-start gap-2 {className}">
  {#if xs.length === 0 || ys.length === 0}
    <p class="py-8 text-sm text-muted-foreground">No data</p>
  {:else}
    <svg viewBox="0 0 {width} {height}" width={width} height={height} role="img" aria-label="Heatmap">
      {#each xs as x, xi (x)}
        <text x={labelSpace + xi * (cellSize + gap) + cellSize / 2} y={12} text-anchor="middle" fill="var(--muted-foreground)" font-size="10">
          {x}
        </text>
      {/each}
      {#each ys as y, yi (y)}
        <text x={labelSpace - 8} y={20 + yi * (cellSize + gap) + cellSize / 2} text-anchor="end" dominant-baseline="middle" fill="var(--muted-foreground)" font-size="10">
          {y}
        </text>
        {#each xs as x, xi (x)}
          {@const value = cellValue(x, y)}
          <rect
            x={labelSpace + xi * (cellSize + gap)}
            y={20 + yi * (cellSize + gap)}
            width={cellSize}
            height={cellSize}
            rx="4"
            fill="var(--primary)"
            fill-opacity={value === undefined ? 0.04 : 0.12 + 0.88 * Math.max(0, Math.min(1, value / (ceiling || 1)))}
            stroke="var(--border)"
            stroke-width="0.5"
          >
            <title>{y} / {x}: {value === undefined ? '—' : format(value)}</title>
          </rect>
        {/each}
      {/each}
    </svg>
    <div class="flex items-center gap-2 text-[10px] text-muted-foreground">
      <span>Low</span>
      <span class="flex overflow-hidden rounded-sm">
        {#each [0.15, 0.35, 0.55, 0.75, 1] as opacity (opacity)}
          <span class="h-2.5 w-5 bg-primary" style="opacity: {opacity};"></span>
        {/each}
      </span>
      <span>High</span>
    </div>
  {/if}
</div>