<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { ChevronsUpDown } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { useVoiceSelector } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet<[string | undefined]>; }
  let { class: className = '', children, onclick, ...rest }: Props = $props(); const selector = useVoiceSelector();
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) selector.setOpen(!selector.open); }
</script>
<button {...rest} type="button" class={cn('svadmin-ai__button svadmin-ai__button--ghost min-h-9 justify-between gap-2 px-3', className)} aria-haspopup="dialog" aria-expanded={selector.open} data-slot="voice-selector-trigger" onclick={click}>{#if children}{@render children(selector.value)}{:else}<span>{selector.value ?? 'Select voice'}</span>{/if}<ChevronsUpDown size={14} aria-hidden="true" /></button>
