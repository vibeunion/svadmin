<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    currency?: string;
    locale?: string;
    precision?: number;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    currency = 'USD',
    locale = 'en-US',
    precision = 2,
    error = [],
    mode = 'show',
  }: Props = $props();

  let hasError = $derived(error.length > 0);

  const numericValue = $derived.by(() => {
    if (value == null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const num = typeof value === 'number' ? value : Number(String(value).replace(/^[$€£¥]/, ''));
    return Number.isFinite(num) ? num : null;
  });

  const formatted = $derived.by(() => {
    if (numericValue === null) return '—';
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(numericValue);
    } catch {
      return `$${numericValue.toFixed(precision)}`;
    }
  });
</script>

{#if mode === 'show'}
  <span class="lite-currency">{formatted}</span>
{:else}
  <div>
    <input
      type="number"
      step="any"
      name={field.key}
      id={field.key}
      value={numericValue ?? ''}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder={field.label || '0.00'}
      {...field.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
