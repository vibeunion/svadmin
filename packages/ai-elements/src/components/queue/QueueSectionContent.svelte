<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { useQueueSectionContext } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
  const section = useQueueSectionContext('QueueSectionContent');
</script>
{#if section.open}<div {...rest} class={cn('svadmin-ai-queue-part__section-content', className)} data-slot="queue-section-content">{@render children?.()}</div>{/if}
<style>.svadmin-ai-queue-part__section-content { min-width: 0; }</style>
