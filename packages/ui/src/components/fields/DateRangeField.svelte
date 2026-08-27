<script module lang="ts">
  export type DateRangeFormat = 'date' | 'time' | 'datetime' | 'iso';
</script>

<script lang="ts">
  import { Calendar } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props {
    value?: [string | number | Date | null | undefined, string | number | Date | null | undefined] | { start?: any; end?: any; from?: any; to?: any } | null | undefined;
    startDate?: string | number | Date | null | undefined;
    endDate?: string | number | Date | null | undefined;
    separator?: string;
    locale?: string;
    format?: DateRangeFormat;
    options?: Intl.DateTimeFormatOptions;
    nullLabel?: string;
    showIcon?: boolean;
    class?: string;
  }

  let {
    value,
    startDate,
    endDate,
    separator = '~',
    locale = 'en-US',
    format = 'date',
    options,
    nullLabel = '—',
    showIcon = false,
    class: className = '',
  }: Props = $props();

  const start = $derived.by(() => {
    if (startDate !== undefined) return startDate;
    if (Array.isArray(value)) return value[0];
    if (value && typeof value === 'object') {
      return (value as any).start ?? (value as any).from;
    }
    return undefined;
  });

  const end = $derived.by(() => {
    if (endDate !== undefined) return endDate;
    if (Array.isArray(value)) return value[1];
    if (value && typeof value === 'object') {
      return (value as any).end ?? (value as any).to;
    }
    return undefined;
  });

  function formatDate(val: string | number | Date | null | undefined): string | null {
    if (val == null || val === '') return null;
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return null;

    if (format === 'iso') return d.toISOString();

    const defaultOptions: Intl.DateTimeFormatOptions =
      options ??
      (format === 'datetime'
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : format === 'time'
          ? { timeStyle: 'medium' }
          : { dateStyle: 'medium' });

    try {
      return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
    } catch {
      return d.toLocaleDateString();
    }
  }

  const startFormatted = $derived(formatDate(start));
  const endFormatted = $derived(formatDate(end));

  const display = $derived.by(() => {
    if (!startFormatted && !endFormatted) return nullLabel;
    if (startFormatted && endFormatted) return `${startFormatted} ${separator} ${endFormatted}`;
    if (startFormatted) return `${startFormatted} ${separator} ${nullLabel}`;
    return `${nullLabel} ${separator} ${endFormatted}`;
  });
</script>

<span class={cn('field-date-range inline-flex items-center gap-1.5 text-sm', className)}>
  {#if showIcon}
    <Calendar class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
  {/if}
  <span>{display}</span>
</span>
