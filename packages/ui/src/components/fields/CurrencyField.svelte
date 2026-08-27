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

  const numericValue = $derived.by(() => {
    if (value == null || value === '') return null;
    const num = typeof value === 'number' ? value : Number(value);
    return isNaN(num) ? null : num;
  });

  const formatted = $derived.by(() => {
    if (numericValue === null) return nullLabel;

    const opts: Intl.NumberFormatOptions = {
      style: symbol ? 'decimal' : 'currency',
      currency: symbol ? undefined : currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
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
    success: 'text-success font-medium',
    warning: 'text-warning-foreground font-medium',
    destructive: 'text-destructive font-medium',
    neutral: 'text-foreground',
  };
</script>

{#if numericValue === null}
  <span class={cn('field-currency text-muted-foreground text-sm', className)}>{nullLabel}</span>
{:else}
  <span
    class={cn(
      'field-currency inline-flex items-center text-sm',
      tabular && 'font-mono tabular-nums',
      toneClasses[resolvedTone],
      className
    )}
  >
    {formatted}
  </span>
{/if}
