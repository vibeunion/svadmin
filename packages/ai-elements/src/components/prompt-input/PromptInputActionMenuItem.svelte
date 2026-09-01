<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLButtonAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { usePromptInputMenu } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'onselect'> { class?: string; children?: Snippet; onselect?: (event: MouseEvent) => void; }
  let { class: className = '', children, onclick, onselect, ...rest }: Props = $props(); const menu = usePromptInputMenu();
  function select(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void { onclick?.(event); onselect?.(event); if (!event.defaultPrevented) menu.setOpen(false); }
</script>
<button {...rest} type="button" class={cn('flex min-h-9 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring', className)} role="menuitem" data-slot="prompt-input-action-menu-item" onclick={select}>{@render children?.()}</button>
