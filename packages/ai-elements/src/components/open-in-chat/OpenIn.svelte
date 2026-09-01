<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { provideOpenInContext } from './context.svelte.js';
  let { query, open = $bindable(false), class: className = '', children, onopenchange, ...rest }: { query: string; open?: boolean; class?: string; children?: Snippet; onopenchange?: (open: boolean) => void; [key: string]: unknown } = $props();
  function setOpen(next: boolean): void { open = next; onopenchange?.(next); }
  provideOpenInContext({ get query() { return query; }, get open() { return open; }, setOpen });
</script>
<div class={cn('svadmin-ai relative inline-flex', className)} data-state={open ? 'open' : 'closed'} onkeydown={(event) => { if (event.key === 'Escape') setOpen(false); }} {...rest}>{@render children?.()}</div>
