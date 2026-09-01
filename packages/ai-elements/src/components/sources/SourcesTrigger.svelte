<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type SourcesTriggerProps = Omit<HTMLButtonAttributes, 'children' | 'class' | 'onclick'> & {
    count?: number;
    class?: string;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
  };
</script>

<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useSourcesContext } from './context.svelte.js';

  let { count, class: className = '', children, onclick, type = 'button', ...rest }: SourcesTriggerProps = $props();
  const sources = useSourcesContext('SourcesTrigger');
  const resolvedCount = $derived(count ?? sources.sources.length);

  function toggle(event: MouseEvent): void {
    onclick?.(event);
    if (!event.defaultPrevented) sources.setOpen(!sources.open);
  }
</script>

<button {...rest} {type} class={cn('svadmin-ai-sources-trigger', className)} data-slot="sources-trigger" aria-expanded={sources.open} onclick={toggle}>
  {#if children}{@render children()}{:else}<span>Used {resolvedCount} sources</span><ChevronDown class={cn(sources.open && 'svadmin-ai-sources-trigger__icon--open')} size={16} aria-hidden="true" />{/if}
</button>

<style>
  .svadmin-ai-sources-trigger { display: flex; align-items: center; gap: 0.5rem; border: 0; padding: 0.5rem 0.75rem; background: transparent; color: var(--primary, currentColor); text-align: left; font: inherit; font-size: 0.75rem; cursor: pointer; }
  .svadmin-ai-sources-trigger :global(svg) { transition: transform 150ms ease; }
  .svadmin-ai-sources-trigger :global(.svadmin-ai-sources-trigger__icon--open) { transform: rotate(180deg); }
  .svadmin-ai-sources-trigger:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { .svadmin-ai-sources-trigger :global(svg) { transition: none; } }
</style>
