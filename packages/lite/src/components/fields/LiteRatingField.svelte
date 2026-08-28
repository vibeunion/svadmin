<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    max?: number;
    showValue?: boolean;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    max = 5,
    showValue = false,
    error = [],
    mode = 'show',
  }: Props = $props();

  let hasError = $derived(error.length > 0);

  const normalizedMax = $derived(
    Number.isFinite(max) ? Math.min(100, Math.max(1, Math.trunc(max))) : 5
  );

  const numericValue = $derived.by(() => {
    if (value == null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(0, Math.min(normalizedMax, parsed));
  });

  const stars = $derived.by(() => {
    if (numericValue === null) return '';
    const full = Math.floor(numericValue);
    const empty = normalizedMax - full;
    return '★'.repeat(Math.max(0, full)) + '☆'.repeat(Math.max(0, empty));
  });
</script>

{#if mode === 'show'}
  {#if numericValue === null}
    <span>—</span>
  {:else}
    <span class="lite-rating" role="img" aria-label="{numericValue} out of {normalizedMax}">
      <span class="lite-rating-stars">{stars}</span>
      {#if showValue}
        <span class="lite-rating-val">({numericValue})</span>
      {/if}
    </span>
  {/if}
{:else}
  <div>
    <input
      type="number"
      min="0"
      max={normalizedMax}
      step="0.5"
      name={field.key}
      id={field.key}
      value={numericValue ?? ''}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder={`${field.label} (0-${normalizedMax})`}
      {...field.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
