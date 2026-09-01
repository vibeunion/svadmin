<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { ChevronDown } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { usePromptInputSelect } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, onclick, ...rest }: Props = $props(); const select = usePromptInputSelect();
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) select.setOpen(!select.open); }
</script>
<button {...rest} type="button" class={cn('inline-flex min-h-8 items-center gap-1 rounded px-2 text-xs font-medium text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring', className)} aria-haspopup="listbox" aria-expanded={select.open} data-slot="prompt-input-select-trigger" onclick={click}>{#if children}{@render children()}{:else}{select.value || 'Select'}{/if}<ChevronDown size={13} aria-hidden="true" /></button>
