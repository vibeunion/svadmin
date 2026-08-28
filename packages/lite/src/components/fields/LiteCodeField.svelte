<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    language?: string;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    language,
    error = [],
    mode = 'show',
  }: Props = $props();

  let hasError = $derived(error.length > 0);

  const formattedCode = $derived.by(() => {
    if (value == null || value === '') return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  });
</script>

{#if mode === 'show'}
  {#if !formattedCode}
    <span>—</span>
  {:else}
    {#if language}
      <span class="lite-badge">{language.toUpperCase()}</span>
    {/if}
    <pre class="lite-code"><code>{formattedCode}</code></pre>
  {/if}
{:else}
  <div>
    <textarea
      name={field.key}
      id={field.key}
      class="lite-input lite-textarea-code {hasError ? 'lite-input-error' : ''}"
      placeholder={field.label}
      required={field.required}
    >{formattedCode}</textarea>
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
