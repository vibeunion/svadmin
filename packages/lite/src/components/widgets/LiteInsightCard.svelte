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
  <div class="lite-inline-md" style="padding: 12px 16px; border-bottom: 1px solid #E5E6EB; font-weight: 600; font-size: 14px; color: #1D2129; align-items: center;">
    <span style="color: #FF7D00;">✦</span>
    {title}
  </div>
  <div style="padding: 16px; font-size: 14px; color: #1D2129; line-height: 1.6;">
    {#if displayContent}
      <p style="white-space: pre-wrap; margin: 0;">{displayContent}</p>
    {:else}
      <p style="color: #86909C; font-style: italic;">No insights available. AI analysis requires JavaScript.</p>
    {/if}
  </div>
</div>
