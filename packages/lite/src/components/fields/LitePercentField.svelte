<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    precision?: number;
    scale?: '100' | '1';
    showProgress?: boolean;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    precision = 1,
    scale = '100',
    showProgress = false,
    error = [],
    mode = 'show',
  }: Props = $props();

  let hasError = $derived(error.length > 0);

  const numericValue = $derived.by(() => {
    if (value == null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const parsed = typeof value === 'number' ? value : Number(String(value).replace(/%$/, ''));
    return Number.isFinite(parsed) ? parsed : null;
  });

  const percentNumber = $derived.by(() => {
    if (numericValue === null) return null;
    const scaled = scale === '1' ? numericValue * 100 : numericValue;
    return Number.isFinite(scaled) ? scaled : null;
  });

  const formatted = $derived(
    percentNumber === null ? '—' : `${percentNumber.toFixed(precision)}%`
  );

  const clampedProgress = $derived(
    percentNumber === null ? 0 : Math.min(100, Math.max(0, percentNumber))
  );
</script>

{#if mode === 'show'}
  <span class="lite-percent">
    {formatted}
    {#if showProgress && percentNumber !== null}
      <span class="lite-progress-bar" role="progressbar" aria-valuenow={clampedProgress} aria-valuemin="0" aria-valuemax="100">
        <span class="lite-progress-fill" style="width: {clampedProgress}%"></span>
      </span>
    {/if}
  </span>
{:else}
  <div>
    <input
      type="number"
      step="any"
      name={field.key}
      id={field.key}
      value={percentNumber ?? ''}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder={field.label || '0'}
      {...field.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
