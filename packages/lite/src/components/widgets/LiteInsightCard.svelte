<script lang="ts">
  import { toSafeText } from '../../security.js';

  /**
   * SSR InsightCard — Degraded to static pre-rendered content.
   * The SPA version streams AI-generated insights via ChatProvider.
   * In lite mode, insights must be pre-computed on the server and
   * passed as a static string. No AI streaming is available.
   */
  interface Props {
    title?: string;
    content?: string;
  }

  let { title = 'Insights', content = '' }: Props = $props();
  const displayContent = $derived(toSafeText(content));
</script>

<div class="lite-card lite-card-flush">
  <div class="lite-card-header">
    <h2 class="lite-card-title lite-inline-xs" style="align-items: center;">
      <span style="color: #d97706;">✦</span>
      <span>{title}</span>
    </h2>
  </div>
  <div class="lite-card-body" style="font-size: 14px; color: #334155; line-height: 1.6;">
    {#if displayContent}
      <p style="white-space: pre-wrap; margin: 0;">{displayContent}</p>
    {:else}
      <p style="color: #94a3b8; font-style: italic; margin: 0;">No insights available. AI analysis requires JavaScript.</p>
    {/if}
  </div>
</div>
