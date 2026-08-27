<script module lang="ts">
  export type DateFieldFormat = 'date' | 'time' | 'datetime' | 'relative' | 'iso';
</script>

<script lang="ts">
  import { cn } from '../../utils.js';

  interface Props {
    value: string | number | Date | null | undefined;
    locale?: string;
    format?: DateFieldFormat;
    options?: Intl.DateTimeFormatOptions;
    nullLabel?: string;
    class?: string;
  }

  let {
    value,
    locale = 'en-US',
    format = 'date',
    options,
    nullLabel = '—',
    class: className = '',
  }: Props = $props();

  function formatRelative(date: Date, loc: string): string {
    const now = Date.now();
    const diffMs = date.getTime() - now;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    try {
      const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' });
      if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
      if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
      if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
      if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
    } catch {
      // Fallback
    }
    return new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(date);
  }

  const formatted = $derived.by(() => {
    if (value == null || value === '') return nullLabel;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return nullLabel;

    if (format === 'iso') return d.toISOString();
    if (format === 'relative') return formatRelative(d, locale);

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
  });

  const fullIsoTitle = $derived.by(() => {
    if (value == null || value === '') return undefined;
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  });
</script>

<span class={cn('field-date text-sm', className)} title={fullIsoTitle}>{formatted}</span>
