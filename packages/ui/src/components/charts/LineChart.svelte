<script lang="ts">
  interface DataPoint {
    label: string;
    value: number;
  }

  interface Props {
    data: DataPoint[];
    height?: number;
    color?: string;
    /** Show dots at data points */
    showDots?: boolean;
    /** Fill area under the line */
    fill?: boolean;
    class?: string;
  }

  let { data, height = 200, color = 'var(--primary)', showDots = true, fill = true, class: className = '' }: Props = $props();

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = $derived(Math.max(data.length * 60, 300));
  const chartHeight = $derived(height - padding.top - padding.bottom);

  const maxValue = $derived(Math.max(...data.map(d => d.value), 1));
  const minValue = $derived(Math.min(...data.map(d => d.value), 0));
  const range = $derived(maxValue - minValue || 1);

  function getX(i: number): number {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (i / (data.length - 1)) * (chartWidth - padding.left - padding.right);
  }

  function getY(value: number): number {
    return padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
  }

  const linePath = $derived(
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(' ')
  );

  const areaPath = $derived(
    linePath + ` L ${getX(data.length - 1)} ${padding.top + chartHeight} L ${getX(0)} ${padding.top + chartHeight} Z`
  );
</script>

<div class="svadmin-u-6da6a3c3f741 svadmin-u-1384f66f41d0 {className}">
  <svg viewBox="0 0 {chartWidth} {height}" class="svadmin-u-6da6a3c3f741" style="min-width: {Math.min(chartWidth, 300)}px;">
    <!-- Grid lines -->
    {#each [0, 0.25, 0.5, 0.75, 1] as ratio, _i (_i)}
      {@const y = padding.top + chartHeight * (1 - ratio)}
      <line
        x1={padding.left}
        y1={y}
        x2={chartWidth - padding.right}
        y2={y}
        stroke="var(--border)"
        stroke-width="1"
        stroke-dasharray={ratio === 0 ? 'none' : '4 4'}
        opacity="0.5"
      />
      <text x={padding.left - 8} y={y + 4} text-anchor="end" fill="var(--muted-foreground)" font-size="10">
        {Math.round(minValue + range * ratio)}
      </text>
    {/each}

    <!-- Area fill -->
    {#if fill && data.length > 1}
      <path
        d={areaPath}
        fill={color}
        opacity="0.08"
      />
    {/if}

    <!-- Line -->
    {#if data.length > 1}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <animate attributeName="stroke-dashoffset" from="2000" to="0" dur="1s" fill="freeze" />
      </path>
    {/if}

    <!-- Dots -->
    {#if showDots}
      {#each data as point, i (i)}
        <circle
          cx={getX(i)}
          cy={getY(point.value)}
          r="4"
          fill="var(--background)"
          stroke={color}
          stroke-width="2"
          class="svadmin-line-chart-point svadmin-u-0fe7d7d814d0 svadmin-u-625a4c3fbeb2"
        />
      {/each}
    {/if}

    <!-- X-axis labels -->
    {#each data as point, i (i)}
      <text
        x={getX(i)}
        y={height - 4}
        text-anchor="middle"
        fill="var(--muted-foreground)"
        font-size="10"
      >{point.label}</text>
    {/each}
  </svg>
</div>
