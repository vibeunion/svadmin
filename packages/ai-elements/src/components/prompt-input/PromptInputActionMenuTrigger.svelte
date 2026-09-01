<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { Plus } from '@lucide/svelte'; import { cn } from '../../utils.js'; import { usePromptInputMenu } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, onclick, ...rest }: Props = $props(); const menu = usePromptInputMenu();
  function click(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); if (!event.defaultPrevented) menu.setOpen(!menu.open); }
</script>
<button {...rest} type="button" class={cn('svadmin-ai__button svadmin-ai__button--ghost size-8 min-h-8 p-0', className)} aria-haspopup="menu" aria-expanded={menu.open} aria-label={rest['aria-label'] ?? 'Prompt actions'} data-slot="prompt-input-action-menu-trigger" onclick={click}>{#if children}{@render children()}{:else}<Plus size={16} aria-hidden="true" />{/if}</button>
