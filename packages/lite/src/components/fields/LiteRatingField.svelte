<script module lang="ts">
  export type LiteRatingSize = 'sm' | 'default' | 'lg';
</script>

<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field?: FieldDefinition;
    value?: number | string | null;
    max?: number;
    showValue?: boolean;
    size?: LiteRatingSize;
    nullLabel?: string;
    class?: string;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    max = 5,
    showValue = false,
    size = 'default',
    nullLabel = '—',
    class: className = '',
    error = [],
    mode = 'show',
  }: Props = $props();

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
    if (numericValue === null) return [];
    const result: ('full' | 'half' | 'empty')[] = [];
    for (let index = 1; index <= normalizedMax; index += 1) {
      if (numericValue >= index) {
        result.push('full');
      } else if (numericValue >= index - 0.5) {
        result.push('half');
      } else {
        result.push('empty');
      }
    }
    return result;
  });

  const hasError = $derived(error.length > 0);
</script>

{#if mode === 'show'}
  {#if numericValue === null}
    <span class="lite-text-muted lite-text-sm {className}">{nullLabel}</span>
  {:else}
    <span class="lite-rating-container {className}">
      <span class="lite-rating lite-rating-{size}" role="img" aria-label={`${numericValue} out of ${normalizedMax}`}>
        {#each stars as starType, idx (idx)}
          {#if starType === 'full'}
            <span class="lite-rating-star lite-rating-star-full">★</span>
          {:else if starType === 'half'}
            <span class="lite-rating-star lite-rating-star-half">★</span>
          {:else}
            <span class="lite-rating-star lite-rating-star-empty">☆</span>
          {/if}
        {/each}
      </span>
      {#if showValue}
        <span class="lite-rating-value lite-font-mono">
          {numericValue}
        </span>
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
      name={field?.key ?? 'rating'}
      id={field?.key ?? 'rating'}
      value={numericValue ?? ''}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder={field?.label ?? `0 - ${normalizedMax}`}
      {...field?.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
