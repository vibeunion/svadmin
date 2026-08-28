<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    startDate?: string | number | Date | null;
    endDate?: string | number | Date | null;
    separator?: string;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    startDate,
    endDate,
    separator = '~',
    error = [],
    mode = 'show',
  }: Props = $props();

  let hasError = $derived(error.length > 0);

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
    try {
      const d = val instanceof Date ? val : new Date(val);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString();
    } catch {
      return null;
    }
  }

  const startFormatted = $derived(formatDate(start));
  const endFormatted = $derived(formatDate(end));

  const display = $derived.by(() => {
    if (!startFormatted && !endFormatted) return '—';
    if (startFormatted && endFormatted) return `${startFormatted} ${separator} ${endFormatted}`;
    if (startFormatted) return `${startFormatted} ${separator} —`;
    return `— ${separator} ${endFormatted}`;
  });

  const rawInputValue = $derived.by(() => {
    if (typeof value === 'string') return value;
    if (startFormatted || endFormatted) return `${startFormatted ?? ''} ${separator} ${endFormatted ?? ''}`.trim();
    return '';
  });
</script>

{#if mode === 'show'}
  <span>{display}</span>
{:else}
  <div>
    <input
      type="text"
      name={field.key}
      id={field.key}
      value={rawInputValue}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder="YYYY-MM-DD ~ YYYY-MM-DD"
      {...field.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
