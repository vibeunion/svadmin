<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { toSafeHref, toSafeText } from '../../security';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let { field, value, error = [], mode = 'show' }: Props = $props();
  let hasError = $derived(error.length > 0);
  let displayValue = $derived(toSafeText(value));
  let safeHref = $derived(toSafeHref(value));
  const placeholder = $derived(field.label);
</script>

{#if mode === 'show'}
  <span>
    {#if displayValue}
      {#if safeHref}
        <a href={safeHref} target="_blank" rel="noopener noreferrer">{displayValue}</a>
      {:else}
        {displayValue}
      {/if}
    {:else}
      —
    {/if}
  </span>
{:else}
  <div>
    <input
      type="url"
      name={field.key}
      id={field.key}
      value={String(value ?? '')}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      {placeholder}
      {...field.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
