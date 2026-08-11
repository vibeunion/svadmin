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
  <span>
    {#if value}
      <a href="mailto:{value}">{value}</a>
    {:else}
      —
    {/if}
  </span>
{:else}
  <div>
    <input
      type="email"
      name={field.key}
      id={field.key}
      value={String(value ?? '')}
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
