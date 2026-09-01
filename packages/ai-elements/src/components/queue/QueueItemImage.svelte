<script lang="ts">
  import type { HTMLImgAttributes } from 'svelte/elements';
  import { cn, safeResourceUrl } from '../../utils.js';
  interface Props extends Omit<HTMLImgAttributes, 'class' | 'src'> { src?: string; class?: string; }
  let { src, alt = '', class: className = '', width = 32, height = 32, ...rest }: Props = $props();
  const safeSrc = $derived(safeResourceUrl(src));
</script>
{#if safeSrc}<img {...rest} src={safeSrc} {alt} {width} {height} class={cn('svadmin-ai-queue-part__image', className)} data-slot="queue-item-image" />{/if}
<style>.svadmin-ai-queue-part__image { width: 2rem; height: 2rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .4rem); object-fit: cover; }</style>
