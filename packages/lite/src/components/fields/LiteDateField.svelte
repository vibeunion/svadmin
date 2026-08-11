<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let { field, value, error = [], mode = 'show' }: Props = $props();
  let hasError = $derived(error.length > 0);

  function formatDate(v: unknown): string {
    if (!v) return '';
    try {
      return new Date(v as string).toISOString().substring(0, 16);
    } catch {
      return '';
    }
  }

  function displayDate(v: unknown): string {
    if (!v) return '—';
    try {
      return new Date(v as string).toLocaleDateString();
    } catch {
      return String(v);
    }
  }
</script>

{#if mode === 'show'}
  <span>{displayDate(value)}</span>
{:else}
  <div>
    <input
      type="datetime-local"
      name={field.key}
      id={field.key}
      value={formatDate(value)}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      {...field.required ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
