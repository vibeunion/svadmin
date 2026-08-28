<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';

  interface Props {
    field?: FieldDefinition;
    value?: string | number | Record<string, unknown> | unknown[] | null;
    language?: string;
    copyable?: boolean;
    title?: string;
    nullLabel?: string;
    maxHeight?: string;
    class?: string;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let {
    field,
    value,
    language,
    nullLabel = '—',
    maxHeight = '200px',
    class: className = '',
    error = [],
    mode = 'show',
  }: Props = $props();

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

  const hasError = $derived(error.length > 0);
</script>

{#if mode === 'show'}
  {#if !formattedCode}
    <span class="lite-text-muted lite-text-sm {className}">{nullLabel}</span>
  {:else}
    <div class="lite-code-block {className}">
      {#if language}
        <div class="lite-code-header">
          <span class="lite-badge">{language.toUpperCase()}</span>
        </div>
      {/if}
      <pre class="lite-code-pre" style="max-height: {maxHeight};"><code>{formattedCode}</code></pre>
    </div>
  {/if}
{:else}
  <div>
    <textarea
      name={field?.key ?? 'code'}
      id={field?.key ?? 'code'}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      style="min-height: 120px; font-family: monospace; font-size: 12px;"
      placeholder={field?.label ?? 'Code / content'}
      {...field?.required ? { required: true } : {}}
    >{formattedCode}</textarea>
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
