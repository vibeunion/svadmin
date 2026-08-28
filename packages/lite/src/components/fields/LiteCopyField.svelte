<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    displayValue?: string;
    monospace?: boolean;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    displayValue,
    monospace = true,
    error = [],
    mode = 'show',
  }: Props = $props();

  let hasError = $derived(error.length > 0);

  const rawString = $derived(value != null && value !== '' ? String(value) : '');
  const displayText = $derived(displayValue || (rawString ? rawString : '—'));
</script>

{#if mode === 'show'}
  <span class="lite-copy {monospace ? 'lite-mono' : ''}">{displayText}</span>
{:else}
  <div>
    <input
      type="text"
      name={field.key}
      id={field.key}
      value={rawString}
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
