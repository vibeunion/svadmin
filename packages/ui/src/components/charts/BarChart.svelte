<script lang="ts">
  interface DataPoint {
    label: string;
    value: number;
    color?: string;
  }

  interface Props {
    data: DataPoint[];
    height?: number;
    /** Show value labels on top of bars */
    showValues?: boolean;
    class?: string;
  }

  let { data, height = 200, showValues = true, class: className = '' }: Props = $props();

  const maxValue = $derived(Math.max(...data.map(d => d.value), 1));
  const barWidth = $derived(Math.max(20, Math.min(60, 400 / data.length)));
  const gap = $derived(Math.max(4, barWidth * 0.3));
  const totalWidth = $derived(data.length * (barWidth + gap) - gap + 40);
</script>

<div class="w-full overflow-x-auto {className}">
  <svg viewBox="0 0 {totalWidth} {height + 30}" class="w-full" style="min-width: {Math.min(totalWidth, 300)}px;">
    <!-- Bars -->
    {#each data as point, i (i)}
      {@const barHeight = (point.value / maxValue) * (height - 20)}
      {@const x = 20 + i * (barWidth + gap)}
      {@const y = height - barHeight}

      <!-- Bar with animation -->
      <rect
        {x}
        {y}
        width={barWidth}
        height={barHeight}
        rx="4"
        fill={point.color || 'var(--primary)'}
        opacity="0.85"
        class="transition-all duration-500 hover:opacity-100"
      >
        <animate attributeName="height" from="0" to={barHeight} dur="0.6s" fill="freeze" calcMode="spline" keySplines="0.16 1 0.3 1" />
        <animate attributeName="y" from={height} to={y} dur="0.6s" fill="freeze" calcMode="spline" keySplines="0.16 1 0.3 1" />
      </rect>

      <!-- Value label -->
      {#if showValues}
        <text
          x={x + barWidth / 2}
          y={y - 6}
          text-anchor="middle"
          fill="var(--muted-foreground)"
          font-size="11"
          font-weight="500"
        >{point.value}</text>
      {/if}

      <!-- X-axis label -->
      <text
        x={x + barWidth / 2}
        y={height + 16}
        text-anchor="middle"
        fill="var(--muted-foreground)"
        font-size="10"
      >{point.label}</text>
    {/each}
  </svg>
</div>
