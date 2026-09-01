<script lang="ts">
  import type { Snippet } from 'svelte'; import { onDestroy } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { useInlineCitationCarousel } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props(); const carousel = useInlineCitationCarousel(); const id = $props.id(); const unregister = carousel.register(id); const itemIndex = $derived(carousel.indexOf(id)); onDestroy(unregister);
</script>
{#if itemIndex === carousel.current}<div {...rest} class={cn('w-full space-y-2 p-4', className)} role="group" aria-roledescription="slide" aria-label={`${itemIndex + 1} of ${carousel.count}`} data-slot="inline-citation-carousel-item">{@render children?.()}</div>{/if}
