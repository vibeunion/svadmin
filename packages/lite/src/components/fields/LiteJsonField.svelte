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
  
  function getJsonString(v: unknown): string {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
</script>

{#if mode === 'show'}
  <pre style="padding: 12px; background: #1D2129; color: #F7F8FA; border-radius: 4px; overflow-x: auto; font-size: 13px;">{getJsonString(value)}</pre>
{:else}
  <div>
    <textarea
      name={field.key}
      id={field.key}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      style="min-height: 150px; font-family: monospace;"
      placeholder="&lbrace;&rbrace;"
      {...field.required ? { required: true } : {}}
    >{getJsonString(value)}</textarea>
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
