<script module lang="ts">
  export type LiteCurrencyTone = 'auto' | 'success' | 'warning' | 'destructive' | 'neutral';
</script>

<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field?: FieldDefinition;
    value?: number | string | null;
    currency?: string;
    locale?: string;
    precision?: number;
    compact?: boolean;
    symbol?: string;
    colored?: boolean;
    tone?: LiteCurrencyTone;
    nullLabel?: string;
    tabular?: boolean;
    class?: string;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    currency = 'USD',
    locale = 'en-US',
    precision = 2,
    compact = false,
    symbol,
    colored = false,
    tone = 'neutral',
    nullLabel = '—',
    tabular = true,
    class: className = '',
    error = [],
    mode = 'show',
  }: Props = $props();

  const normalizedPrecision = $derived(
    Number.isFinite(precision) ? Math.min(20, Math.max(0, Math.trunc(precision))) : 2
  );

  const numericValue = $derived.by(() => {
    if (value == null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
  });

  const formatted = $derived.by(() => {
    if (numericValue === null) return nullLabel;

    const opts: Intl.NumberFormatOptions = {
      style: symbol ? 'decimal' : 'currency',
      currency: symbol ? undefined : currency,
      minimumFractionDigits: normalizedPrecision,
      maximumFractionDigits: normalizedPrecision,
    };

    if (compact) {
      opts.notation = 'compact';
      opts.compactDisplay = 'short';
    }

    try {
      let res = new Intl.NumberFormat(locale, opts).format(numericValue);
      if (symbol) {
        res = `${symbol}${res}`;
      }
      return res;
    } catch {
      return String(numericValue);
    }
  });

  const resolvedTone = $derived.by(() => {
    if (tone !== 'auto' && tone !== 'neutral') return tone;
    if ((!colored && tone !== 'auto') || numericValue === null) return 'neutral';
    if (numericValue > 0) return 'success';
    if (numericValue < 0) return 'destructive';
    return 'neutral';
  });

  const toneClassMap: Record<LiteCurrencyTone, string> = {
    auto: '',
    success: 'lite-text-success',
    warning: 'lite-text-warning',
    destructive: 'lite-text-danger',
    neutral: '',
  };

  const hasError = $derived(error.length > 0);
</script>

{#if mode === 'show'}
  {#if numericValue === null}
    <span class="lite-text-muted lite-text-sm {className}">{nullLabel}</span>
  {:else}
    <span
      class="lite-currency-field {tabular ? 'lite-font-mono' : ''} {toneClassMap[resolvedTone]} {className}"
    >
      {formatted}
    </span>
  {/if}
{:else}
  <div>
    <input
      type="number"
      step="any"
      name={field?.key ?? 'currency_amount'}
      id={field?.key ?? 'currency_amount'}
      value={numericValue ?? ''}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder={field?.label ?? '0.00'}
      {...field?.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
