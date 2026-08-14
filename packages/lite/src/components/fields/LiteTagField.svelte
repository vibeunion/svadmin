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
  const tags = $derived(Array.isArray(value) ? value.map(String) : []);
</script>

{#if mode === 'show'}
  <div class="lite-inline-xs lite-flex-wrap">
    {#each tags as tag, _i (_i)}
      <span class="lite-badge">{tag}</span>
    {:else}
      <span>—</span>
    {/each}
  </div>
{:else}
  <div>
    <!-- For SSR without JS, we just accept a comma-separated string -->
    <input
      type="text"
      name={field.key}
      id={field.key}
      value={tags.join(', ')}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      placeholder="Comma separated tags (e.g. admin, user, internal)"
    />
    <span style="font-size: 11px; color: #6b7280; display: block; margin-top: 4px;">
      Separate tags with commas.
    </span>
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
