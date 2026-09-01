<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { ChevronDown } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useQueueSectionContext } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> { count?: number; label: string; class?: string; children?: Snippet; }
  let { count, label, class: className = '', children, ...rest }: Props = $props();
  const section = useQueueSectionContext('QueueSectionLabel');
</script>
<span {...rest} class={cn('svadmin-ai-queue-part__section-label', className)} data-slot="queue-section-label"><ChevronDown class={section.open ? '' : 'svadmin-ai-queue-part__section-chevron--closed'} size={15} aria-hidden="true" />{@render children?.()}<span>{count ?? 0} {label}</span></span>
<style>.svadmin-ai-queue-part__section-label { display: inline-flex; align-items: center; gap: .4rem; }.svadmin-ai-queue-part__section-label :global(svg) { transition: transform 150ms ease; }.svadmin-ai-queue-part__section-label :global(.svadmin-ai-queue-part__section-chevron--closed) { transform: rotate(-90deg); }@media (prefers-reduced-motion: reduce) { .svadmin-ai-queue-part__section-label :global(svg) { transition: none; } }</style>
