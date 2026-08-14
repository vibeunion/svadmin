<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { toSafeHref } from '../../security';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let { field, value, error = [], mode = 'show' }: Props = $props();
  let hasError = $derived(error.length > 0);

  function getFiles(v: unknown): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string') return [v];
    return [];
  }
</script>

{#if mode === 'show'}
  {@const files = getFiles(value)}
  <div class="lite-stack-xs">
    {#each files as f, _i (_i)}
      {@const href = toSafeHref(f)}
      {#if href}
        <a {href} target="_blank" rel="noopener noreferrer">{f.split('/').pop() || 'Download'}</a>
      {:else}
        <span>{f}</span>
      {/if}
    {:else}
      <span>—</span>
    {/each}
  </div>
{:else}
  {@const files = getFiles(value)}
  <div>
    {#if files.length > 0 && mode === 'edit'}
      <div style="margin-bottom: 8px;">
        <span style="font-size: 12px;">Current files: {files.length}</span>
      </div>
    {/if}
    <input
      type="file"
      name={field.key}
      id={field.key}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      {...(field.type as string) === 'files' ? { multiple: true } : {}}
      {...field.required && !files.length ? { required: true } : {}}
    />
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
