<script lang="ts">
  import { cn } from "../../../utils.js";

  type ProgressStatus = 'normal' | 'success' | 'warning' | 'danger';

  let {
    value = 0,
    max = 100,
    variant = 'line',
    indeterminate = false,
    status = 'normal',
    size = 96,
    strokeWidth = 8,
    showInfo = false,
    format,
    class: className,
    ...restProps
  }: {
    value?: number;
    max?: number;
    variant?: 'line' | 'circle';
    indeterminate?: boolean;
    status?: ProgressStatus;
    size?: number;
    strokeWidth?: number;
    showInfo?: boolean;
    format?: (percentage: number) => string;
    class?: string;
  } & Record<string, unknown> = $props();

  const percentage = $derived(Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0)));
  const radius = $derived(Math.max(0, (size - strokeWidth) / 2));
  const circumference = $derived(2 * Math.PI * radius);
  const dashOffset = $derived(circumference * (1 - percentage / 100));
  const info = $derived(format ? format(percentage) : `${Math.round(percentage)}%`);
</script>

{#if variant === 'circle'}
  <div
    class={cn('svadmin-progress svadmin-progress--circle', className)}
    data-status={status}
    data-indeterminate={indeterminate ? 'true' : undefined}
    role="progressbar"
    aria-valuenow={indeterminate ? undefined : value}
    aria-valuemin={0}
    aria-valuemax={max}
    style:--svadmin-progress-size={`${size}px`}
    style:--svadmin-progress-stroke={`${strokeWidth}px`}
    {...restProps}
  >
    <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle class="svadmin-progress__track" cx={size / 2} cy={size / 2} r={radius} />
      <circle
        class="svadmin-progress__indicator"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        style:stroke-dasharray={`${circumference} ${circumference}`}
        style:stroke-dashoffset={indeterminate ? circumference * 0.7 : dashOffset}
      />
    </svg>
    {#if showInfo}<span class="svadmin-progress__info">{indeterminate ? '…' : info}</span>{/if}
  </div>
{:else}
  <div
    class={cn('svadmin-progress', className)}
    data-status={status}
    data-indeterminate={indeterminate ? 'true' : undefined}
    role="progressbar"
    aria-valuenow={indeterminate ? undefined : value}
    aria-valuemin={0}
    aria-valuemax={max}
    {...restProps}
  >
    <div class="svadmin-progress-value" style:transform={indeterminate ? undefined : `translateX(-${100 - percentage}%)`}></div>
    {#if showInfo}<span class="svadmin-progress__info">{indeterminate ? '…' : info}</span>{/if}
  </div>
{/if}

<style>
  .svadmin-progress {
    position: relative;
    width: 100%;
    height: 0.5rem;
    overflow: hidden;
    border-radius: 999px;
    background: var(--muted);
  }
  .svadmin-progress-value {
    width: 100%;
    height: 100%;
    border-radius: inherit;
    background: var(--primary);
    transition: transform 160ms ease;
  }
  .svadmin-progress[data-status='success'] .svadmin-progress-value { background: var(--success); }
  .svadmin-progress[data-status='warning'] .svadmin-progress-value { background: var(--warning); }
  .svadmin-progress[data-status='danger'] .svadmin-progress-value { background: var(--destructive); }
  .svadmin-progress[data-indeterminate='true'] .svadmin-progress-value {
    width: 40%;
    animation: svadmin-progress-indeterminate 1.25s ease-in-out infinite;
  }
  .svadmin-progress--circle {
    display: inline-grid;
    place-items: center;
    width: var(--svadmin-progress-size);
    height: var(--svadmin-progress-size);
    flex: 0 0 auto;
    overflow: visible;
    background: transparent;
  }
  .svadmin-progress--circle svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .svadmin-progress__track,
  .svadmin-progress__indicator {
    fill: none;
    stroke-width: var(--svadmin-progress-stroke);
  }
  .svadmin-progress__track { stroke: var(--muted); }
  .svadmin-progress__indicator {
    stroke: var(--primary);
    stroke-linecap: round;
    transition: stroke-dashoffset 160ms ease;
  }
  .svadmin-progress--circle[data-status='success'] .svadmin-progress__indicator { stroke: var(--success); }
  .svadmin-progress--circle[data-status='warning'] .svadmin-progress__indicator { stroke: var(--warning); }
  .svadmin-progress--circle[data-status='danger'] .svadmin-progress__indicator { stroke: var(--destructive); }
  .svadmin-progress--circle[data-indeterminate='true'] svg { animation: svadmin-progress-spin 1.1s linear infinite; }
  .svadmin-progress__info {
    position: relative;
    color: var(--foreground);
    font-size: var(--svadmin-text-caption);
    font-variant-numeric: tabular-nums;
  }
  .svadmin-progress--circle .svadmin-progress__info { position: absolute; }
  @keyframes svadmin-progress-indeterminate {
    0% { transform: translateX(-110%); }
    100% { transform: translateX(260%); }
  }
  @keyframes svadmin-progress-spin { to { transform: rotate(270deg); } }
  @media (prefers-reduced-motion: reduce) {
    .svadmin-progress-value,
    .svadmin-progress__indicator,
    .svadmin-progress--circle svg { animation: none; transition: none; }
  }
</style>
