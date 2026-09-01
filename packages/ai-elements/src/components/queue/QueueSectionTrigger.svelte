<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { useQueueSectionContext } from './context.svelte.js';
  interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'onclick'> { class?: string; children?: Snippet; onclick?: (event: MouseEvent) => void; }
  let { class: className = '', children, type = 'button', onclick, ...rest }: Props = $props();
  const section = useQueueSectionContext('QueueSectionTrigger');
  function toggle(event: MouseEvent): void { onclick?.(event); if (!event.defaultPrevented) section.setOpen(!section.open); }
</script>
<button {...rest} {type} class={cn('svadmin-ai-queue-part__section-trigger', className)} aria-expanded={section.open} data-slot="queue-section-trigger" onclick={toggle}>{@render children?.()}</button>
<style>.svadmin-ai-queue-part__section-trigger { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: .5rem; border: 0; border-radius: min(var(--radius, .5rem), .5rem); padding: .5rem .65rem; background: var(--muted, transparent); color: var(--muted-foreground, currentColor); text-align: left; font: inherit; font-size: .8rem; cursor: pointer; }.svadmin-ai-queue-part__section-trigger:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }</style>
