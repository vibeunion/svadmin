<script module lang="ts">
  export type PercentTone = 'auto' | 'success' | 'warning' | 'destructive' | 'info' | 'neutral';
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    value?: number | string | null | undefined;
    precision?: number;
    scale?: '100' | '1';
    showProgress?: boolean;
    tone?: PercentTone;
    nullLabel?: string;
    class?: string;
  }

  let {
    value,
    precision = 1,
    scale = '100',
    showProgress = false,
    tone = 'neutral',
    nullLabel = '—',
    class: className = '',
  }: Props = $props();

  const normalizedPrecision = $derived(
    Math.min(20, Math.max(0, Math.trunc(Number.isFinite(precision) ? precision : 1)))
  );

  const numericValue = $derived.by(() => {
    if (value == null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

  const percentNumber = $derived.by(() => {
    if (numericValue === null) return null;
    const scaled = scale === '1' ? numericValue * 100 : numericValue;
    return Number.isFinite(scaled) ? scaled : null;
  });

  const formatted = $derived(
    percentNumber === null ? nullLabel : `${percentNumber.toFixed(normalizedPrecision)}%`
  );

  const resolvedTone = $derived.by((): PercentTone => {
    if (tone !== 'auto') return tone;
    if (percentNumber === null) return 'neutral';
    if (percentNumber >= 80) return 'success';
    if (percentNumber >= 50) return 'warning';
    return 'destructive';
  });

  const toneTextClass: Record<PercentTone, string> = {
    auto: '',
    success: 'text-success font-medium',
    warning: 'text-warning-foreground font-medium',
    destructive: 'text-destructive font-medium',
    info: 'text-primary font-medium',
    neutral: 'text-foreground',
  };

  const toneBarClass: Record<PercentTone, string> = {
    auto: '',
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
    info: 'bg-primary',
    neutral: 'bg-primary',
  };

  const clampedProgress = $derived(
    percentNumber === null ? 0 : Math.min(100, Math.max(0, percentNumber))
  );
</script>

{#if percentNumber === null}
  <span class={cn('field-percent text-muted-foreground text-sm', className)}>{nullLabel}</span>
{:else}
  <div class={cn('field-percent inline-flex items-center gap-2 text-sm', className)}>
    <span class={cn('tabular-nums', toneTextClass[resolvedTone])}>
      {formatted}
    </span>
    {#if showProgress}
      <div
        class="h-1.5 w-16 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Percentage"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={clampedProgress}
      >
        <div
          class={cn('h-full transition-all duration-300', toneBarClass[resolvedTone])}
          style="width: {clampedProgress}%"
        ></div>
      </div>
    {/if}
  </div>
{/if}
