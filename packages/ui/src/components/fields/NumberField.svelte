<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    value: number | string | null | undefined;
    locale?: string;
    currency?: string;
    unit?: string;
    prefix?: string;
    precision?: number;
    compact?: boolean;
    signed?: boolean;
    tabular?: boolean;
    options?: Intl.NumberFormatOptions;
    nullLabel?: string;
    class?: string;
  }

  let {
    value,
    locale = 'en-US',
    currency,
    unit,
    prefix,
    precision,
    compact = false,
    signed = false,
    tabular = true,
    options = {},
    nullLabel = '—',
    class: className = '',
  }: Props = $props();

  const formatted = $derived.by(() => {
    if (value == null || value === '') return nullLabel;
    const num = Number(value);
    if (isNaN(num)) return nullLabel;

    const opts: Intl.NumberFormatOptions = { ...options };

    if (currency) {
      opts.style = 'currency';
      opts.currency = currency;
    }
    if (compact) {
      opts.notation = 'compact';
      opts.compactDisplay = 'short';
    }
    if (precision != null) {
      opts.minimumFractionDigits = precision;
      opts.maximumFractionDigits = precision;
    }
    if (signed && num > 0 && !currency) {
      opts.signDisplay = 'always';
    }

    try {
      let result = new Intl.NumberFormat(locale, opts).format(num);
      if (prefix && !currency) {
        result = `${prefix}${result}`;
      }
      if (unit) {
        result = `${result} ${unit}`;
      }
      return result;
    } catch {
      return String(num);
    }
  });
</script>

<span class={cn('field-number text-sm', tabular && 'font-mono tabular-nums', className)}>
  {formatted}
</span>
