<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { providePromptInputHoverCard } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { open?: boolean; defaultOpen?: boolean; class?: string; children?: Snippet; }
  let { open = $bindable(false), defaultOpen = false, class: className = '', children, ...rest }: Props = $props(); let initialized = false;
  $effect.pre(() => { if (!initialized) { initialized = true; if (defaultOpen) open = true; } });
  function setOpen(next: boolean): void { open = next; }
  providePromptInputHoverCard({ get open() { return open; }, setOpen });
</script>
<div {...rest} class={cn('relative inline-flex', className)} data-slot="prompt-input-hover-card" onfocusin={() => setOpen(true)} onfocusout={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }} onmouseenter={() => setOpen(true)} onmouseleave={() => setOpen(false)}>{@render children?.()}</div>
