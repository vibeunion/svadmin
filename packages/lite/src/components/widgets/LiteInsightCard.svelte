<script lang="ts">
  import { renderRichContent, type MarkdownRenderOptions } from '../../rich-content.js';
  import { toSafeText } from '../../security.js';

  /**
   * SSR InsightCard — static pre-rendered content.
   * The SPA version streams AI-generated insights via ChatProvider; in Lite mode
   * the insight must be computed on the server and passed as Markdown or
   * allowlisted HTML, which is rendered here without hydration.
   */
  interface Props {
    title?: string;
    content?: string;
    /** Per-card renderer options; app-wide defaults come from configureMarkdownRenderer. */
    renderOptions?: MarkdownRenderOptions;
  }

  let { title = 'Insights', content = '', renderOptions }: Props = $props();
  const renderedContent = $derived(renderRichContent(toSafeText(content), renderOptions));
</script>

<div class="lite-card lite-insight-card" style="margin-bottom: 16px;">
  <div class="lite-insight-card__header" style="padding: 12px 16px; border-bottom: 1px solid #E5E6EB; font-weight: 600; font-size: 14px; color: #1D2129;">
    <span style="color: #FF7D00;">✦</span>
    {title}
  </div>
  <div class="lite-insight-card__body" style="padding: 16px; font-size: 14px; color: #1D2129; line-height: 1.6;">
    {#if renderedContent}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- 内容由 renderRichContent 转义或白名单过滤，高亮回调仅允许可信服务端实现。 -->
      <div class="lite-insight-content">{@html renderedContent}</div>
    {:else}
      <p style="color: #86909C; font-style: italic; margin: 0;">No insights available. AI analysis requires JavaScript.</p>
    {/if}
  </div>
</div>

<style>
  .lite-insight-content :global(p) { margin: 0 0 8px; }
  .lite-insight-content :global(p:last-child) { margin-bottom: 0; }
  .lite-insight-content :global(ul),
  .lite-insight-content :global(ol) { margin: 0 0 8px; padding-left: 20px; }
  .lite-insight-content :global(h1),
  .lite-insight-content :global(h2),
  .lite-insight-content :global(h3) { margin: 10px 0 6px; font-size: 15px; }
  .lite-insight-content :global(code) { padding: 1px 4px; border-radius: 3px; background: #F2F3F5; font-family: monospace; font-size: 12px; }
  .lite-insight-content :global(pre) { margin: 0 0 8px; padding: 8px; overflow-x: auto; border-radius: 4px; background: #F2F3F5; }
  .lite-insight-content :global(blockquote) { margin: 0 0 8px; padding-left: 10px; border-left: 3px solid #E5E6EB; color: #4E5969; }
  .lite-insight-content :global(a) { color: #165DFF; }
  .lite-insight-content :global(table) { width: 100%; margin: 0 0 8px; border-collapse: collapse; }
  .lite-insight-content :global(th),
  .lite-insight-content :global(td) { padding: 6px 8px; border: 1px solid #E5E6EB; text-align: left; }
  .lite-insight-content :global(th) { background: #F2F3F5; font-weight: 600; }
</style>
