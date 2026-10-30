<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { toSafeText } from '../../security.js';
  import { renderRichContent } from '../../rich-content.js';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
  }

  let { field, value, error = [], mode = 'show' }: Props = $props();
  let hasError = $derived(error.length > 0);
  const preview = $derived(renderRichContent(value));
</script>

{#if mode === 'show'}
  {#if preview}
    <div class="lite-rich-preview">{@html preview}</div>
  {:else}
    <span>—</span>
  {/if}
{:else}
  <div class="lite-markdown-editor">
    <div class="lite-inline-lg lite-flex-wrap" style="padding: 8px 12px; border: 1px solid #E5E6EB; border-bottom: none; border-radius: 6px 6px 0 0; background: #F7F8FA; color: #4E5969; font-size: 12px; font-weight: 500;">
      <span>HTML or Markdown source</span>
      <span style="color: #86909C;">**bold**</span>
      <span style="color: #86909C; font-style: italic;">*italic*</span>
      <span style="color: #86909C;"># heading</span>
    </div>
    <textarea
      name={field.key}
      id={field.key}
      class="lite-input {hasError ? 'lite-input-error' : ''}"
      style="min-height: 280px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px; line-height: 1.6; padding: 16px; border-radius: 0 0 6px 6px; resize: vertical;"
      placeholder="Rich text editing is disabled in lite mode. Write standard HTML or Markdown; the server renders it through a safe allowlist."
      {...field.required ? { required: true } : {}}
    >{toSafeText(value)}</textarea>
    {#if hasError}
      {#each error as err, _i (_i)}
        <div class="lite-error-text">{err}</div>
      {/each}
    {/if}
    <div class="lite-rich-preview-block">
      <span class="lite-rich-preview-block__label">Preview</span>
      {#if preview}
        <div class="lite-rich-preview">{@html preview}</div>
      {:else}
        <p class="lite-rich-preview-block__empty">Nothing to preview yet.</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .lite-rich-preview { padding: 16px; border: 1px solid #E5E6EB; border-radius: 6px; max-height: 500px; overflow-y: auto; background: #fff; color: #1D2129; font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
  .lite-rich-preview :global(p) { margin: 0 0 8px; }
  .lite-rich-preview :global(h1),
  .lite-rich-preview :global(h2),
  .lite-rich-preview :global(h3) { margin: 12px 0 6px; font-size: 16px; }
  .lite-rich-preview :global(ul),
  .lite-rich-preview :global(ol) { margin: 0 0 8px; padding-left: 20px; }
  .lite-rich-preview :global(code) { font-family: monospace; font-size: 12px; }
  .lite-rich-preview :global(blockquote) { margin: 0 0 8px; padding-left: 10px; border-left: 3px solid #E5E6EB; color: #4E5969; }
  .lite-rich-preview :global(a) { color: #165DFF; }
  .lite-rich-preview :global(img) { max-width: 100%; height: auto; }
  .lite-rich-preview-block { margin-top: 8px; }
  .lite-rich-preview-block__label { display: block; margin-bottom: 4px; color: #86909C; font-size: 11px; font-weight: 600; }
  .lite-rich-preview-block__empty { margin: 0; padding: 8px 12px; border: 1px dashed #E5E6EB; border-radius: 4px; color: #86909C; font-size: 12px; }
</style>
