<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  import { provideChainOfThoughtContext } from './context.svelte.js';

  let {
    defaultOpen = false,
    open = $bindable(defaultOpen),
    class: className = '',
    children,
    onopenchange,
    ...rest
  }: {
    open?: boolean;
    defaultOpen?: boolean;
    class?: string;
    children?: Snippet;
    onopenchange?: (open: boolean) => void;
    [key: string]: unknown;
  } = $props();

  const id = $props.id();

  function setOpen(next: boolean): void {
    if (next === open) return;
    open = next;
    onopenchange?.(next);
  }

  provideChainOfThoughtContext({
    get open() { return open; },
    contentId: `${id}-content`,
    setOpen,
  });
</script>

<div class={cn('svadmin-ai w-full space-y-4 text-foreground', className)} data-state={open ? 'open' : 'closed'} {...rest}>
  {@render children?.()}
</div>
