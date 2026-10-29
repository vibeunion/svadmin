<script lang="ts">
  interface Props {
    value: number;
    min?: number;
    max?: number;
    size?: number;
    thickness?: number;
    label?: string;
    format?: (value: number) => string;
    color?: string;
    class?: string;
  }

  let {
    value,
    min = 0,
    max = 100,
    size = 180,
    thickness = 14,
    label,
    format = (next: number) => String(next),
    color = 'var(--primary)',
    class: className = '',
  }: Props = $props();

  const center = $derived(size / 2);
  const radius = $derived(size / 2 - thickness / 2 - 4);
  const startAngle = -120;
  const endAngle = 120;
  const percent = $derived(Math.max(0, Math.min(1, (value - min) / (max - min || 1))));

  function polar(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) };
  }

  function arcPath(from: number, to: number) {
    const start = polar(from);
    const end = polar(to);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
  }
</script>

<div class="inline-flex flex-col items-center {className}">
  <svg viewBox="0 0 {size} {size}" width={size} height={size} role="img" aria-label={label ?? `${format(value)}`}>
    <path
      d={arcPath(startAngle, endAngle)}
      fill="none"
      stroke="var(--muted)"
      stroke-width={thickness}
      stroke-linecap="round"
      pathLength="100"
    />
    <path
      d={arcPath(startAngle, endAngle)}
      fill="none"
      stroke={color}
      stroke-width={thickness}
      stroke-linecap="round"
      pathLength="100"
      stroke-dasharray="{percent * 100} 100"
      class="transition-all duration-500"
    />
    <text x={center} y={center - 2} text-anchor="middle" fill="var(--foreground)" font-size={size * 0.14} font-weight="600">
      {format(value)}
    </text>
    {#if label}
      <text x={center} y={center + size * 0.12} text-anchor="middle" fill="var(--muted-foreground)" font-size="11">
        {label}
      </text>
    {/if}
  </svg>
</div>