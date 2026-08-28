<script module lang="ts">
  export type LitePercentTone = 'auto' | 'success' | 'warning' | 'destructive' | 'info' | 'neutral';
</script>

<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field?: FieldDefinition;
    value?: number | string | null;
    precision?: number;
    scale?: '100' | '1';
    showProgress?: boolean;
    tone?: LitePercentTone;
    nullLabel?: string;
    class?: string;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    precision = 1,
    scale = '100',
    showProgress = false,
    tone = 'neutral',
    nullLabel = '—',
    class: className = '',
    error = [],
    mode = 'show',
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

  const resolvedTone = $derived.by((): LitePercentTone => {
    if (tone !== 'auto') return tone;
    if (percentNumber === null) return 'neutral';
    if (percentNumber >= 80) return 'success';
    if (percentNumber >= 50) return 'warning';
    return 'destructive';
  });

  const toneTextClassMap: Record<LitePercentTone, string> = {
    auto: '',
    success: 'lite-text-success',
    warning: 'lite-text-warning',
    destructive: 'lite-text-danger',
    info: 'lite-text-info',
    neutral: '',
  };

  const toneProgressClassMap: Record<LitePercentTone, string> = {
    auto: '',
    success: 'lite-progress-success',
    warning: 'lite-progress-warning',
    destructive: 'lite-progress-danger',
    info: 'lite-progress-info',
    neutral: '',
  };

  const clampedProgress = $derived(
    percentNumber === null ? 0 : Math.min(100, Math.max(0, percentNumber))
  );

  const hasError = $derived(error.length > 0);
</script>

{#if mode === 'show'}
  {#if percentNumber === null}
    <span class="lite-text-muted lite-text-sm {className}">{nullLabel}</span>
  {:else}
    <span class="lite-percent-container {className}">
      <span class="lite-font-mono {toneTextClassMap[resolvedTone]}">
        {formatted}
      </span>
      {#if showProgress}
        <span class="lite-progress-track">
          <span
            class="lite-progress-fill {toneProgressClassMap[resolvedTone]}"
            style="width: {clampedProgress}%;"
          ></span>
        </span>
      {/if}
    </span>
  {/if}
{:else}
  <div>
    <input
      type="number"
      step="any"
      name={field?.key ?? 'percent'}
      id={field?.key ?? 'percent'}
      value={percentNumber ?? ''}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder={field?.label ?? '0.0%'}
      {...field?.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
