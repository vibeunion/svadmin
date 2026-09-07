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
    success: 'svadmin-u-76747e5e02ff svadmin-u-2689f3958069',
    warning: 'svadmin-u-3a4ff758c2ab svadmin-u-2689f3958069',
    destructive: 'svadmin-u-811148b13d1e svadmin-u-2689f3958069',
    info: 'svadmin-u-20aaf08a7ed1 svadmin-u-2689f3958069',
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
  <span class={cn('field-percent svadmin-u-bfa603190748 svadmin-u-fc7473ca09eb', className)}>{nullLabel}</span>
{:else}
  <div class={cn('field-percent svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-fc7473ca09eb', className)}>
    <span class={cn('svadmin-u-3032cae0badb', toneTextClass[resolvedTone])}>
      {formatted}
    </span>
    {#if showProgress}
      <div
        class="svadmin-u-095acb275581 svadmin-u-baceed3462fd svadmin-u-2cd02d11d1af svadmin-u-ac204c108886 svadmin-u-2ef11f1cb219"
        role="progressbar"
        aria-label="Percentage"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={clampedProgress}
      >
        <div
          class={cn('svadmin-u-668b21aa5409 svadmin-u-0fe7d7d814d0 svadmin-u-7890552ecd63', toneBarClass[resolvedTone])}
          style="width: {clampedProgress}%"
        ></div>
      </div>
    {/if}
  </div>
{/if}
