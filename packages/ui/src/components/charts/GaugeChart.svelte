<script lang="ts">
  import { cn } from '../../utils.js';
  import type { Snippet } from 'svelte';

  export type GaugeTone = 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';
  export type GaugeType = 'half' | 'arc' | 'circle';
  export type GaugeMode = 'progress' | 'needle' | 'both';

  export interface GaugeThreshold {
    /** Upper bound value of this segment/threshold zone */
    value: number;
    /** Semantic tone (success, warning, destructive, primary, info, muted) */
    tone?: GaugeTone | undefined;
    /** Optional custom CSS color token or variable expression (e.g. 'var(--chart-1)') */
    color?: string | undefined;
    /** Human-readable label for this threshold zone (e.g. 'Normal', 'Warning', 'Critical') */
    label?: string | undefined;
  }

  export interface GaugeChartProps {
    /** Current numeric metric value */
    value: number;
    /** Minimum gauge value (default: 0) */
    min?: number | undefined;
    /** Maximum gauge value (default: 100) */
    max?: number | undefined;
    /** Unit suffix (e.g. '%', 'MB/s', 'req/s', 'ms', '°C') */
    unit?: string | undefined;
    /** Metric title / label */
    label?: string | undefined;
    /** Subtitle or contextual note (e.g. 'Target: < 80%', 'Peak: 95%') */
    subtext?: string | undefined;
    /** Gauge arc span type: 'half' (180° semi-circle), 'arc' (240° speedometer), 'circle' (270° wide arc) */
    type?: GaugeType | undefined;
    /** Display mode: 'progress' (filled progress arc), 'needle' (classic indicator needle), 'both' */
    mode?: GaugeMode | undefined;
    /** Custom threshold intervals. Defaults to [0..60 success, 60..85 warning, 85..100 destructive] */
    thresholds?: GaugeThreshold[] | undefined;
    /** Benchmark target line value (e.g. SLA target 80) */
    target?: number | undefined;
    /** Target label (default: 'Target') */
    targetLabel?: string | undefined;
    /** Number of tick marks or custom tick values */
    ticks?: number | number[] | undefined;
    /** Whether to show tick marks (default: true) */
    showTicks?: boolean | undefined;
    /** Whether to show min/max tick labels (default: true) */
    showTickLabels?: boolean | undefined;
    /** Gauge size preset ('sm' | 'md' | 'lg') or numeric width (default: 'md' / 220) */
    size?: 'sm' | 'md' | 'lg' | number | undefined;
    /** Stroke thickness for the gauge arc track (default: 14) */
    thickness?: number | undefined;
    /** Custom stroke width for the gauge arc track (alias for thickness) */
    strokeWidth?: number | undefined;
    /** Custom value formatter (legacy alias for formatter) */
    format?: ((val: number) => string) | undefined;
    /** Custom value formatter */
    formatter?: ((val: number) => string) | undefined;
    /** Explicit stroke color override */
    color?: string | undefined;
    /** Whether to display current status badge below value (default: true) */
    showBadge?: boolean | undefined;
    /** Additional CSS classes for the outer container */
    class?: string | undefined;
    /** Optional bottom actions or extra details slot */
    footer?: Snippet | undefined;
  }

  let {
    value,
    min = 0,
    max = 100,
    unit = '',
    label,
    subtext,
    type = 'half',
    mode = 'progress',
    thresholds = [
      { value: 60, tone: 'success', label: 'Normal' },
      { value: 85, tone: 'warning', label: 'Warning' },
      { value: 100, tone: 'destructive', label: 'Critical' },
    ],
    target,
    targetLabel = 'Target',
    ticks = 5,
    showTicks = true,
    showTickLabels = true,
    size = 'md',
    thickness = 14,
    strokeWidth,
    format,
    formatter,
    color,
    showBadge = true,
    class: className = '',
    footer,
  }: GaugeChartProps = $props();

  const effectiveThickness = $derived(strokeWidth ?? thickness ?? 14);

  // Helper mappings for semantic design tokens without bare hex or bare palette utilities
  const TONE_MAP: Record<
    GaugeTone,
    { stroke: string; text: string; bg: string; badge: string }
  > = {
    primary: {
      stroke: 'var(--primary)',
      text: 'text-primary',
      bg: 'bg-primary',
      badge: 'bg-primary/10 text-primary border-primary/20',
    },
    success: {
      stroke: 'var(--success, var(--primary))',
      text: 'text-success',
      bg: 'bg-success',
      badge: 'bg-success/15 text-success border-success/20',
    },
    warning: {
      stroke: 'var(--warning, var(--primary))',
      text: 'text-warning',
      bg: 'bg-warning',
      badge: 'bg-warning/15 text-warning border-warning/20',
    },
    destructive: {
      stroke: 'var(--destructive)',
      text: 'text-destructive',
      bg: 'bg-destructive',
      badge: 'bg-destructive/15 text-destructive border-destructive/20',
    },
    info: {
      stroke: 'var(--info, var(--primary))',
      text: 'text-info',
      bg: 'bg-info',
      badge: 'bg-info/15 text-info border-info/20',
    },
    muted: {
      stroke: 'var(--muted-foreground)',
      text: 'text-muted-foreground',
      bg: 'bg-muted',
      badge: 'bg-muted text-muted-foreground border-border',
    },
  };

  // Dimensions & geometry
  const widthPx = $derived.by(() => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'sm':
        return 180;
      case 'lg':
        return 300;
      case 'md':
      default:
        return 220;
    }
  });

  const cx = $derived(widthPx / 2);
  const radius = $derived(widthPx / 2 - effectiveThickness / 2 - 8);

  const geometry = $derived.by(() => {
    switch (type) {
      case 'arc':
        return {
          startAngle: 150,
          endAngle: 390,
          spanAngle: 240,
          cy: widthPx / 2 - 4,
          viewBox: `0 0 ${widthPx} ${Math.round(widthPx * 0.88)}`,
        };
      case 'circle':
        return {
          startAngle: 135,
          endAngle: 405,
          spanAngle: 270,
          cy: widthPx / 2 - 4,
          viewBox: `0 0 ${widthPx} ${Math.round(widthPx * 0.92)}`,
        };
      case 'half':
      default:
        return {
          startAngle: 180,
          endAngle: 360,
          spanAngle: 180,
          cy: radius + effectiveThickness / 2 + 10,
          viewBox: `0 0 ${widthPx} ${Math.round(radius + effectiveThickness + 24)}`,
        };
    }
  });

  const range = $derived(max > min ? max - min : 1);
  const clampedValue = $derived(Math.min(max, Math.max(min, value)));
  const ratio = $derived((clampedValue - min) / range);
  const percent100 = $derived(Math.round(ratio * 100));
  const currentAngle = $derived(geometry.startAngle + ratio * geometry.spanAngle);

  // Active tone determined by threshold matching
  const activeThreshold = $derived.by(() => {
    const sorted = [...thresholds].sort((a, b) => a.value - b.value);
    for (const t of sorted) {
      if (clampedValue <= t.value) {
        return t;
      }
    }
    return sorted[sorted.length - 1] ?? { value: max, tone: 'primary' as GaugeTone };
  });

  const activeTone = $derived<GaugeTone>(activeThreshold.tone ?? 'primary');
  const activeTokenInfo = $derived(TONE_MAP[activeTone] ?? TONE_MAP.primary);
  const activeColor = $derived(color ?? activeThreshold.color ?? activeTokenInfo.stroke);

  // SVG trigonometry helpers
  function polarToCartesian(centerX: number, centerY: number, r: number, angleDegrees: number) {
    const rad = (angleDegrees * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(rad),
      y: centerY + r * Math.sin(rad),
    };
  }

  function describeArc(
    centerX: number,
    centerY: number,
    r: number,
    startDeg: number,
    endDeg: number,
  ) {
    if (Math.abs(endDeg - startDeg) < 0.1) return '';
    const start = polarToCartesian(centerX, centerY, r, startDeg);
    const end = polarToCartesian(centerX, centerY, r, endDeg);
    const diff = endDeg - startDeg;
    const largeArcFlag = diff > 180 ? 1 : 0;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  // Track arc path from startAngle to endAngle
  const fullTrackPath = $derived(
    describeArc(cx, geometry.cy, radius, geometry.startAngle, geometry.endAngle),
  );

  // Format resolver
  const displayFormatter = $derived.by(() => {
    if (format) return format;
    if (formatter) return formatter;
    return (val: number) => (Number.isInteger(val) ? `${val}` : val.toFixed(1));
  });

  // Ticks list
  const computedTicks = $derived.by(() => {
    if (!showTicks) return [];
    if (Array.isArray(ticks)) {
      return ticks.map((val) => {
        const valRatio = (Math.max(min, Math.min(max, val)) - min) / range;
        const deg = geometry.startAngle + valRatio * geometry.spanAngle;
        const p1 = polarToCartesian(cx, geometry.cy, radius - effectiveThickness / 2 - 2, deg);
        const p2 = polarToCartesian(cx, geometry.cy, radius - effectiveThickness / 2 - 6, deg);
        return { val, deg, p1, p2 };
      });
    }

    const count = Math.max(2, ticks);
    const result: Array<{
      val: number;
      deg: number;
      p1: { x: number; y: number };
      p2: { x: number; y: number };
    }> = [];
    for (let i = 0; i <= count; i++) {
      const valRatio = i / count;
      const deg = geometry.startAngle + valRatio * geometry.spanAngle;
      const val = Math.round(min + valRatio * range);
      const isMajor = i === 0 || i === count || i === Math.floor(count / 2);
      const tickLen = isMajor ? 7 : 4;
      const p1 = polarToCartesian(cx, geometry.cy, radius - effectiveThickness / 2 - 2, deg);
      const p2 = polarToCartesian(cx, geometry.cy, radius - effectiveThickness / 2 - 2 - tickLen, deg);
      result.push({ val, deg, p1, p2 });
    }
    return result;
  });

  // Target benchmark line
  const targetMark = $derived.by(() => {
    if (target === undefined || target < min || target > max) return null;
    const targetRatio = (target - min) / range;
    const deg = geometry.startAngle + targetRatio * geometry.spanAngle;
    const p1 = polarToCartesian(cx, geometry.cy, radius - effectiveThickness / 2 - 3, deg);
    const p2 = polarToCartesian(cx, geometry.cy, radius + effectiveThickness / 2 + 3, deg);
    return { target, deg, p1, p2 };
  });

  // Min / Max point coordinates for labels
  const minPos = $derived(polarToCartesian(cx, geometry.cy, radius - 16, geometry.startAngle + 8));
  const maxPos = $derived(polarToCartesian(cx, geometry.cy, radius - 16, geometry.endAngle - 8));
</script>

<div
  role="meter"
  aria-valuenow={value}
  aria-valuemin={min}
  aria-valuemax={max}
  aria-label={label ?? `${displayFormatter(value)}${unit}`}
  data-svadmin-component="GaugeChart"
  data-tone={activeTone}
  data-gauge-type={type}
  class={cn(
    'relative flex flex-col items-center justify-between rounded-md border border-border bg-card p-4 text-card-foreground shadow-sm transition-all',
    className,
  )}
  style="width: {widthPx}px;"
>
  {#if label || target !== undefined}
    <div class="mb-2 w-full flex items-center justify-between px-1">
      <span class="text-sm font-semibold tracking-tight text-foreground truncate">
        {label ?? ''}
      </span>
      {#if target !== undefined}
        <span class="text-[11px] font-medium text-muted-foreground font-mono">
          {targetLabel}: {target}{unit}
        </span>
      {/if}
    </div>
  {/if}

  <div class="relative flex w-full items-center justify-center overflow-hidden">
    <svg
      role="img"
      aria-label={label ?? `${displayFormatter(value)}`}
      viewBox={geometry.viewBox}
      class="w-full h-auto max-w-full select-none"
    >
      <!-- Base track arc -->
      <path
        d={fullTrackPath}
        fill="none"
        stroke="var(--muted)"
        stroke-width={effectiveThickness}
        stroke-linecap="round"
        pathLength="100"
      />

      <!-- Active progress arc -->
      <path
        d={fullTrackPath}
        fill="none"
        stroke={activeColor}
        stroke-width={effectiveThickness}
        stroke-linecap="round"
        pathLength="100"
        stroke-dasharray="{percent100} 100"
        class="transition-all duration-500"
      />

      <!-- Tick marks -->
      {#if showTicks}
        {#each computedTicks as tick, i (i)}
          <line
            x1={tick.p1.x}
            y1={tick.p1.y}
            x2={tick.p2.x}
            y2={tick.p2.y}
            stroke="currentColor"
            class="text-muted-foreground/40"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        {/each}
      {/if}

      <!-- Target benchmark line -->
      {#if targetMark}
        <line
          x1={targetMark.p1.x}
          y1={targetMark.p1.y}
          x2={targetMark.p2.x}
          y2={targetMark.p2.y}
          stroke="currentColor"
          class="text-foreground"
          stroke-width="2.5"
          stroke-dasharray="2 2"
        />
      {/if}

      <!-- Needle pointer indicator -->
      {#if mode === 'needle' || mode === 'both'}
        <g
          transform="rotate({currentAngle}, {cx}, {geometry.cy})"
          class="transition-transform duration-500 ease-out origin-[{cx}px_{geometry.cy}px]"
        >
          <polygon
            points="{cx - 8},{geometry.cy - 3} {cx + radius - 12},{geometry.cy} {cx - 8},{geometry.cy + 3}"
            fill={activeColor}
            class="drop-shadow-sm"
          />
          <circle
            cx={cx}
            cy={geometry.cy}
            r="5.5"
            fill="currentColor"
            class="text-background"
            stroke={activeColor}
            stroke-width="2"
          />
        </g>
      {/if}

      <!-- Min and Max scale labels -->
      {#if showTickLabels}
        <text
          x={minPos.x}
          y={minPos.y}
          text-anchor="middle"
          class="fill-muted-foreground text-[10px] font-mono select-none"
        >
          {min}
        </text>
        <text
          x={maxPos.x}
          y={maxPos.y}
          text-anchor="middle"
          class="fill-muted-foreground text-[10px] font-mono select-none"
        >
          {max}
        </text>
      {/if}
    </svg>

    <!-- Center reading readout -->
    <div
      class={cn(
        'pointer-events-none absolute flex flex-col items-center justify-center text-center',
        type === 'half' ? 'bottom-2' : 'bottom-5',
      )}
    >
      <div class="flex items-baseline gap-1">
        <span class="font-mono text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {displayFormatter(clampedValue)}
        </span>
        {#if unit}
          <span class="text-xs font-medium text-muted-foreground">{unit}</span>
        {/if}
      </div>

      {#if showBadge && activeThreshold.label}
        <span
          data-slot="badge"
          data-tone={activeTone}
          class={cn(
            'mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none transition-colors',
            activeTokenInfo.badge,
          )}
        >
          {activeThreshold.label}
        </span>
      {/if}
    </div>
  </div>

  {#if subtext}
    <p class="mt-2 text-center text-xs text-muted-foreground">
      {subtext}
    </p>
  {/if}

  {#if footer}
    <div class="mt-3 w-full border-t border-border pt-2 text-xs">
      {@render footer()}
    </div>
  {/if}
</div>
