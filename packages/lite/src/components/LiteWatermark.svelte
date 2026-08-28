<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    content?: string | string[];
    opacity?: number;
    rotate?: number;
    class?: string;
    children?: Snippet;
  }

  let {
    content = 'CONFIDENTIAL',
    opacity = 0.1,
    rotate = -22,
    class: className = '',
    children,
  }: Props = $props();

  const text = $derived(Array.isArray(content) ? content.join(' ') : content);
  const svgEncoded = $derived(
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="14" fill="#888888" fill-opacity="${opacity}" transform="rotate(${rotate} 120 80)">${text}</text></svg>`
    )
  );
</script>

<div
  class="lite-watermark-wrapper {className}"
  style="position: relative; overflow: hidden; background-image: url('data:image/svg+xml;utf8,{svgEncoded}'); background-repeat: repeat;"
>
  {#if children}
    {@render children()}
  {/if}
</div>
