<script module lang="ts">
  export type DateRangeFormat = 'date' | 'time' | 'datetime' | 'iso';
  export type DateRangeValue =
    | [string | number | Date | null | undefined, string | number | Date | null | undefined]
    | { start?: string | number | Date | null; end?: string | number | Date | null; from?: string | number | Date | null; to?: string | number | Date | null }
    | null
    | undefined;
</script>

<script lang="ts">
  import { Calendar } from '@lucide/svelte';
  import { cn } from '../../utils.js';

  interface Props {
    value?: DateRangeValue;
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
      const obj = value as Record<string, unknown>;
      return (obj.start ?? obj.from) as string | number | Date | null | undefined;
    }
    return undefined;
  });

  const end = $derived.by(() => {
    if (endDate !== undefined) return endDate;
    if (Array.isArray(value)) return value[1];
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      return (obj.end ?? obj.to) as string | number | Date | null | undefined;
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

<span class={cn('field-date-range svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568 svadmin-u-fc7473ca09eb', className)}>
  {#if showIcon}
    <Calendar class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c svadmin-u-bfa603190748 svadmin-u-012fbd121f37" />
  {/if}
  <span>{display}</span>
</span>
