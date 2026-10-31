<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

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
</script>

{#if mode === 'show'}
  <span class="lite-field-value {className}">{value == null ? '—' : Number(value).toLocaleString()}</span>
{:else}
  <div class="lite-field-edit {className}">
    <input
      type="number"
      name={field.key}
      id={field.key}
      value={value == null ? '' : Number(value)}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder={field.label}
      {...field.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
