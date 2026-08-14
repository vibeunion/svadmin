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

<div class="lite-card" style="margin-bottom: 16px;">
  <div class="lite-inline-md" style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 14px; color: #0f172a; align-items: center;">
    <span style="color: #f59e0b;">✦</span>
    {title}
  </div>
  <div style="padding: 16px; font-size: 14px; color: #334155; line-height: 1.6;">
    {#if displayContent}
      <p style="white-space: pre-wrap; margin: 0;">{displayContent}</p>
    {:else}
      <p style="color: #94a3b8; font-style: italic;">No insights available. AI analysis requires JavaScript.</p>
    {/if}
  </div>
</div>
