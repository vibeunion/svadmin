<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { provideSandboxContext } from './context.svelte.js';
  let { defaultOpen = true, open = $bindable(defaultOpen), class: className = '', children, onopenchange, ...rest }: { open?: boolean; defaultOpen?: boolean; class?: string; children?: Snippet; onopenchange?: (open: boolean) => void; [key: string]: unknown } = $props();
  function setOpen(next: boolean): void { open = next; onopenchange?.(next); }
  provideSandboxContext({ get open() { return open; }, setOpen });
</script>
<section class={cn('svadmin-ai group mb-4 w-full overflow-hidden rounded-md border border-border bg-background text-foreground', className)} data-state={open ? 'open' : 'closed'} {...rest}>{@render children?.()}</section>
