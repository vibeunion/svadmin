<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { providePromptInputMenu } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { open?: boolean; defaultOpen?: boolean; class?: string; children?: Snippet; onopenchange?: (open: boolean) => void; }
  let { open = $bindable(false), defaultOpen = false, class: className = '', children, onopenchange, onkeydown, ...rest }: Props = $props();
  let initialized = false;
  $effect.pre(() => { if (!initialized) { initialized = true; if (defaultOpen) open = true; } });
  function setOpen(next: boolean): void { if (open === next) return; open = next; onopenchange?.(next); }
  providePromptInputMenu({ get open() { return open; }, setOpen });
  function keydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }): void { onkeydown?.(event); if (!event.defaultPrevented && event.key === 'Escape') { setOpen(false); event.currentTarget.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.focus(); } }
</script>
<div {...rest} class={cn('relative inline-flex', className)} data-slot="prompt-input-action-menu" data-state={open ? 'open' : 'closed'} onkeydown={keydown}>{@render children?.()}</div>
