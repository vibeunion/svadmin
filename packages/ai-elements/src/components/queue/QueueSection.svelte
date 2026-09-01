<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { provideQueueSectionContext } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'class'> { open?: boolean; class?: string; children?: Snippet; }
  let { open = $bindable(true), class: className = '', children, ...rest }: Props = $props();
  provideQueueSectionContext({ get open() { return open; }, setOpen(nextOpen) { open = nextOpen; } });
</script>
<section {...rest} class={cn('svadmin-ai-queue-part__section', className)} data-slot="queue-section">{@render children?.()}</section>
<style>.svadmin-ai-queue-part__section { display: grid; gap: .25rem; }</style>
