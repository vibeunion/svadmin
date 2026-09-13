<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; import { onMount } from 'svelte'; import { provideCommitContext } from './context.svelte.js';
  let { defaultOpen = false, open = $bindable(defaultOpen), class: className = '', children, onopenchange, ...rest }: { open?: boolean; defaultOpen?: boolean; class?: string; children?: Snippet; onopenchange?: (open: boolean) => void; [key: string]: unknown } = $props();
  let detailsElement: HTMLDetailsElement;
  let actionDisclosure = false;
  provideCommitContext({ get open() { return open; }, toggle() { open = !open; } });
  onMount(() => {
    const markAction = (event: MouseEvent) => {
      actionDisclosure = event.target instanceof Element && Boolean(event.target.closest('[data-slot="commit-actions"]'));
    };
    detailsElement.addEventListener('click', markAction, true);
    return () => detailsElement.removeEventListener('click', markAction, true);
  });
  function handleToggle(event: Event): void {
    const next = (event.currentTarget as HTMLDetailsElement).open;
    if (actionDisclosure) {
      actionDisclosure = false;
      detailsElement.open = false;
      open = false;
      return;
    }
    open = next;
    onopenchange?.(next);
  }
</script>
<details bind:this={detailsElement} class={cn('svadmin-ai rounded-lg border border-border bg-background text-foreground', className)} {open} ontoggle={handleToggle} {...rest}>{@render children?.()}</details>
