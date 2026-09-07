<script module lang="ts">
  export type CurrencyTone = 'auto' | 'success' | 'warning' | 'destructive' | 'neutral';
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    value?: number | string | null | undefined;
    currency?: string;
    locale?: string;
    precision?: number;
    compact?: boolean;
    symbol?: string;
    colored?: boolean;
    tone?: CurrencyTone;
    nullLabel?: string;
    tabular?: boolean;
    class?: string;
  }

  let {
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

  const toneClasses: Record<CurrencyTone, string> = {
    auto: '',
    success: 'svadmin-u-76747e5e02ff svadmin-u-2689f3958069',
    warning: 'svadmin-u-3a4ff758c2ab svadmin-u-2689f3958069',
    destructive: 'svadmin-u-811148b13d1e svadmin-u-2689f3958069',
    neutral: 'text-foreground',
  };
</script>

{#if numericValue === null}
  <span class={cn('field-currency svadmin-u-bfa603190748 svadmin-u-fc7473ca09eb', className)}>{nullLabel}</span>
{:else}
  <span
    class={cn(
      'field-currency svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-fc7473ca09eb',
      tabular && 'svadmin-u-0e65706bcccd svadmin-u-3032cae0badb',
      toneClasses[resolvedTone],
      className
    )}
  >
    {formatted}
  </span>
{/if}
