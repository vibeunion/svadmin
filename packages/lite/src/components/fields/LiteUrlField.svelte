<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { toSafeHref, toSafeText } from '../../security';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
    /** Caller class merged with the built-in class list. */
    class?: string;
  }

  let { field, value, error = [], mode = 'show', class: className = '' }: Props = $props();
  let hasError = $derived(error.length > 0);
  let displayValue = $derived(toSafeText(value));
  let safeHref = $derived(toSafeHref(value));
  const placeholder = $derived(field.label);
</script>

{#if mode === 'show'}
  <span class="lite-field-value {className}">
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
  <div class="lite-field-edit {className}">
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
