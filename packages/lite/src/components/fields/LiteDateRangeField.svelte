<script module lang="ts">
  export type LiteDateRangeFormat = 'date' | 'time' | 'datetime' | 'iso';
  export type LiteDateRangeValue =
    | [string | number | Date | null | undefined, string | number | Date | null | undefined]
    | { start?: string | number | Date | null; end?: string | number | Date | null; from?: string | number | Date | null; to?: string | number | Date | null }
    | null
    | undefined;
</script>

<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field?: FieldDefinition;
    value?: LiteDateRangeValue;
    startDate?: string | number | Date | null;
    endDate?: string | number | Date | null;
    separator?: string;
    locale?: string;
    format?: LiteDateRangeFormat;
    options?: Intl.DateTimeFormatOptions;
    nullLabel?: string;
    showIcon?: boolean;
    class?: string;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    startDate,
    endDate,
    separator = '~',
    locale = 'en-US',
    format = 'date',
    options,
    nullLabel = '—',
    class: className = '',
    error = [],
    mode = 'show',
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

  function toIsoDateInput(val: string | number | Date | null | undefined): string {
    if (val == null || val === '') return '';
    try {
      const d = val instanceof Date ? val : new Date(val);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0] ?? '';
    } catch {
      return '';
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

  const hasError = $derived(error.length > 0);
  const startKey = $derived(field ? `${field.key}_start` : 'start_date');
  const endKey = $derived(field ? `${field.key}_end` : 'end_date');
</script>

{#if mode === 'show'}
  <span class="lite-date-range {className}">
    <span>{display}</span>
  </span>
{:else}
  <div>
    <div class="lite-inline-sm" style="display: flex; align-items: center;">
      <input
        type="date"
        name={startKey}
        id={startKey}
        value={toIsoDateInput(start)}
        class="lite-input {hasError ? 'lite-input-error' : ''}"
        style="flex: 1; min-width: 120px;"
        placeholder="Start date"
        {...field?.required ? { required: true } : {}}
      />
      <span style="margin: 0 8px; color: #64748b;">{separator}</span>
      <input
        type="date"
        name={endKey}
        id={endKey}
        value={toIsoDateInput(end)}
        class="lite-input {hasError ? 'lite-input-error' : ''}"
        style="flex: 1; min-width: 120px;"
        placeholder="End date"
        {...field?.required ? { required: true } : {}}
      />
    </div>
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
