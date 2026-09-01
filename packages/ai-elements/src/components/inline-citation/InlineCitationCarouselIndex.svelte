<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { useInlineCitationCarousel } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet<[number, number]>; }
  let { class: className = '', children, ...rest }: Props = $props(); const carousel = useInlineCitationCarousel();
</script>
<div {...rest} class={cn('flex flex-1 items-center justify-end px-3 py-1 text-xs tabular-nums text-muted-foreground', className)} aria-live="polite" data-slot="inline-citation-carousel-index">{#if children}{@render children(carousel.current + 1, carousel.count)}{:else}{carousel.current + 1}/{carousel.count}{/if}</div>
