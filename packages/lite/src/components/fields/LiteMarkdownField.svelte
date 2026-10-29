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
</script>

{#if mode === 'show'}
  <pre style="white-space: pre-wrap; padding: 12px; background: #F7F8FA; border: 1px solid #e5e7eb; border-radius: 4px;">{String(value ?? '—')}</pre>
{:else}
  <div>
    <textarea
      name={field.key}
      id={field.key}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      style="min-height: 200px; font-family: monospace;"
      placeholder="Enter markdown..."
      {...field.required ? { required: true } : {}}
    >{String(value ?? '')}</textarea>
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
