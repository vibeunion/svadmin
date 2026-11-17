<script lang="ts">
  import { Check, X } from "@lucide/svelte";
  import { cn } from "../../../utils.js";

  type ProgressStatus = 'normal' | 'success' | 'warning' | 'danger';
  type ProgressSize = 'mini' | 'small' | 'default' | 'large' | number;

  let {
    value = 0,
    percent,
    max = 100,
    variant = 'line',
    type: typeProp,
    indeterminate = false,
    status = 'normal',
    size = 'default',
    strokeWidth,
    showInfo = false,
    showText,
    steps,
    format,
    color,
    trackColor,
    width,
    class: className,
    ...restProps
  }: {
    value?: number;
    percent?: number;
    max?: number;
    variant?: 'line' | 'circle';
    type?: 'line' | 'circle';
    indeterminate?: boolean;
    status?: ProgressStatus;
    size?: ProgressSize;
    strokeWidth?: number;
    showInfo?: boolean;
    showText?: boolean;
    steps?: number;
    format?: (percentage: number) => string;
    color?: string;
    trackColor?: string;
    width?: number | string;
    class?: string;
  } & Record<string, unknown> = $props();

  const resolvedValue = $derived(percent !== undefined ? percent : value);
  const resolvedVariant = $derived(typeProp ?? variant);
  const resolvedShowInfo = $derived(showText ?? showInfo);

  const numericCircleSize = $derived.by(() => {
    if (typeof width === 'number') return width;
    if (typeof size === 'number') return size;
    if (size === 'mini') return 48;
    if (size === 'small') return 64;
    if (size === 'large') return 128;
    return 96;
  });

  const resolvedStrokeWidth = $derived.by(() => {
    if (strokeWidth !== undefined) return strokeWidth;
    if (resolvedVariant === 'circle') {
      if (size === 'mini') return 3;
      if (size === 'small') return 4;
      if (size === 'large') return 6;
      return 4;
    }
    if (size === 'mini') return 2;
    if (size === 'small') return 3;
    if (size === 'large') return 8;
    return 4;
  });

  const percentage = $derived(Math.min(100, Math.max(0, max > 0 ? (resolvedValue / max) * 100 : 0)));
  const radius = $derived(Math.max(0, (numericCircleSize - resolvedStrokeWidth) / 2));
  const circumference = $derived(2 * Math.PI * radius);
  const dashOffset = $derived(circumference * (1 - percentage / 100));
  const info = $derived(format ? format(percentage) : `${Math.round(percentage)}%`);

  const totalSteps = $derived(Number.isSafeInteger(steps) && (steps as number) > 0 ? (steps as number) : 0);
  const activeSteps = $derived(totalSteps > 0 ? Math.round((percentage / 100) * totalSteps) : 0);
</script>

{#if totalSteps > 0 && resolvedVariant === 'line'}
  <div
    class={cn('svadmin-progress-steps-wrapper', resolvedShowInfo && 'svadmin-progress--with-info', className)}
    data-status={status}
    role="progressbar"
    aria-valuenow={resolvedValue}
    aria-valuemin={0}
    aria-valuemax={max}
    style:width={typeof width === 'number' ? `${width}px` : (width ?? undefined)}
    {...restProps}
  >
    <div class="svadmin-progress-steps" style:--svadmin-progress-height={`${resolvedStrokeWidth}px`}>
      {#each Array(totalSteps) as _, i (i)}
        <div
          class={cn(
            'svadmin-progress-step-item',
            i < activeSteps ? 'svadmin-progress-step-item--active' : 'svadmin-progress-step-item--inactive'
          )}
          style:background-color={i < activeSteps ? (color ?? undefined) : (trackColor ?? undefined)}
        ></div>
      {/each}
    </div>
    {#if resolvedShowInfo}
      <span class="svadmin-progress__info flex items-center justify-end">
        {#if status === "success"}<Check class="size-3.5 text-success" aria-hidden="true" />{:else if status === "danger"}<X class="size-3.5 text-destructive" aria-hidden="true" />{:else}{info}{/if}
      </span>
    {/if}
  </div>
{:else if resolvedVariant === 'circle'}
  <div
    class={cn('svadmin-progress svadmin-progress--circle', className)}
    data-status={status}
    data-indeterminate={indeterminate ? 'true' : undefined}
    role="progressbar"
    aria-valuenow={indeterminate ? undefined : resolvedValue}
    aria-valuemin={0}
    aria-valuemax={max}
    style:--svadmin-progress-size={`${numericCircleSize}px`}
    style:--svadmin-progress-stroke={`${resolvedStrokeWidth}px`}
    style:width={typeof width === 'number' ? `${width}px` : (width ?? undefined)}
    {...restProps}
  >
    <svg viewBox={`0 0 ${numericCircleSize} ${numericCircleSize}`} aria-hidden="true">
      <circle class="svadmin-progress__track" cx={numericCircleSize / 2} cy={numericCircleSize / 2} r={radius} style:stroke={trackColor ?? undefined} />
      <circle
        class="svadmin-progress__indicator"
        cx={numericCircleSize / 2}
        cy={numericCircleSize / 2}
        r={radius}
        style:stroke-dasharray={`${circumference} ${circumference}`}
        style:stroke-dashoffset={indeterminate ? circumference * 0.7 : dashOffset}
        style:stroke={color ?? undefined}
      />
    </svg>
    {#if resolvedShowInfo}<span class="svadmin-progress__info flex items-center justify-center">{#if indeterminate}…{:else if status === "success"}<Check class="size-4 text-success" aria-hidden="true" />{:else if status === "danger"}<X class="size-4 text-destructive" aria-hidden="true" />{:else}{info}{/if}</span>{/if}
  </div>
{:else}
  <div
    class={cn('svadmin-progress', resolvedShowInfo && 'svadmin-progress--with-info', className)}
    data-status={status}
    data-indeterminate={indeterminate ? 'true' : undefined}
    role="progressbar"
    aria-valuenow={indeterminate ? undefined : resolvedValue}
    aria-valuemin={0}
    aria-valuemax={max}
    style:--svadmin-progress-height={`${resolvedStrokeWidth}px`}
    style:width={typeof width === 'number' ? `${width}px` : (width ?? undefined)}
    {...restProps}
  >
    {#if resolvedShowInfo}
      <div class="svadmin-progress__line-track" style:background-color={trackColor ?? undefined}>
        <div class="svadmin-progress-value" style:background-color={color ?? undefined} style:transform={indeterminate ? undefined : `translateX(-${100 - percentage}%)`}></div>
      </div>
      <span class="svadmin-progress__info flex items-center justify-end">{#if indeterminate}…{:else if status === "success"}<Check class="size-3.5 text-success" aria-hidden="true" />{:else if status === "danger"}<X class="size-3.5 text-destructive" aria-hidden="true" />{:else}{info}{/if}</span>
    {:else}
      <div class="svadmin-progress-value" style:background-color={color ?? undefined} style:transform={indeterminate ? undefined : `translateX(-${100 - percentage}%)`}></div>
    {/if}
  </div>
{/if}

<style>
  .svadmin-progress {
    position: relative;
    width: 100%;
    height: var(--svadmin-progress-height, 4px);
    overflow: hidden;
    border-radius: 999px;
    background: var(--svadmin-fill-3, var(--border));
  }
  .svadmin-progress-steps-wrapper {
    width: 100%;
  }
  .svadmin-progress-steps {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    height: var(--svadmin-progress-height, 4px);
  }
  .svadmin-progress-step-item {
    flex: 1;
    height: 100%;
    border-radius: 999px;
    background: var(--svadmin-fill-3, var(--border));
    transition: background-color var(--svadmin-motion-fast) var(--svadmin-motion-easing);
  }
  .svadmin-progress-step-item--active {
    background: var(--primary);
  }
  .svadmin-progress-steps-wrapper[data-status='success'] .svadmin-progress-step-item--active { background: var(--success); }
  .svadmin-progress-steps-wrapper[data-status='warning'] .svadmin-progress-step-item--active { background: var(--warning); }
  .svadmin-progress-steps-wrapper[data-status='danger'] .svadmin-progress-step-item--active { background: var(--destructive); }
  .svadmin-progress-value {
    width: 100%;
    height: 100%;
    border-radius: inherit;
    background: var(--primary);
    transition: transform 0.6s var(--svadmin-easing-standard, cubic-bezier(0.34, 0.69, 0.1, 1));
  }
  .svadmin-progress--with-info {
    display: flex;
    align-items: center;
    gap: 16px;
    height: auto;
    overflow: visible;
    background: transparent;
  }
  .svadmin-progress__line-track {
    flex: 1;
    min-width: 0;
    height: var(--svadmin-progress-height, 4px);
    overflow: hidden;
    border-radius: inherit;
    background: var(--svadmin-fill-3, var(--border));
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
  .svadmin-progress__track { stroke: var(--svadmin-fill-3, var(--border)); }
  .svadmin-progress__indicator {
    stroke: var(--primary);
    stroke-linecap: round;
    transition: stroke-dashoffset 0.6s var(--svadmin-easing-standard, cubic-bezier(0.34, 0.69, 0.1, 1));
  }
  .svadmin-progress--circle[data-status='success'] .svadmin-progress__indicator { stroke: var(--success); }
  .svadmin-progress--circle[data-status='warning'] .svadmin-progress__indicator { stroke: var(--warning); }
  .svadmin-progress--circle[data-status='danger'] .svadmin-progress__indicator { stroke: var(--destructive); }
  .svadmin-progress--circle[data-indeterminate='true'] svg { animation: svadmin-progress-spin 1.1s linear infinite; }
  .svadmin-progress__info {
    position: relative;
    min-width: 32px;
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-caption);
    font-variant-numeric: tabular-nums;
    text-align: end;
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
