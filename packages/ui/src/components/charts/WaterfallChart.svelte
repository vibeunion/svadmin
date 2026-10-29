<script lang="ts">
  interface Item {
    label: string;
    value: number;
    type?: 'increase' | 'decrease' | 'total';
  }

  interface Props {
    data: Item[];
    width?: number;
    height?: number;
    showLegend?: boolean;
    class?: string;
  }

  let { data, width = 360, height = 220, showLegend = true, class: className = '' }: Props = $props();

  const padding = { top: 12, right: 8, bottom: 28, left: 36 };
  const plotWidth = $derived(width - padding.left - padding.right);
  const plotHeight = $derived(height - padding.top - padding.bottom);
  const barWidth = $derived((plotWidth / Math.max(data.length, 1)) * 0.56);

  const steps = $derived.by(() => {
    let running = 0;
    return data.map((item) => {
      const type = item.type ?? (item.value < 0 ? 'decrease' : 'increase');
      if (type === 'total') {
        const step = { ...item, type, start: 0, end: running };
        running = item.value;
        return step;
      }
      const start = running;
      const end = running + item.value;
      running = end;
      return { ...item, type, start, end };
    });
  });

  const bounds = $derived.by(() => {
    const values = steps.flatMap((step) => [step.start, step.end, 0]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max: max === min ? min + 1 : max };
  });

  function y(value: number) {
    return padding.top + plotHeight - ((value - bounds.min) / (bounds.max - bounds.min)) * plotHeight;
  }

  function fill(type: 'increase' | 'decrease' | 'total') {
    if (type === 'decrease') return 'var(--destructive)';
    if (type === 'total') return 'var(--muted-foreground)';
    return 'var(--primary)';
  }
</script>

<div class="inline-flex flex-col items-center gap-2 {className}">
  {#if data.length === 0}
    <p class="py-8 text-sm text-muted-foreground">No data</p>
  {:else}
    <svg viewBox="0 0 {width} {height}" width={width} height={height} role="img" aria-label="Waterfall chart">
      <line x1={padding.left} y1={y(0)} x2={width - padding.right} y2={y(0)} stroke="var(--border)" />
      <text x={padding.left - 6} y={y(bounds.max) + 4} text-anchor="end" fill="var(--muted-foreground)" font-size="9">
        {bounds.max.toLocaleString()}
      </text>
      <text x={padding.left - 6} y={y(bounds.min)} text-anchor="end" fill="var(--muted-foreground)" font-size="9">
        {bounds.min.toLocaleString()}
      </text>
      {#each steps as step, index (step.label)}
        {@const left = padding.left + (plotWidth / Math.max(steps.length, 1)) * index + (plotWidth / Math.max(steps.length, 1) - barWidth) / 2}
        {@const top = Math.min(y(step.start), y(step.end))}
        {@const barHeight = Math.max(1, Math.abs(y(step.start) - y(step.end)))}
        <rect x={left} y={top} width={barWidth} height={barHeight} rx="2" fill={fill(step.type)} fill-opacity={step.type === 'total' ? 0.7 : 0.9}>
          <title>{step.label}: {step.value}</title>
        </rect>
        {#if index < steps.length - 1}
          {@const connectorY = y(step.end)}
          <line
            x1={left + barWidth}
            y1={connectorY}
            x2={padding.left + (plotWidth / Math.max(steps.length, 1)) * (index + 1) + (plotWidth / Math.max(steps.length, 1) - barWidth) / 2}
            y2={connectorY}
            stroke="var(--border)"
            stroke-dasharray="3 2"
          />
        {/if}
        <text x={left + barWidth / 2} y={height - 10} text-anchor="middle" fill="var(--muted-foreground)" font-size="9">
          {step.label}
        </text>
      {/each}
    </svg>
    {#if showLegend}
      <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-primary"></span>Increase</span>
        <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-destructive"></span>Decrease</span>
        <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-muted-foreground"></span>Total</span>
      </div>
    {/if}
  {/if}
</div>