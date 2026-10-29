<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { toSafeText } from '../../security.js';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let { field, value, error = [], mode = 'show' }: Props = $props();
  let hasError = $derived(error.length > 0);
  const displayValue = $derived(toSafeText(value, '—'));
</script>

{#if mode === 'show'}
  <!-- Lite mode intentionally renders rich content as text to keep SSR output safe without a sanitizer dependency. -->
  <div style="padding: 16px; border: 1px solid #E5E6EB; border-radius: 6px; max-height: 500px; overflow-y: auto; background: #fff; white-space: pre-wrap;" class="prose">
    {displayValue}
  </div>
{:else}
  <div class="lite-markdown-editor">
    <div class="lite-inline-lg lite-flex-wrap" style="padding: 8px 12px; border: 1px solid #E5E6EB; border-bottom: none; border-radius: 6px 6px 0 0; background: #F7F8FA; color: #4E5969; font-size: 12px; font-weight: 500;">
      <span>Markdown is supported</span>
      <span style="color: #86909C;">**bold**</span>
      <span style="color: #86909C; font-style: italic;">*italic*</span>
      <span style="color: #86909C;"># heading</span>
    </div>
    <textarea
      name={field.key}
      id={field.key}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      style="min-height: 280px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px; line-height: 1.6; padding: 16px; border-radius: 0 0 6px 6px; resize: vertical;"
      placeholder="Wait... Rich Text Editor is disabled in lite mode.&#10;&#10;You can write standard HTML or use Markdown syntax here. Content will be safely rendered on the server."
      {...field.required ? { required: true } : {}}
    >{toSafeText(value)}</textarea>
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
  </div>
{/if}
