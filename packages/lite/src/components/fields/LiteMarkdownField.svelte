<script lang="ts">
  import type { FieldDefinition } from '@svadmin/core';
  import { renderMarkdown, type MarkdownRenderOptions } from '../../rich-content.js';

  interface Props {
    field: FieldDefinition;
    value?: unknown;
    error?: string[];
    mode?: 'show' | 'edit' | 'create';
    /** Per-field renderer options; app-wide defaults come from configureMarkdownRenderer. */
    renderOptions?: MarkdownRenderOptions;
  }

  let { field, value, error = [], mode = 'show', renderOptions }: Props = $props();
  let hasError = $derived(error.length > 0);
  const preview = $derived(renderMarkdown(value, renderOptions));
</script>

{#if mode === 'show'}
  {#if preview}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- 内容由 renderMarkdown 转义，高亮回调仅允许可信服务端实现。 -->
    <div class="lite-markdown-preview">{@html preview}</div>
  {:else}
    <span>—</span>
  {/if}
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
    <div class="lite-markdown-preview-block">
      <span class="lite-markdown-preview-block__label">Preview</span>
      {#if preview}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- 内容由 renderMarkdown 转义，高亮回调仅允许可信服务端实现。 -->
        <div class="lite-markdown-preview">{@html preview}</div>
      {:else}
        <p class="lite-markdown-preview-block__empty">Nothing to preview yet.</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .lite-markdown-preview { padding: 12px; border: 1px solid #E5E6EB; border-radius: 4px; background: #F7F8FA; color: #1D2129; font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
  .lite-markdown-preview :global(h1),
  .lite-markdown-preview :global(h2),
  .lite-markdown-preview :global(h3),
  .lite-markdown-preview :global(h4) { margin: 12px 0 6px; font-size: 15px; }
  .lite-markdown-preview :global(p) { margin: 0 0 8px; }
  .lite-markdown-preview :global(ul),
  .lite-markdown-preview :global(ol) { margin: 0 0 8px; padding-left: 20px; }
  .lite-markdown-preview :global(pre) { margin: 0 0 8px; padding: 8px; overflow-x: auto; border-radius: 4px; background: #F2F3F5; }
  .lite-markdown-preview :global(code) { font-family: monospace; font-size: 12px; }
  .lite-markdown-preview :global(blockquote) { margin: 0 0 8px; padding-left: 10px; border-left: 3px solid #E5E6EB; color: #4E5969; }
  .lite-markdown-preview :global(a) { color: #165DFF; }
  .lite-markdown-preview :global(table) { width: 100%; margin: 0 0 8px; border-collapse: collapse; }
  .lite-markdown-preview :global(th),
  .lite-markdown-preview :global(td) { padding: 6px 8px; border: 1px solid #E5E6EB; text-align: left; }
  .lite-markdown-preview :global(th) { background: #F2F3F5; font-weight: 600; }
  .lite-markdown-preview :global(ul.lite-task-list) { padding-left: 2px; list-style: none; }
  .lite-markdown-preview :global(.lite-task-item input) { margin-right: 6px; }
  .lite-markdown-preview-block { margin-top: 8px; }
  .lite-markdown-preview-block__label { display: block; margin-bottom: 4px; color: #86909C; font-size: 11px; font-weight: 600; }
  .lite-markdown-preview-block__empty { margin: 0; padding: 8px 12px; border: 1px dashed #E5E6EB; border-radius: 4px; color: #86909C; font-size: 12px; }
</style>
