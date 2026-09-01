<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { Check } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { usePromptInputSelect } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { value: string; class?: string; children?: Snippet; }
  let { value, class: className = '', children, onclick, ...rest }: Props = $props(); const select = usePromptInputSelect();
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) select.setValue(value); }
</script>
<button {...rest} type="button" role="option" aria-selected={select.value === value} class={cn('flex min-h-8 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring', className)} data-slot="prompt-input-select-item" onclick={click}>{#if select.value === value}<Check size={14} aria-hidden="true" />{:else}<span class="size-3" aria-hidden="true"></span>{/if}{#if children}{@render children()}{:else}{value}{/if}</button>
