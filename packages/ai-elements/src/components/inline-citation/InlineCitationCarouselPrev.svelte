<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { ArrowLeft } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { useInlineCitationCarousel } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, onclick, ...rest }: Props = $props(); const carousel = useInlineCitationCarousel();
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) carousel.previous(); }
</script>
<button {...rest} type="button" class={cn('svadmin-ai__button svadmin-ai__button--ghost size-7 min-h-7 p-0', className)} aria-label={rest['aria-label'] ?? 'Previous'} disabled={rest.disabled || !carousel.canPrevious} data-slot="inline-citation-carousel-prev" onclick={click}>{#if children}{@render children()}{:else}<ArrowLeft size={14} aria-hidden="true" />{/if}</button>
