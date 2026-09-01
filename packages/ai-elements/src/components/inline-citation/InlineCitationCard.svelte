<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js'; import { provideInlineCitationCard } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> { open?: boolean; defaultOpen?: boolean; class?: string; children?: Snippet; onopenchange?: (open: boolean) => void; }
  let { open = $bindable(false), defaultOpen = false, class: className = '', children, onopenchange, ...rest }: Props = $props(); let initialized = false;
  $effect.pre(() => { if (!initialized) { initialized = true; if (defaultOpen) open = true; } });
  function setOpen(next: boolean): void { if (open === next) return; open = next; onopenchange?.(next); }
  provideInlineCitationCard({ get open() { return open; }, setOpen });
</script>
<span {...rest} class={cn('relative inline-flex', className)} data-slot="inline-citation-card" data-state={open ? 'open' : 'closed'} onmouseenter={() => setOpen(true)} onmouseleave={() => setOpen(false)} onfocusin={() => setOpen(true)} onfocusout={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>{@render children?.()}</span>
