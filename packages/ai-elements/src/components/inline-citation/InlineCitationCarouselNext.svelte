<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { ArrowRight } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { useInlineCitationCarousel } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, onclick, ...rest }: Props = $props(); const carousel = useInlineCitationCarousel();
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) carousel.next(); }
</script>
<button {...rest} type="button" class={cn('svadmin-ai__button svadmin-ai__button--ghost size-7 min-h-7 p-0', className)} aria-label={rest['aria-label'] ?? 'Next'} disabled={rest.disabled || !carousel.canNext} data-slot="inline-citation-carousel-next" onclick={click}>{#if children}{@render children()}{:else}<ArrowRight size={14} aria-hidden="true" />{/if}</button>
