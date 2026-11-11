<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    content?: string | string[];
    class?: string;
    children?: Snippet;
  }

  let {
    content = 'SVAdmin Lite',
    class: className = '',
    children,
  }: Props = $props();

  const watermarkText = $derived(
    Array.isArray(content) ? content.join(' ') : String(content)
  );

  const encodedSvg = $derived.by(() => {
    const escaped = watermarkText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="120" viewBox="0 0 220 120"><text x="20" y="60" fill="rgba(0,0,0,0.07)" font-family="sans-serif" font-size="12" transform="rotate(-18 110 60)">${escaped}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  });
</script>

<div
  class="lite-watermark-container {className}"
  data-svadmin-component="LiteWatermarkContainer"
  style="--lite-watermark-pattern: url('{encodedSvg}');"
>
  <div class="lite-watermark-overlay" aria-hidden="true"></div>
  <div class="lite-watermark-content">
    {#if children}{@render children()}{/if}
  </div>
</div>

<style>
  .lite-watermark-container {
    position: relative;
    overflow: hidden;
  }
  .lite-watermark-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 9;
    background-image: var(--lite-watermark-pattern);
    background-repeat: repeat;
  }
  .lite-watermark-content {
    position: relative;
    z-index: 1;
  }
</style>
